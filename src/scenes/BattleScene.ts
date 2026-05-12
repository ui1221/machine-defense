import Phaser from 'phaser'
import {
  GAME_W, GAME_H, BARRICADE_Y, CHAR_LINE_Y, MAX_CHARACTERS,
  SPAWN_Y, SPAWN_MARGIN_X, FIELD_LEFT, FIELD_RIGHT, CHAR_SLOTS,
} from '../constants'
import { STAGES } from '../data/stages'
import { CHARACTERS } from '../data/characters'
import { ENEMIES } from '../data/enemies'
import { WEAPONS, WEAPON_DROP_RATE, RARITY_WEIGHTS } from '../data/weapons'
import { Character } from '../objects/Character'
import { Enemy } from '../objects/Enemy'
import { Bullet } from '../objects/Bullet'
import { Barricade } from '../objects/Barricade'
import { DamageZone } from '../objects/DamageZone'
import { SpawnManager } from '../systems/SpawnManager'
import { InputManager } from '../systems/InputManager'
import { TargetingSystem } from '../systems/TargetingSystem'
import { LevelUpManager } from '../systems/LevelUpManager'
import { UPGRADE_POOL } from '../data/upgrades'
import { loadSave } from '../systems/SaveData'
import type { StageConfig, BattleState, GameSave, CharacterDamageStat } from '../types'

const ZONE_RADIUS = 50
const CRIT_MULT = 2.5

export class BattleScene extends Phaser.Scene {
  characters: Character[] = []
  enemies!: Phaser.GameObjects.Group
  bullets!: Phaser.GameObjects.Group

  barricade!: Barricade
  spawnManager!: SpawnManager
  inputManager!: InputManager
  targeting!: TargetingSystem
  levelUpManager!: LevelUpManager

  private stage!: StageConfig
  private gameEnded = false
  private killCount = 0
  private droppedWeapons: string[] = []
  private damageZones: DamageZone[] = []
  private damageByCharacter = new Map<string, number>()
  elapsedMs = 0
  private pausedByUser = false
  private speedIndex = 0
  private readonly speedOptions = [1, 2]

  constructor() { super('BattleScene') }

  init(data: { stageId: string }) {
    this.stage = STAGES.find(s => s.id === data.stageId) ?? STAGES[0]
    this.characters = []
    this.gameEnded = false
    this.killCount = 0
    this.droppedWeapons = []
    this.damageZones = []
    this.damageByCharacter = new Map()
    this.elapsedMs = 0
    this.pausedByUser = false
    this.speedIndex = 0
  }

  create() {
    this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x111122)
    const groundH = GAME_H - BARRICADE_Y + 40
    this.add.rectangle(GAME_W / 2, GAME_H - groundH / 2, GAME_W, groundH, 0x1a1a2e)

    this.enemies = this.add.group({ runChildUpdate: false })
    this.bullets = this.add.group({ runChildUpdate: false })

    const save = this.loadSave()
    const barricadeHp = this.stage.barricadeHp + save.upgrades.barricadeHpLevel * 12
    this.barricade = new Barricade(this, barricadeHp)
    this.spawnManager = new SpawnManager(this.stage)
    this.inputManager = new InputManager(this)
    this.targeting = new TargetingSystem()
    this.levelUpManager = new LevelUpManager()

