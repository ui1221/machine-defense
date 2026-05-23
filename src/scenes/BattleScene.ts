import Phaser from 'phaser'
import {
  GAME_W, GAME_H, BARRICADE_Y, CHAR_LINE_Y, MAX_CHARACTERS,
  SPAWN_Y, SPAWN_MARGIN_X, FIELD_LEFT, FIELD_RIGHT, CHAR_SLOTS, DEFAULT_BARRICADE_HP,
} from '../constants'
import { STAGES } from '../data/stages'
import { CHARACTERS } from '../data/characters'
import { ENEMIES } from '../data/enemies'
import { canEquipWeaponToCharacter, WEAPONS, RARITY_WEIGHTS } from '../data/weapons'
import { Character } from '../objects/Character'
import { Enemy } from '../objects/Enemy'
import { Bullet } from '../objects/Bullet'
import { Barricade } from '../objects/Barricade'
import { DamageZone } from '../objects/DamageZone'
import { BeamZone } from '../objects/BeamZone'
import { OrbField } from '../objects/OrbField'
import { SpawnManager } from '../systems/SpawnManager'
import { InputManager } from '../systems/InputManager'
import { TargetingSystem } from '../systems/TargetingSystem'
import { LevelUpManager } from '../systems/LevelUpManager'
import { UPGRADE_POOL } from '../data/upgrades'
import { loadSave } from '../systems/SaveData'
import type { StageConfig, BattleState, GameSave, CharacterDamageStat } from '../types'

const ZONE_RADIUS = 62
const FIELD_ZONE_DAMAGE_MULT = 0.68
const BEAM_ZONE_DAMAGE_MULT = 0.48
const BEAM_SLOW_DURATION = 650
const BEAM_SLOW_FACTOR = 0.78
const CRIT_MULT = 2.5
const RAILGUN_KNOCKBACK_DIST = 80
const ORB_KNOCKBACK_DIST = 8

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
  private beamZones: BeamZone[] = []
  private orbFields: OrbField[] = []
  private damageByCharacter = new Map<string, number>()
  elapsedMs = 0
  private pausedByUser = false
  private speedIndex = 0
  private expMult = 1
  private readonly speedOptions = [1, 2]

  constructor() { super('BattleScene') }

  init(data: { stageId: string }) {
    this.stage = STAGES.find(s => s.id === data.stageId) ?? STAGES[0]
    this.characters = []
    this.gameEnded = false
    this.killCount = 0
    this.droppedWeapons = []
    this.damageZones = []
    this.beamZones = []
    this.orbFields = []
    this.damageByCharacter = new Map()
    this.elapsedMs = 0
    this.pausedByUser = false
    this.speedIndex = 0
    this.expMult = 1
  }

  create() {
    // 背景は後から画像に差し替えやすいよう、戦場・防衛帯・足元で分けておく。
    this.buildBattleBackground()
    this.add.rectangle(GAME_W / 2, BARRICADE_Y - 42, GAME_W - 28, 4, 0x293149, 0.9).setDepth(1)
    this.enemies = this.add.group({ runChildUpdate: false })
    this.bullets = this.add.group({ runChildUpdate: false })

    const save = this.loadSave()
    this.expMult = 1 + save.upgrades.researchExpLevel * 0.04
    this.barricade = new Barricade(this, DEFAULT_BARRICADE_HP + save.upgrades.barricadeHpLevel * 5 + save.upgrades.researchBarricadeLevel * 50)
    this.spawnManager = new SpawnManager(this.stage)
    this.inputManager = new InputManager(this)
    this.targeting = new TargetingSystem()
    this.levelUpManager = new LevelUpManager()

    this.addCharacter(this.stage.startingCharacter)
    this.scene.launch('BattleUIScene', { battle: this })
  }

  private buildBattleBackground() {
    const stageNo = Number(this.stage.id.replace('stage_', '')) || 1
    const bgKey = stageNo <= 3 ? 'stage_forest_bg'
      : stageNo <= 6 ? 'stage_facility_entrance_bg'
        : stageNo <= 15 ? 'stage_base_day_bg'
          : stageNo <= 23 ? 'stage_base_evening_bg'
            : stageNo <= 30 ? 'stage_base_night_bg'
              : null
    if (bgKey) {
      const bg = this.add.image(GAME_W / 2, GAME_H / 2, bgKey).setOrigin(0.5).setDepth(-10)
      const src = bg.texture.getSourceImage() as HTMLImageElement | HTMLCanvasElement
      bg.setScale(Math.max(GAME_W / src.width, GAME_H / src.height))
      this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x071018, 0.34).setDepth(-9)
      this.add.rectangle(GAME_W / 2, BARRICADE_Y + 42, GAME_W, 190, 0x06101b, 0.3).setDepth(-8)
      return
    }

    this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x10121c).setDepth(0)
    this.add.rectangle(GAME_W / 2, (BARRICADE_Y - 34) / 2, GAME_W, BARRICADE_Y - 34, 0x141726).setDepth(0)
  }

  addCharacter(charId: string) {
    if (this.characters.length >= this.stageMaxCharacters) return
    if (charId === 'rapid') charId = 'assault'
    if (this.characters.some(ch => ch.config.id === charId)) return
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
      const baseCfg = ENEMIES[entry.enemyId]
      if (!baseCfg) continue
      const hpMult = (this.stage.enemyHpMult ?? 1) * (entry.hpMult ?? 1)
      const cfg = hpMult !== 1
        ? { ...baseCfg, hp: Math.max(1, Math.round(baseCfg.hp * hpMult)) }
        : baseCfg
      const cx = this.pickSpawnCenter(entry.spread)
      for (let i = 0; i < entry.count; i++) {
        const clampedX = this.pickSpawnX(cx, entry.spread, entry.count)
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
    this.beamZones = this.beamZones.filter(z => z.active)
    for (const beam of this.beamZones) {
      beam.update(now, scaledDelta)
      if (!beam.shouldTick) continue
      for (const e of enemyList) {
        if (!e.active || !beam.containsEnemy(e)) continue
        e.slow(now + BEAM_SLOW_DURATION, BEAM_SLOW_FACTOR)
        const rolled = this.rollCharacterDamage(beam.ownerId, beam.damagePerTick)
        const dead = e.takeDamage(rolled.damage)
        this.recordCharacterDamage(beam.ownerId, e.lastDamageTaken)
        this.showDamageNumber(e.x, e.y, e.lastDamageTaken, 0x88eeff, rolled.crit)
        if (dead) this.onEnemyKilled(e)
      }
    }
    this.orbFields = this.orbFields.filter(z => z.active)
    for (const orb of this.orbFields) {
      orb.update(now, scaledDelta)
      for (const e of enemyList) {
        if (!e.active || !orb.containsEnemy(e)) continue
        e.speedMult = Math.min(e.speedMult, orb.slowFactor)
        if (!orb.shouldTick) continue
        const rolled = this.rollCharacterDamage(orb.ownerId, orb.damagePerTick)
        const dead = e.takeDamage(rolled.damage)
        this.recordCharacterDamage(orb.ownerId, e.lastDamageTaken)
        this.showDamageNumber(e.x, e.y, e.lastDamageTaken, 0x9fc7ff, rolled.crit)
        if (dead) this.onEnemyKilled(e)
        else e.knockback(ORB_KNOCKBACK_DIST)
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
        const usedTargets = new Set<Enemy>()
        for (let action = 0; action < ch.actionCount; action++) {
          this.time.delayedCall(action * 90, () => {
            if (!ch.active || this.gameEnded) return
            const aim = this.pickActionAim(ch, result.tx, result.ty, usedTargets)
            const baseAng = Math.atan2(aim.ty - ch.y, aim.tx - ch.x)
            const dist = Phaser.Math.Distance.Between(ch.x, ch.y, aim.tx, aim.ty)
            this.doSlash(
              ch,
              ch.x + Math.cos(baseAng) * dist,
              ch.y + Math.sin(baseAng) * dist,
              this.enemies.getChildren() as Enemy[],
            )
          })
        }

      } else if (result.kind === 'beam') {
        for (let action = 0; action < ch.actionCount; action++) {
          this.showBeamCharge(ch, result.tx, result.ty, action * 140)
          this.time.delayedCall(action * 140 + 320, () => {
            if (!ch.active || this.gameEnded) return
            this.createBeamZone(ch, result.tx, result.ty)
          })
        }
      } else if (result.kind === 'orb') {
        const usedTargets = new Set<Enemy>()
        for (let action = 0; action < ch.actionCount; action++) {
          this.time.delayedCall(action * 130, () => {
            if (!ch.active || this.gameEnded) return
            const aim = this.pickActionAim(ch, result.tx, result.ty, usedTargets)
            this.createOrbField(ch, aim.tx, aim.ty)
          })
        }
      } else if (result.kind === 'stun_shot') {
        const usedTargets = new Set<Enemy>()
        for (let action = 0; action < ch.actionCount; action++) {
          this.time.delayedCall(action * 120, () => {
            if (!ch.active || this.gameEnded) return
            const aim = this.pickActionAim(ch, result.tx, result.ty, usedTargets)
            this.resolveStunShot(ch, aim.tx, aim.ty)
          })
        }
      } else if (result.kind === 'burst') {
        const usedTargets = new Set<Enemy>()
        for (let action = 0; action < ch.actionCount; action++) {
          this.time.delayedCall(action * 90, () => {
            if (!ch.active || this.gameEnded) return
            const aim = this.pickActionAim(ch, result.tx, result.ty, usedTargets)
            const baseAng = Math.atan2(aim.ty - ch.y, aim.tx - ch.x)
            const angles = this.buildBurstAngles(baseAng, ch.burstCount)
            for (const ang of angles) {
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
          })
        }

      } else {
        const isRailgun = ch.config.id === 'railgun'
        const style = result.kind === 'field_bolt' ? 'field'
          : isRailgun ? 'railgun' : 'normal'
        const hitsLeft = isRailgun ? 4 : (ch.piercing ? 2 : 1)
        const usedTargets = new Set<Enemy>()
        for (let action = 0; action < ch.actionCount; action++) {
          this.time.delayedCall(action * 110, () => {
            if (!ch.active || this.gameEnded) return
            const aim = this.pickActionAim(ch, result.tx, result.ty, usedTargets)
            const baseAng = Math.atan2(aim.ty - ch.y, aim.tx - ch.x)
            const b = new Bullet(
              this, ch.x, ch.y - 10,
              ch.x + Math.cos(baseAng) * 1000, ch.y + Math.sin(baseAng) * 1000,
              ch.config.bulletSpeed, ch.effectiveAtk,
              ch.config.id,
              hitsLeft, style,
            )
            this.add.existing(b)
            this.bullets.add(b)
          })
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
          else if (b.ownerId === 'railgun') hit.knockback(RAILGUN_KNOCKBACK_DIST)
          b.hitsLeft--
          if (b.hitsLeft <= 0) b.destroy()
        }
      }
    }

    // バリケード攻撃
    for (const e of enemyList) {
      if (!e.active) continue
      if (e.tryAttackBarricade(now)) {
        const damage = Math.max(1, Math.ceil(e.damage * 0.2))
        const destroyed = this.barricade.takeDamage(damage, this)
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
  private buildBurstAngles(baseAng: number, count: number) {
    const gap = 0.036
    const offsets = [0]
    for (let i = 1; offsets.length < count; i++) {
      offsets.push(-gap * i)
      if (offsets.length < count) offsets.push(gap * i)
    }
    return offsets.map(offset => baseAng + offset)
  }

  private pickActionAim(ch: Character, fallbackTx: number, fallbackTy: number, usedTargets: Set<Enemy>) {
    if (this.inputManager.isPointerDown) return { tx: fallbackTx, ty: fallbackTy }

    const enemies = this.enemies.getChildren() as Enemy[]
    const target = this.targeting.findFrontmostEnemy(enemies, ch.effectiveRange, ch.x, ch.y, usedTargets)
    if (target) {
      usedTargets.add(target)
      return { tx: target.x, ty: target.y }
    }

    usedTargets.clear()
    const retry = this.targeting.findFrontmostEnemy(enemies, ch.effectiveRange, ch.x, ch.y, usedTargets)
    if (retry) {
      usedTargets.add(retry)
      return { tx: retry.x, ty: retry.y }
    }

    return { tx: fallbackTx, ty: fallbackTy }
  }

  private pickSpawnCenter(spread: number) {
    const left = Math.max(SPAWN_MARGIN_X, FIELD_LEFT)
    const right = Math.min(GAME_W - SPAWN_MARGIN_X, FIELD_RIGHT)
    const safeSpread = Math.min(spread, right - left)
    const min = left + safeSpread / 2
    const max = right - safeSpread / 2
    if (max <= min) return GAME_W / 2
    return min + Math.random() * (max - min)
  }

  private pickSpawnX(center: number, spread: number, count: number) {
    const left = Math.max(SPAWN_MARGIN_X, FIELD_LEFT)
    const right = Math.min(GAME_W - SPAWN_MARGIN_X, FIELD_RIGHT)
    if (count <= 1) {
      const centerBiased = (Math.random() + Math.random()) / 2
      return left + centerBiased * (right - left)
    }
    const safeSpread = Math.min(spread, right - left)
    return center + (Math.random() - 0.5) * safeSpread
  }

  private readonly SLASH_RADIUS = 100
  private readonly KNOCKBACK_DIST = 26
  private readonly SLASH_DAMAGE_MULT = 0.82
  private readonly SLASH_SLOW_DURATION = 1400
  private readonly SLASH_SLOW_FACTOR = 0.72

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
        const rolled = this.rollCharacterDamage(ch.config.id, ch.effectiveAtk * this.SLASH_DAMAGE_MULT)
        const dead = e.takeDamage(rolled.damage)
        this.recordCharacterDamage(ch.config.id, e.lastDamageTaken)
        this.showDamageNumber(e.x, e.y, e.lastDamageTaken, rolled.crit ? 0xffee66 : 0xffcc00, rolled.crit)
        if (dead) {
          this.onEnemyKilled(e)
        } else {
          e.slow(this.elapsedMs + this.SLASH_SLOW_DURATION, this.SLASH_SLOW_FACTOR)
          e.knockback(this.KNOCKBACK_DIST)
        }
      }
    }
  }

  // ─── メイジ 炎床 ──────────────────────────────────
  private createDamageZone(x: number, y: number, bulletAtk: number, ownerId: string) {
    const owner = this.characters.find(ch => ch.config.id === ownerId)
    const radius = ZONE_RADIUS * (owner?.areaMult ?? 1)
    const zone = new DamageZone(this, x, y, radius, Math.max(1, Math.round(bulletAtk * FIELD_ZONE_DAMAGE_MULT)), ownerId)
    this.add.existing(zone)
    this.damageZones.push(zone)
  }

  private createBeamZone(ch: Character, tx: number, ty: number) {
    const ang = Math.atan2(ty - ch.y, tx - ch.x)
    const length = 1180 * ch.areaMult
    const width = 36 * ch.areaMult
    const cx = ch.x + Math.cos(ang) * (length / 2)
    const cy = ch.y + Math.sin(ang) * (length / 2)
    const beam = new BeamZone(this, cx, cy, length, width, ang, Math.max(1, Math.round(ch.effectiveAtk * BEAM_ZONE_DAMAGE_MULT)), ch.config.id)
    this.add.existing(beam)
    this.beamZones.push(beam)
  }

  private showBeamCharge(ch: Character, tx: number, ty: number, delay: number) {
    this.time.delayedCall(delay, () => {
      if (!ch.active || this.gameEnded) return
      const angle = Math.atan2(ty - ch.y, tx - ch.x)
      const spark = this.add.circle(ch.x, ch.y - 12, 8, 0xaaf2ff, 0.92).setDepth(18)
      const guide = this.add.rectangle(
        ch.x + Math.cos(angle) * 92,
        ch.y + Math.sin(angle) * 92,
        184,
        4,
        0x66ddff,
        0.18,
      ).setRotation(angle).setDepth(17)
      this.tweens.add({
        targets: spark,
        scaleX: 1.9,
        scaleY: 1.9,
        alpha: 0.2,
        duration: 320,
        onComplete: () => spark.destroy(),
      })
      this.tweens.add({
        targets: guide,
        alpha: 0.55,
        duration: 220,
        yoyo: true,
        onComplete: () => guide.destroy(),
      })
    })
  }

  private createOrbField(ch: Character, tx: number, ty: number) {
    const orb = new OrbField(this, ch.x, ch.y - 10, tx, ty, ch.config.bulletSpeed, Math.max(1, Math.round(ch.effectiveAtk * 0.7)), ch.config.id)
    this.add.existing(orb)
    this.orbFields.push(orb)
  }

  private resolveStunShot(ch: Character, tx: number, ty: number) {
    const enemies = this.enemies.getChildren() as Enemy[]
    let best: Enemy | null = null
    let bestDist = Infinity
    for (const enemy of enemies) {
      if (!enemy.active) continue
      const dx = enemy.x - tx
      const dy = enemy.y - ty
      const dist = dx * dx + dy * dy
      if (dist < bestDist) {
        best = enemy
        bestDist = dist
      }
    }
    if (!best) return
    this.hitWithStun(ch, best)
    if (!ch.stunBlast) return
    const radius = 70 * ch.areaMult
    const flash = this.add.circle(best.x, best.y, radius, 0x88ddff, 0.18).setDepth(19)
    this.tweens.add({ targets: flash, alpha: 0, scaleX: 1.2, scaleY: 1.2, duration: 260, onComplete: () => flash.destroy() })
    for (const enemy of enemies) {
      if (!enemy.active || enemy === best) continue
      const dx = enemy.x - best.x
      const dy = enemy.y - best.y
      if (dx * dx + dy * dy > radius * radius) continue
      this.hitWithStun(ch, enemy, 0.6)
    }
  }

  private hitWithStun(ch: Character, enemy: Enemy, damageMult = 1) {
    const rolled = this.rollCharacterDamage(ch.config.id, ch.effectiveAtk * damageMult)
    const dead = enemy.takeDamage(rolled.damage)
    enemy.stun(this.elapsedMs + 4000)
    this.showStunImpact(enemy.x, enemy.y)
    this.recordCharacterDamage(ch.config.id, enemy.lastDamageTaken)
    this.showDamageNumber(enemy.x, enemy.y, enemy.lastDamageTaken, 0xaaddff, rolled.crit)
    if (dead) this.onEnemyKilled(enemy)
  }

  private showStunImpact(x: number, y: number) {
    const ring = this.add.circle(x, y, 12, 0x9fe8ff, 0.12)
      .setStrokeStyle(3, 0xaaddff, 0.95)
      .setDepth(24)
    const flashH = this.add.rectangle(x, y, 30, 4, 0xdff8ff, 0.95).setDepth(25)
    const flashV = this.add.rectangle(x, y, 4, 30, 0xdff8ff, 0.95).setDepth(25)
    this.tweens.add({
      targets: ring,
      scaleX: 2.1,
      scaleY: 2.1,
      alpha: 0,
      duration: 360,
      onComplete: () => ring.destroy(),
    })
    this.tweens.add({
      targets: [flashH, flashV],
      alpha: 0,
      scaleX: 1.25,
      scaleY: 1.25,
      duration: 220,
      onComplete: () => {
        flashH.destroy()
        flashV.destroy()
      },
    })
  }

  // ─── 敵撃破 ────────────────────────────────────────
  private onEnemyKilled(enemy: Enemy) {
    this.killCount++
    if (enemy.hasAbility('split')) this.spawnSplitEnemies(enemy)
    const leveledUp = this.levelUpManager.addExp(enemy.expReward * this.expMult)
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
    const txt = this.add.text(x + offsetX, y - 10, `${Math.round(damage)}`, {
      fontSize: crit ? '30px' : '25px', color: hex, fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 5,
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

  private get stageMaxCharacters() {
    return Math.min(MAX_CHARACTERS, this.stage.maxCharacters ?? MAX_CHARACTERS)
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
    if (!this.levelUpManager.consumePendingLevelUp()) return
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
    this.events.emit('levelUpDone')
    if (this.levelUpManager.pendingLevelUps > 0) {
      this.onLevelUp()
      return
    }
    this.scene.resume()
    this.inputManager.resume()
  }

  private applyEquippedWeapon(ch: Character) {
    const save = this.loadSave()
    const equippedItems = save.ownedWeapons.filter(w => w.equippedCharId === ch.config.id)
    for (const equipped of equippedItems) {
      const weapon = WEAPONS[equipped.weaponId]
      if (!weapon) continue
      if (!canEquipWeaponToCharacter(weapon, ch.config.id)) continue
      const levelBonus = 1 + equipped.level * 0.1
      const bonus = levelBonus * (1 + save.upgrades.equipmentLevel * 0.03)
      if (weapon.atkMult !== 1)      ch.atkMult      *= 1 + (weapon.atkMult - 1) * bonus
      if (weapon.atkSpeedMult < 1)   ch.atkSpeedMult *= 1 + (weapon.atkSpeedMult - 1) * bonus
      if (weapon.atkSpeedMult > 1)   ch.atkSpeedMult *= weapon.atkSpeedMult
      if (weapon.rangeMult !== 1)    ch.rangeMult    *= 1 + (weapon.rangeMult - 1) * bonus
      if (weapon.areaMult && weapon.areaMult !== 1) ch.areaMult *= 1 + (weapon.areaMult - 1) * bonus
      if (weapon.critChance > 0)     ch.critChance   += weapon.critChance * bonus
    }
  }

  private applyPermanentUpgrade(ch: Character) {
    const save = this.loadSave()
    const atkLevelKey = `${ch.config.id}AtkLevel` as keyof GameSave['upgrades']
    const atkLevel = Math.min(Number(save.upgrades[atkLevelKey] ?? 0), this.characterLevelCap(save))
    const atkGrowthRate = ch.config.upgradeAtkGrowthRate ?? 0.06
    const critGrowth = ch.config.upgradeCritGrowth ?? 0.001
    if (atkLevel > 0) ch.atkMult *= 1 + atkLevel * atkGrowthRate
    if (atkLevel > 0) ch.critChance = Math.min(0.65, ch.critChance + atkLevel * critGrowth)
    if (ch.config.id === 'assault') {
      if (atkLevel >= 5) ch.burstCount += 1
      if (atkLevel >= 12) ch.burstCount += 1
    }
    const cooldownBonusSteps = Math.floor(atkLevel / 10)
    if (cooldownBonusSteps > 0) {
      const cooldownReduction = Math.min(0.08, cooldownBonusSteps * 0.005)
      ch.atkSpeedMult *= 1 - cooldownReduction
    }
    if (save.upgrades.researchAtkLevel > 0) ch.atkMult *= 1 + save.upgrades.researchAtkLevel * 0.05
    if (save.upgrades.researchCooldownLevel > 0) ch.atkSpeedMult *= 1 - save.upgrades.researchCooldownLevel * 0.01
    if (save.upgrades.researchRangeLevel > 0) {
      const mult = 1 + save.upgrades.researchRangeLevel * 0.02
      ch.rangeMult *= mult
      ch.areaMult *= mult
    }
    if (save.upgrades.researchProjectileLevel > 0) {
      ch.critChance = Math.min(0.65, ch.critChance + save.upgrades.researchProjectileLevel * 0.01)
    }
  }

  private characterLevelCap(save: GameSave) {
    if (save.debugUnlockAllStages) return 30
    const highestCleared = save.clearedStages.reduce((max, id) => {
      const n = Number(id.replace('stage_', ''))
      return Number.isFinite(n) ? Math.max(max, n) : max
    }, 0)
    return Math.min(30, highestCleared + 1)
  }

  private loadSave(): GameSave {
    return loadSave()
  }

  private currentStageDropRate() {
    const stageNo = Number(this.stage.id.replace('stage_', '')) || 1
    const progress = Phaser.Math.Clamp((stageNo - 1) / 29, 0, 1)
    const bossBonus = this.hasBossSpawn() ? 0.1 : 0
    return Phaser.Math.Clamp(0.05 + progress * 0.2 + bossBonus, 0, 0.95)
  }

  private hasBossSpawn() {
    return this.stage.spawnTable.some(entry => ENEMIES[entry.enemyId]?.abilities?.includes('boss'))
  }

  private pickDroppedWeaponId() {
    const stageNo = Number(this.stage.id.replace('stage_', '')) || 1
    const progress = Phaser.Math.Clamp((stageNo - 1) / 29, 0, 1)
    const entries = Object.values(WEAPONS)
    const weighted = entries.map(w => {
      let weight = RARITY_WEIGHTS[w.rarity]
      if (w.rarity === 'N') weight *= 1 - progress * 0.55
      if (w.rarity === 'SR') weight *= 1 + progress * 4
      if (w.rarity === 'SSR') weight *= 1 + progress * 5
      return { id: w.id, weight }
    })
    const total = weighted.reduce((sum, w) => sum + w.weight, 0)
    let roll = Math.random() * total
    for (const item of weighted) {
      roll -= item.weight
      if (roll <= 0) return item.id
    }
    return weighted[0].id
  }

  private rollStageDrops() {
    if (Math.random() >= this.currentStageDropRate()) return
    this.droppedWeapons.push(this.pickDroppedWeaponId())
  }

  private buildBattleState(): BattleState {
    return {
      characterCount: this.characters.length,
      maxCharacters: this.stageMaxCharacters,
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
      enableStunBlast:   (id)    => { const c = this.characters.find(ch => ch.config.id === id); if (c) c.stunBlast    = true },
      enableCharPiercing:(id)    => { const c = this.characters.find(ch => ch.config.id === id); if (c) c.piercing      = true },
    }
  }

  private endGame(victory: boolean) {
    if (this.gameEnded) return
    this.gameEnded = true
    if (victory) this.rollStageDrops()
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