    this.addCharacter(this.stage.startingCharacter)
    this.scene.launch('BattleUIScene', { battle: this })
  }

  addCharacter(charId: string) {
    if (this.characters.length >= MAX_CHARACTERS) return
    const cfg = CHARACTERS[charId]
    if (!cfg) return
    const slotX = CHAR_SLOTS[this.characters.length]
    const ch = new Character(this, slotX, CHAR_LINE_Y, cfg)
    this.add.existing(ch)
    this.characters.push(ch)
    if (!this.damageByCharacter.has(ch.config.id)) {
      this.damageByCharacter.set(ch.config.id, 0)
    }
    this.applyPermanentUpgrade(ch)
    this.applyEquippedWeapon(ch)
  }

  update(_time: number, delta: number) {
    if (this.gameEnded) return
    if (this.pausedByUser) {
      this.events.emit('battleUpdate')
      return
    }

    const scaledDelta = delta * this.currentSpeed
    this.elapsedMs += scaledDelta
    const now = this.elapsedMs
    const enemyList = this.enemies.getChildren() as Enemy[]
    const bulletList = this.bullets.getChildren() as Bullet[]

    // 敵スポーン
    const spawns = this.spawnManager.update(scaledDelta)
    for (const entry of spawns) {
      const cfg = ENEMIES[entry.enemyId]
      if (!cfg) continue
      const cx = FIELD_LEFT + Math.random() * (FIELD_RIGHT - FIELD_LEFT)
      for (let i = 0; i < entry.count; i++) {
        const x = cx + (Math.random() - 0.5) * entry.spread
        const clampedX = Math.max(SPAWN_MARGIN_X, Math.min(GAME_W - SPAWN_MARGIN_X, x))
        const e = new Enemy(this, clampedX, SPAWN_Y + Math.random() * 40, cfg)
        this.add.existing(e)
        this.enemies.add(e)
        if (cfg.abilities?.includes('boss')) this.showBossArrival(cfg.name)
      }
    }

    // DamageZone: speedMultをリセットしてから適用
    for (const e of enemyList) e.speedMult = 1
    this.damageZones = this.damageZones.filter(z => z.active)
    for (const zone of this.damageZones) {
      zone.update(now, scaledDelta)
      for (const e of enemyList) {
        if (!e.active) continue
        if (zone.containsPoint(e.x, e.y)) {
          e.speedMult = Math.min(e.speedMult, zone.slowFactor)
          if (zone.shouldTick) {
            const rolled = this.rollCharacterDamage(zone.ownerId, zone.damagePerTick)
            const dead = e.takeDamage(rolled.damage)
            this.recordCharacterDamage(zone.ownerId, e.lastDamageTaken)
            this.showDamageNumber(e.x, e.y, e.lastDamageTaken, rolled.crit ? 0xffee66 : 0xff8800, rolled.crit)
            if (dead) this.onEnemyKilled(e)
          }
        }
      }
    }

    for (const e of enemyList) {
      if (!e.active) continue
      e.update(now, scaledDelta)
      e.tryHealNearby(now, enemyList)
    }

    // キャラ攻撃 + クールダウン表示
    for (const ch of this.characters) {
      ch.updateCooldown(now)
      const result = ch.tryShoot(now, enemyList, this.inputManager, this.targeting)
      if (!result) continue

      if (result.kind === 'slash') {
        const baseAng = Math.atan2(result.ty - ch.y, result.tx - ch.x)
        for (let action = 0; action < ch.actionCount; action++) {
          const actionOffset = (action - (ch.actionCount - 1) / 2) * 0.08
          const dist = Phaser.Math.Distance.Between(ch.x, ch.y, result.tx, result.ty)
          this.doSlash(
            ch,
            ch.x + Math.cos(baseAng + actionOffset) * dist,
            ch.y + Math.sin(baseAng + actionOffset) * dist,
            enemyList,
          )
        }

      } else if (result.kind === 'burst') {
        const baseAng = Math.atan2(result.ty - ch.y, result.tx - ch.x)
        const count = ch.burstCount
        const spread = 0.1
        const step = count > 1 ? (spread * 2) / (count - 1) : 0
        const startOffset = count > 1 ? -spread : 0
        for (let action = 0; action < ch.actionCount; action++) {
          const actionOffset = (action - (ch.actionCount - 1) / 2) * 0.06
          for (let bi = 0; bi < count; bi++) {
            const ang = baseAng + actionOffset + startOffset + step * bi
            const hitsLeft = ch.piercing ? 2 : 1
            const b = new Bullet(
              this, ch.x, ch.y - 10,
              ch.x + Math.cos(ang) * 1000, ch.y + Math.sin(ang) * 1000,
              ch.config.bulletSpeed, ch.effectiveAtk,
              ch.config.id,
              hitsLeft, 'normal',
            )
            this.add.existing(b)
            this.bullets.add(b)
          }
        }

      } else {
        const isRailgun = ch.config.id === 'railgun'
        const style = result.kind === 'field_bolt' ? 'field'
          : isRailgun ? 'railgun' : 'normal'
        const hitsLeft = isRailgun ? 2 : (ch.piercing ? 2 : 1)
        const baseAng = Math.atan2(result.ty - ch.y, result.tx - ch.x)
        for (let action = 0; action < ch.actionCount; action++) {
          const actionOffset = (action - (ch.actionCount - 1) / 2) * 0.05
          const ang = baseAng + actionOffset
          const b = new Bullet(
            this, ch.x, ch.y - 10,
            ch.x + Math.cos(ang) * 1000, ch.y + Math.sin(ang) * 1000,
            ch.config.bulletSpeed, ch.effectiveAtk,
            ch.config.id,
            hitsLeft, style,
          )
          this.add.existing(b)
          this.bullets.add(b)
        }
      }
    }

    for (const b of bulletList) {
      if (b.active) b.update(now, scaledDelta)
    }

    // 弾→敵の当たり判定
    for (const b of bulletList) {
      if (!b.active) continue
      const hit = b.checkHit(enemyList)
      if (hit) {
        if (b.isFieldBolt) {
          this.createDamageZone(b.x, b.y, b.atk, b.ownerId)
          b.destroy()
        } else {
          const rolled = this.rollCharacterDamage(b.ownerId, b.atk)
          const dead = hit.takeDamage(rolled.damage)
          this.recordCharacterDamage(b.ownerId, hit.lastDamageTaken)
          this.showDamageNumber(hit.x, hit.y, hit.lastDamageTaken, rolled.crit ? 0xffee66 : 0xffffff, rolled.crit)
          if (dead) this.onEnemyKilled(hit)
          b.hitsLeft--
          if (b.hitsLeft <= 0) b.destroy()
        }
      }
    }

    // バリケード攻撃
    for (const e of enemyList) {
      if (!e.active) continue
      if (e.tryAttackBarricade(now)) {
        const destroyed = this.barricade.takeDamage(e.damage, this)
        if (destroyed) { this.endGame(false); return }
      }
    }

    const activeEnemies = enemyList.filter(e => e.active)
    if (this.spawnManager.allSpawned && activeEnemies.length === 0) {
      this.endGame(true)
    }

    this.events.emit('battleUpdate')
  }

  // ─── ナイト スラッシュ ──────────────────────────────
  private readonly SLASH_RADIUS = 100
  private readonly KNOCKBACK_DIST = 80

  private doSlash(ch: Character, tx: number, ty: number, enemies: Enemy[]) {
    const r = this.SLASH_RADIUS * ch.areaMult
    // 扇形の斬撃エフェクト（水色）
    const arc = this.add.arc(tx, ty, r, 220, 320, false, 0x66ddff, 0.7).setDepth(12)
    this.tweens.add({
      targets: arc, alpha: 0, scaleX: 1.2, scaleY: 1.2,
      duration: 200, onComplete: () => arc.destroy(),
    })
    // 薄い白の内側扇（閃光感）
    const inner = this.add.arc(tx, ty, r * 0.7, 230, 310, false, 0xffffff, 0.9).setDepth(13)
    this.tweens.add({
      targets: inner, alpha: 0, scaleX: 1.4, scaleY: 1.4,
      duration: 140, onComplete: () => inner.destroy(),
    })
    // 細い斬線（水色ライン）
    const line = this.add.rectangle(tx, ty, r * 1.8, 3, 0x88eeff, 0.9).setDepth(14).setAngle(-20)
    this.tweens.add({
      targets: line, alpha: 0, scaleY: 0.2,
      duration: 250, onComplete: () => line.destroy(),
    })
    // 範囲内の敵にダメージ + ノックバック
    for (const e of enemies) {
      if (!e.active) continue
      const dx = e.x - tx
      const dy = e.y - ty
      if (dx * dx + dy * dy < r * r) {
        const rolled = this.rollCharacterDamage(ch.config.id, ch.effectiveAtk)
        const dead = e.takeDamage(rolled.damage)
        this.recordCharacterDamage(ch.config.id, e.lastDamageTaken)
        this.showDamageNumber(e.x, e.y, e.lastDamageTaken, rolled.crit ? 0xffee66 : 0xffcc00, rolled.crit)
        if (dead) {
          this.onEnemyKilled(e)
        } else {
          e.knockback(this.KNOCKBACK_DIST)
        }
      }
    }
  }

  // ─── メイジ 炎床 ──────────────────────────────────
  private createDamageZone(x: number, y: number, bulletAtk: number, ownerId: string) {
    const owner = this.characters.find(ch => ch.config.id === ownerId)
    const radius = ZONE_RADIUS * (owner?.areaMult ?? 1)
    const zone = new DamageZone(this, x, y, radius, Math.max(1, Math.round(bulletAtk * 0.35)), ownerId)
    this.add.existing(zone)
    this.damageZones.push(zone)
  }

  // ─── 敵撃破 ────────────────────────────────────────
  private onEnemyKilled(enemy: Enemy) {
    this.killCount++
    if (enemy.hasAbility('split')) this.spawnSplitEnemies(enemy)
    if (Math.random() < this.currentWeaponDropRate()) {
      const id = this.pickDroppedWeaponId()
      this.droppedWeapons.push(id)
      this.showDropEffect(enemy.x, enemy.y, WEAPONS[id].emoji)
    }
    const leveledUp = this.levelUpManager.addExp(enemy.expReward)
    this.events.emit('expChanged')
    if (leveledUp) this.onLevelUp()
    enemy.destroy()
  }

  private spawnSplitEnemies(enemy: Enemy) {
    const cfg = ENEMIES.swarm
    if (!cfg) return
    for (let i = 0; i < 3; i++) {
      const x = Math.max(SPAWN_MARGIN_X, Math.min(GAME_W - SPAWN_MARGIN_X, enemy.x + (Math.random() - 0.5) * 70))
      const y = Math.max(SPAWN_Y, enemy.y - Math.random() * 30)
      const child = new Enemy(this, x, y, cfg)
      this.add.existing(child)
      this.enemies.add(child)
    }
    const txt = this.add.text(enemy.x, enemy.y - 30, '+3', {
      fontSize: '14px',
      color: '#aaffaa',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(25)
    this.tweens.add({
      targets: txt,
      y: txt.y - 34,
      alpha: 0,
      duration: 600,
      onComplete: () => txt.destroy(),
    })
  }

  private showDropEffect(x: number, y: number, emoji: string) {
    const txt = this.add.text(x, y, emoji, { fontSize: '28px' }).setOrigin(0.5).setDepth(20)
    this.tweens.add({
      targets: txt, y: y - 60, alpha: 0, duration: 1200,
      ease: 'Sine.easeOut', onComplete: () => txt.destroy(),
    })
  }

  private showBossArrival(name: string) {
    const band = this.add.rectangle(GAME_W / 2, 130, GAME_W - 36, 58, 0x2b120f, 0.88)
      .setStrokeStyle(2, 0xff9955)
      .setDepth(40)
    const title = this.add.text(GAME_W / 2, 118, 'BOSS APPROACH', {
      fontSize: '24px',
      color: '#ffcc88',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(41)
    const sub = this.add.text(GAME_W / 2, 143, name, {
      fontSize: '15px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(41)

    this.tweens.add({
      targets: [band, title, sub],
      alpha: 0,
      delay: 1100,
      duration: 700,
      onComplete: () => {
        band.destroy()
        title.destroy()
        sub.destroy()
      },
    })
  }

  private showDamageNumber(x: number, y: number, damage: number, color = 0xffffff, crit = false) {
    const hex = '#' + color.toString(16).padStart(6, '0')
    const offsetX = (Math.random() - 0.5) * 20
    const txt = this.add.text(x + offsetX, y - 10, crit ? `${Math.round(damage)}!` : `${Math.round(damage)}`, {
      fontSize: crit ? '18px' : '14px', color: hex, fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(25)
    this.tweens.add({
      targets: txt, y: y - 50, alpha: 0,
      duration: 600, ease: 'Sine.easeOut',
      onComplete: () => txt.destroy(),
    })
  }

  private recordCharacterDamage(charId: string, damage: number) {
    if (damage <= 0) return
    const current = this.damageByCharacter.get(charId) ?? 0
    this.damageByCharacter.set(charId, current + damage)
  }

  private rollCharacterDamage(charId: string, baseDamage: number) {
    const ch = this.characters.find(c => c.config.id === charId)
    const critChance = Math.min(0.65, Math.max(0, ch?.critChance ?? 0))
    const crit = Math.random() < critChance
    return {
      damage: crit ? baseDamage * CRIT_MULT : baseDamage,
      crit,
    }
  }

  private buildDamageStats(): CharacterDamageStat[] {
    return this.characters
      .map(ch => ({
        characterId: ch.config.id,
        damage: Math.round(this.damageByCharacter.get(ch.config.id) ?? 0),
      }))
      .sort((a, b) => b.damage - a.damage)
  }

  get currentSpeed() {
    return this.speedOptions[this.speedIndex]
  }

  get isPausedByUser() {
    return this.pausedByUser
  }

  toggleUserPause() {
    this.pausedByUser = !this.pausedByUser
    if (this.pausedByUser) this.inputManager.pause()
    else this.inputManager.resume()
    this.events.emit('battleUpdate')
  }

  cycleSpeed() {
    this.speedIndex = (this.speedIndex + 1) % this.speedOptions.length
    this.events.emit('battleUpdate')
  }

  private onLevelUp() {
    this.scene.pause()
    this.inputManager.pause()
    const state = this.buildBattleState()
    const choices = this.levelUpManager.pickChoices(state)
    this.events.emit('levelUp', choices)
  }

  applyUpgrade(id: string) {
    const opt = UPGRADE_POOL.find(o => o.id === id)
    if (opt) opt.apply(this.buildBattleState())
    this.levelUpManager.recordChoice(id)
    this.scene.resume()
    this.inputManager.resume()
    this.events.emit('levelUpDone')
  }

  private applyEquippedWeapon(ch: Character) {
    const save = this.loadSave()
    const equipped = save.ownedWeapons.find(w => w.equippedCharId === ch.config.id)
    if (!equipped) return
    const weapon = WEAPONS[equipped.weaponId]
    if (!weapon) return
    const levelBonus = 1 + equipped.level * 0.1
    const bonus = (1 + save.upgrades.equipmentLevel * 0.05) * levelBonus
    if (weapon.atkMult !== 1)      ch.atkMult      *= 1 + (weapon.atkMult - 1) * bonus
    if (weapon.atkSpeedMult < 1)   ch.atkSpeedMult *= 1 + (weapon.atkSpeedMult - 1) * bonus
    if (weapon.atkSpeedMult > 1)   ch.atkSpeedMult *= weapon.atkSpeedMult
    if (weapon.rangeMult !== 1)    ch.rangeMult    *= 1 + (weapon.rangeMult - 1) * bonus
    if (weapon.critChance > 0)     ch.critChance   += weapon.critChance * bonus
  }

  private applyPermanentUpgrade(ch: Character) {
    const save = this.loadSave()
    if (ch.config.id !== 'assault') return
    if (save.upgrades.assaultAtkLevel > 0) {
      ch.atkMult *= 1 + save.upgrades.assaultAtkLevel * 0.08
    }
    if (save.upgrades.assaultCooldownLevel > 0) {
      ch.atkSpeedMult *= Math.max(0.5, 1 - save.upgrades.assaultCooldownLevel * 0.05)
    }
  }

  private loadSave(): GameSave {
    return loadSave()
  }

  private currentWeaponDropRate() {
    const stageNo = Number(this.stage.id.replace('stage_', '')) || 1
    const tier = Math.floor((stageNo - 1) / 5)
    return WEAPON_DROP_RATE * (1 + tier * 0.25)
  }

  private pickDroppedWeaponId() {
    const stageNo = Number(this.stage.id.replace('stage_', '')) || 1
    const tier = Math.floor((stageNo - 1) / 10)
    const entries = Object.values(WEAPONS)
    const weighted = entries.map(w => {
      const base = RARITY_WEIGHTS[w.rarity]
      const lateBonus = w.rarity === 'SR' ? 1 + tier * 0.35 : w.rarity === 'SSR' ? 1 + tier * 0.55 : 1
      return { id: w.id, weight: base * lateBonus }
    })
    const total = weighted.reduce((sum, w) => sum + w.weight, 0)
    let roll = Math.random() * total
    for (const item of weighted) {
      roll -= item.weight
      if (roll <= 0) return item.id
    }
    return weighted[0].id
  }

  private buildBattleState(): BattleState {
    return {
      characterCount: this.characters.length,
      level: this.levelUpManager.level,
      acquiredUpgrades: this.levelUpManager.getAcquired(),
      addCharacter:      (id) => this.addCharacter(id),
      hasCharacter:      (id) => this.characters.some(c => c.config.id === id),
      boostCharAtk:      (id, m) => { const c = this.characters.find(ch => ch.config.id === id); if (c) c.atkMult      *= m },
      boostCharAtkSpeed: (id, m) => { const c = this.characters.find(ch => ch.config.id === id); if (c) c.atkSpeedMult *= m },
      boostCharArea:     (id, m) => { const c = this.characters.find(ch => ch.config.id === id); if (c) c.areaMult     *= m },
      boostCharCrit:     (id, a) => { const c = this.characters.find(ch => ch.config.id === id); if (c) c.critChance   += a },
      addCharAction:     (id)    => { const c = this.characters.find(ch => ch.config.id === id); if (c) c.actionCount  += 1 },
      addCharBurst:      (id)    => { const c = this.characters.find(ch => ch.config.id === id); if (c) c.burstCount   += 1 },
      enableCharPiercing:(id)    => { const c = this.characters.find(ch => ch.config.id === id); if (c) c.piercing      = true },
    }
  }

  private endGame(victory: boolean) {
    if (this.gameEnded) return
    this.gameEnded = true
    this.inputManager.pause()
    this.time.delayedCall(800, () => {
      this.scene.stop('BattleUIScene')
      this.scene.start('ResultScene', {
        victory, stageId: this.stage.id,
        killCount: this.killCount,
        level: this.levelUpManager.level,
        droppedWeapons: this.droppedWeapons,
        damageStats: this.buildDamageStats(),
      })
    })
  }
}
