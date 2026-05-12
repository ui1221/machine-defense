import Phaser from 'phaser'
import { GAME_W, GAME_H } from '../constants'
import { STAGES } from '../data/stages'
import { CHARACTERS } from '../data/characters'
import { ENEMIES } from '../data/enemies'
import { RARITY_COLORS, WEAPONS } from '../data/weapons'
import { loadSave, saveGame, upgradeCost } from '../systems/SaveData'
import type { GameSave, OwnedWeapon } from '../types'

const TAB_H = 72
const CONTENT_TOP = 100
const STAGES_PER_PAGE = 6

export class HomeScene extends Phaser.Scene {
  private save!: GameSave
  private panels: Phaser.GameObjects.Container[] = []
  private tabTexts: Phaser.GameObjects.Text[] = []
  private activeTab = 0
  private stagePage = 0
  private selectedWeaponUid: string | null = null
  private equipPanel!: Phaser.GameObjects.Container

  constructor() { super('HomeScene') }

  create() {
    this.save = this.loadSave()
    this.panels = []
    this.tabTexts = []
    this.activeTab = 0

    this.add.text(GAME_W / 2, 30, '⚙️ MACHINE DEFENCE ⚙️', {
      fontSize: '24px', color: '#ff6644', fontStyle: 'bold',
    }).setOrigin(0.5)

    this.add.rectangle(GAME_W / 2, GAME_H - TAB_H / 2, GAME_W, TAB_H, 0x0a0a1a).setDepth(10)

    this.panels.push(this.buildStagePanel())
    this.panels.push(this.buildCharPanel())
    this.equipPanel = this.buildEquipPanel()
    this.panels.push(this.equipPanel)
    this.panels.push(this.buildUpgradePanel())
    this.panels.push(this.buildFilePanel())

    const tabDefs = [
      { label: '◇ ステージ' },
      { label: '◎ キャラ' },
      { label: '▣ 装備' },
      { label: '▲ 強化' },
      { label: '□ ファイル' },
    ]
    const tabW = GAME_W / tabDefs.length

    tabDefs.forEach((tab, i) => {
      const tx = tabW * i + tabW / 2
      const tabBg = this.add.rectangle(tx, GAME_H - TAB_H / 2, tabW - 4, TAB_H - 8, 0x111122)
        .setDepth(11)
        .setInteractive({ useHandCursor: true })
      const txt = this.add.text(tx, GAME_H - TAB_H / 2, tab.label, {
        fontSize: '12px', color: i === 0 ? '#ffffff' : '#445566',
      }).setOrigin(0.5).setDepth(12)

      tabBg.on('pointerdown', () => this.switchTab(i))
      tabBg.on('pointerover', () => { if (this.activeTab !== i) tabBg.setFillStyle(0x1a2233) })
      tabBg.on('pointerout', () => { if (this.activeTab !== i) tabBg.setFillStyle(0x111122) })
      this.tabTexts.push(txt)
    })

    this.panels.forEach((p, i) => p.setVisible(i === 0))
  }

  private switchTab(index: number) {
    if (index === 0) this.rebuildPanel(0, this.buildStagePanel())
    if (index === 2) {
      this.equipPanel = this.buildEquipPanel()
      this.rebuildPanel(2, this.equipPanel)
    }
    if (index === 3) this.rebuildPanel(3, this.buildUpgradePanel())

    this.panels.forEach((p, i) => p.setVisible(i === index))
    this.tabTexts.forEach((t, i) => t.setColor(i === index ? '#ffffff' : '#445566'))
    this.activeTab = index
  }

  private rebuildPanel(index: number, next: Phaser.GameObjects.Container) {
    this.panels[index].destroy()
    this.panels[index] = next
  }

  private buildStagePanel(): Phaser.GameObjects.Container {
    const c = this.add.container(0, 0)
    this.save = this.loadSave()

    const pageCount = Math.ceil(STAGES.length / STAGES_PER_PAGE)
    this.stagePage = Phaser.Math.Clamp(this.stagePage, 0, pageCount - 1)
    const start = this.stagePage * STAGES_PER_PAGE
    const pageStages = STAGES.slice(start, start + STAGES_PER_PAGE)

    c.add(this.add.text(GAME_W / 2, CONTENT_TOP - 20, `ステージ選択 ${this.stagePage + 1}/${pageCount}`, {
      fontSize: '17px', color: '#aaaacc',
    }).setOrigin(0.5))

    const debugUnlocked = this.save.debugUnlockAllStages
    const debugBtn = this.add.rectangle(GAME_W - 84, CONTENT_TOP - 20, 124, 26, debugUnlocked ? 0x225544 : 0x333344)
      .setStrokeStyle(1, debugUnlocked ? 0x44cc88 : 0x666688)
      .setInteractive({ useHandCursor: true })
    const debugText = this.add.text(GAME_W - 84, CONTENT_TOP - 20, debugUnlocked ? '全解放中' : 'DEBUG 全解放', {
      fontSize: '11px', color: '#ffffff',
    }).setOrigin(0.5)
    debugBtn.on('pointerdown', () => this.unlockAllStagesForDebug())
    debugBtn.on('pointerover', () => debugBtn.setFillStyle(debugUnlocked ? 0x337755 : 0x444466))
    debugBtn.on('pointerout', () => debugBtn.setFillStyle(debugUnlocked ? 0x225544 : 0x333344))
    c.add([debugBtn, debugText])

    const prev = this.add.rectangle(70, CONTENT_TOP - 20, 76, 26, this.stagePage > 0 ? 0x223344 : 0x222233)
      .setStrokeStyle(1, 0x445566)
      .setInteractive({ useHandCursor: this.stagePage > 0 })
    const prevText = this.add.text(70, CONTENT_TOP - 20, '前へ', {
      fontSize: '12px', color: this.stagePage > 0 ? '#ffffff' : '#666677',
    }).setOrigin(0.5)
    const next = this.add.rectangle(150, CONTENT_TOP - 20, 76, 26, this.stagePage < pageCount - 1 ? 0x223344 : 0x222233)
      .setStrokeStyle(1, 0x445566)
      .setInteractive({ useHandCursor: this.stagePage < pageCount - 1 })
    const nextText = this.add.text(150, CONTENT_TOP - 20, '次へ', {
      fontSize: '12px', color: this.stagePage < pageCount - 1 ? '#ffffff' : '#666677',
    }).setOrigin(0.5)
    if (this.stagePage > 0) prev.on('pointerdown', () => this.changeStagePage(-1))
    if (this.stagePage < pageCount - 1) next.on('pointerdown', () => this.changeStagePage(1))
    c.add([prev, prevText, next, nextText])

    pageStages.forEach((stage, localIndex) => {
      const i = start + localIndex
      const y = CONTENT_TOP + 20 + localIndex * 98
      const cleared = this.save.clearedStages.includes(stage.id)
      const unlocked = this.isStageUnlocked(i)
      const bgColor = unlocked ? 0x1a2244 : 0x111827
      const strokeColor = cleared ? 0x44ff88 : unlocked ? 0x334466 : 0x333344
      const bg = this.add.rectangle(GAME_W / 2, y + 30, GAME_W - 40, 78, bgColor)
        .setStrokeStyle(2, strokeColor)

      if (unlocked) bg.setInteractive({ useHandCursor: true })

      const prefix = cleared ? '✓ ' : unlocked ? '' : 'LOCK '
      const nameT = this.add.text(40, y + 10, `${prefix}${stage.name}`, {
        fontSize: '20px', color: unlocked ? '#ffffff' : '#666677',
      })
      const descT = this.add.text(40, y + 36, stage.description, {
        fontSize: '13px', color: unlocked ? '#888899' : '#555566',
      })
      const stars = '★'.repeat(stage.difficulty) + '☆'.repeat(5 - stage.difficulty)
      const starT = this.add.text(GAME_W - 40, y + 10, stars, {
        fontSize: '14px', color: unlocked ? '#ffffff' : '#555566',
      }).setOrigin(1, 0)

      if (unlocked) {
        bg.on('pointerdown', () => this.scene.start('BattleScene', { stageId: stage.id }))
        bg.on('pointerover', () => bg.setFillStyle(0x2a3366))
        bg.on('pointerout', () => bg.setFillStyle(bgColor))
      }

      c.add([bg, nameT, descT, starT])
    })

    return c
  }

  private changeStagePage(delta: number) {
    this.stagePage += delta
    this.rebuildPanel(0, this.buildStagePanel())
    this.panels[0].setVisible(true)
  }

  private isStageUnlocked(index: number) {
    if (index === 0) return true
    if (this.save.debugUnlockAllStages) return true
    return this.save.clearedStages.includes(STAGES[index - 1].id)
  }

  private unlockAllStagesForDebug() {
    this.save = this.loadSave()
    this.save.debugUnlockAllStages = true
    saveGame(this.save)
    this.rebuildPanel(0, this.buildStagePanel())
    this.panels[0].setVisible(true)
  }

  private buildCharPanel(): Phaser.GameObjects.Container {
    const c = this.add.container(0, 0)
    c.add(this.add.text(GAME_W / 2, CONTENT_TOP - 20, 'キャラクター一覧', {
      fontSize: '17px', color: '#aaaacc',
    }).setOrigin(0.5))

    Object.values(CHARACTERS).forEach((cfg, i) => {
      const cardY = CONTENT_TOP + 20 + i * 100
      const cardH = 88
      const bg = this.add.rectangle(GAME_W / 2, cardY + cardH / 2, GAME_W - 40, cardH, 0x111a33)
        .setStrokeStyle(1, 0x334466)
      const emoji = this.add.text(52, cardY + 14, cfg.emoji, { fontSize: '34px' }).setOrigin(0.5)
      const nameT = this.add.text(82, cardY + 6, cfg.name, {
        fontSize: '18px', color: '#ffffff', fontStyle: 'bold',
      })
      const descT = this.add.text(82, cardY + 28, cfg.description, {
        fontSize: '12px', color: '#7788aa',
      })
      const atkT = this.add.text(82, cardY + 54, `攻撃力: ${cfg.atk}`, {
        fontSize: '13px', color: '#ff9966',
      })
      const spdT = this.add.text(200, cardY + 54, `速度: ${(1000 / cfg.atkSpeed).toFixed(1)}/s`, {
        fontSize: '13px', color: '#66ccff',
      })
      c.add([bg, emoji, nameT, descT, atkT, spdT])
    })

    return c
  }

  private buildEquipPanel(): Phaser.GameObjects.Container {
    const c = this.add.container(0, 0)
    this.save = this.loadSave()

    c.add(this.add.text(GAME_W / 2, CONTENT_TOP - 20, '装備', {
      fontSize: '17px', color: '#aaaacc',
    }).setOrigin(0.5))

    this.buildCharacterSlots(c)
    this.buildWeaponInventory(c)
    this.buildSelectedWeaponPanel(c)

    return c
  }

  private buildCharacterSlots(c: Phaser.GameObjects.Container) {
    Object.values(CHARACTERS).forEach((cfg, i) => {
      const row = Math.floor(i / 2)
      const col = i % 2
      const x = 20 + col * 220
      const y = CONTENT_TOP + 8 + row * 78
      const equipped = this.save.ownedWeapons.find(w => w.equippedCharId === cfg.id)
      const weapon = equipped ? WEAPONS[equipped.weaponId] : null
      const color = weapon ? RARITY_COLORS[weapon.rarity] : 0x334466

      const bg = this.add.rectangle(x + 104, y + 34, 208, 66, 0x111a33)
        .setStrokeStyle(1, 0x334466)
      const icon = this.add.text(x + 22, y + 24, cfg.emoji, { fontSize: '26px' }).setOrigin(0.5)
      const name = this.add.text(x + 42, y + 8, cfg.name, {
        fontSize: '12px', color: '#ffffff', fontStyle: 'bold',
      })
      const slot = this.add.rectangle(x + 142, y + 35, 92, 38, weapon ? 0x1a2233 : 0x0c1018)
        .setStrokeStyle(2, color)
        .setInteractive({ useHandCursor: true })
      const slotText = this.add.text(x + 142, y + 35, weapon ? `${weapon.rarity} Lv.${equipped!.level}\n${weapon.name}` : '空きスロット', {
        fontSize: weapon ? '9px' : '11px',
        color: weapon ? '#ffffff' : '#667788',
        align: 'center',
      }).setOrigin(0.5)

      slot.on('pointerdown', () => {
        if (this.selectedWeaponUid) this.equipSelectedWeapon(cfg.id)
        else if (equipped) this.selectWeapon(equipped.uid)
      })

      c.add([bg, icon, name, slot, slotText])
    })
  }

  private buildWeaponInventory(c: Phaser.GameObjects.Container) {
    c.add(this.add.text(28, CONTENT_TOP + 250, '所持装備', {
      fontSize: '14px', color: '#aaaacc', fontStyle: 'bold',
    }))

    if (this.save.ownedWeapons.length === 0) {
      c.add(this.add.text(GAME_W / 2, CONTENT_TOP + 335, '装備はまだありません\n戦闘ドロップか、将来のショップで入手できます。', {
        fontSize: '14px', color: '#445566', align: 'center',
      }).setOrigin(0.5))
      return
    }

    this.save.ownedWeapons.slice(0, 12).forEach((owned, i) => {
      const weapon = WEAPONS[owned.weaponId]
      if (!weapon) return
      const col = i % 4
      const row = Math.floor(i / 4)
      const x = 44 + col * 98
      const y = CONTENT_TOP + 292 + row * 62
      const selected = owned.uid === this.selectedWeaponUid
      const color = RARITY_COLORS[weapon.rarity]
      const bg = this.add.rectangle(x, y, 82, 52, selected ? 0x263044 : 0x111a33)
        .setStrokeStyle(2, selected ? 0xffffff : color)
        .setInteractive({ useHandCursor: true })
      const label = this.add.text(x, y - 13, `${weapon.emoji} ${weapon.rarity}`, {
        fontSize: '12px', color: '#ffffff',
      }).setOrigin(0.5)
      const level = this.add.text(x, y + 5, `Lv.${owned.level}`, {
        fontSize: '11px', color: '#ffdd88',
      }).setOrigin(0.5)
      const equipped = this.add.text(x, y + 19, owned.equippedCharId ? '装備中' : '未装備', {
        fontSize: '9px', color: owned.equippedCharId ? '#66ccff' : '#667788',
      }).setOrigin(0.5)

      bg.on('pointerdown', () => this.selectWeapon(owned.uid))
      c.add([bg, label, level, equipped])
    })
  }

  private buildSelectedWeaponPanel(c: Phaser.GameObjects.Container) {
    const owned = this.selectedWeaponUid
      ? this.save.ownedWeapons.find(w => w.uid === this.selectedWeaponUid)
      : null
    const weapon = owned ? WEAPONS[owned.weaponId] : null
    const y = CONTENT_TOP + 500

    const bg = this.add.rectangle(GAME_W / 2, y + 44, GAME_W - 40, 92, 0x111a33)
      .setStrokeStyle(1, weapon ? RARITY_COLORS[weapon.rarity] : 0x334466)
    c.add(bg)

    if (!owned || !weapon) {
      c.add(this.add.text(GAME_W / 2, y + 44, '装備を選択すると、性能差分が表示されます。', {
        fontSize: '13px', color: '#667788',
      }).setOrigin(0.5))
      return
    }

    c.add(this.add.text(36, y + 8, `${weapon.emoji} ${weapon.name}  ${weapon.rarity} Lv.${owned.level}`, {
      fontSize: '15px', color: '#ffffff', fontStyle: 'bold',
    }))
    c.add(this.add.text(36, y + 30, weapon.description, {
      fontSize: '11px', color: '#88aacc',
    }))
    c.add(this.add.text(36, y + 50, this.weaponDeltaText(owned), {
      fontSize: '11px', color: '#ffdd88',
    }))

    const cost = this.weaponUpgradeCost(owned.level)
    const canUpgrade = this.save.credits >= cost && owned.level < 5
    const upgradeBtn = this.add.rectangle(GAME_W - 92, y + 26, 112, 30, canUpgrade ? 0x225544 : 0x333344)
      .setStrokeStyle(1, canUpgrade ? 0x44cc88 : 0x555566)
      .setInteractive({ useHandCursor: canUpgrade })
    const upgradeText = this.add.text(GAME_W - 92, y + 26, owned.level >= 5 ? 'Lv.MAX' : `${cost} 強化`, {
      fontSize: '12px', color: canUpgrade ? '#ffffff' : '#777788',
    }).setOrigin(0.5)
    if (canUpgrade) upgradeBtn.on('pointerdown', () => this.upgradeSelectedWeapon())

    const unequipBtn = this.add.rectangle(GAME_W - 92, y + 64, 112, 28, owned.equippedCharId ? 0x442222 : 0x222233)
      .setStrokeStyle(1, owned.equippedCharId ? 0xaa5555 : 0x555566)
      .setInteractive({ useHandCursor: !!owned.equippedCharId })
    const unequipText = this.add.text(GAME_W - 92, y + 64, '外す', {
      fontSize: '12px', color: owned.equippedCharId ? '#ffffff' : '#777788',
    }).setOrigin(0.5)
    if (owned.equippedCharId) unequipBtn.on('pointerdown', () => this.unequipSelectedWeapon())

    c.add([upgradeBtn, upgradeText, unequipBtn, unequipText])
  }

  private weaponDeltaText(owned: OwnedWeapon) {
    const weapon = WEAPONS[owned.weaponId]
    if (!weapon) return ''
    const levelBonus = 1 + owned.level * 0.1
    const atk = Math.round((1 + (weapon.atkMult - 1) * levelBonus - 1) * 100)
      const cooldown = Math.round((1 - (1 + (weapon.atkSpeedMult - 1) * levelBonus)) * 100)
      const range = Math.round((1 + (weapon.rangeMult - 1) * levelBonus - 1) * 100)
      const crit = Math.round(weapon.critChance * levelBonus * 100)
      const parts = []
      if (atk !== 0) parts.push(`攻撃 ${atk > 0 ? '+' : ''}${atk}%`)
      if (cooldown !== 0) parts.push(`冷却 ${cooldown > 0 ? '-' : '+'}${Math.abs(cooldown)}%`)
      if (range !== 0) parts.push(`索敵 ${range > 0 ? '+' : ''}${range}%`)
      if (crit !== 0) parts.push(`会心 +${crit}%`)
      return parts.join('  /  ') || '性能変化なし'
    }

  private weaponUpgradeCost(level: number) {
    return 120 + level * 90
  }

  private selectWeapon(uid: string) {
    this.selectedWeaponUid = uid
    this.equipPanel = this.buildEquipPanel()
    this.rebuildPanel(2, this.equipPanel)
    this.panels[2].setVisible(true)
  }

  private equipSelectedWeapon(charId: string) {
    if (!this.selectedWeaponUid) return
    this.save = this.loadSave()
    const target = this.save.ownedWeapons.find(w => w.uid === this.selectedWeaponUid)
    if (!target) return
    for (const w of this.save.ownedWeapons) {
      if (w.uid !== target.uid && w.equippedCharId === charId) w.equippedCharId = null
    }
    target.equippedCharId = charId
    saveGame(this.save)
    this.equipPanel = this.buildEquipPanel()
    this.rebuildPanel(2, this.equipPanel)
    this.panels[2].setVisible(true)
  }

  private unequipSelectedWeapon() {
    if (!this.selectedWeaponUid) return
    this.save = this.loadSave()
    const target = this.save.ownedWeapons.find(w => w.uid === this.selectedWeaponUid)
    if (!target) return
    target.equippedCharId = null
    saveGame(this.save)
    this.equipPanel = this.buildEquipPanel()
    this.rebuildPanel(2, this.equipPanel)
    this.panels[2].setVisible(true)
  }

  private upgradeSelectedWeapon() {
    if (!this.selectedWeaponUid) return
    this.save = this.loadSave()
    const target = this.save.ownedWeapons.find(w => w.uid === this.selectedWeaponUid)
    if (!target || target.level >= 5) return
    const cost = this.weaponUpgradeCost(target.level)
    if (this.save.credits < cost) return
    this.save.credits -= cost
    target.level += 1
    saveGame(this.save)
    this.equipPanel = this.buildEquipPanel()
    this.rebuildPanel(2, this.equipPanel)
    this.panels[2].setVisible(true)
  }

  private buildUpgradePanel(): Phaser.GameObjects.Container {
    const c = this.add.container(0, 0)
    this.save = this.loadSave()

    c.add(this.add.text(GAME_W / 2, CONTENT_TOP - 20, `強化  /  所持クレジット: ${this.save.credits}`, {
      fontSize: '17px', color: '#aaaacc',
    }).setOrigin(0.5))

    const items = [
      {
        key: 'assaultAtkLevel' as const,
        name: 'アサルト型 攻撃力',
        desc: 'Lvごとにアサルト型の攻撃力 +8%',
        current: this.save.upgrades.assaultAtkLevel,
      },
      {
        key: 'assaultCooldownLevel' as const,
        name: 'アサルト型 冷却',
        desc: 'Lvごとにアサルト型のクールタイム -5%',
        current: this.save.upgrades.assaultCooldownLevel,
      },
      {
        key: 'barricadeHpLevel' as const,
        name: 'バリケード耐久',
        desc: 'Lvごとにバリケード最大HP +12',
        current: this.save.upgrades.barricadeHpLevel,
      },
      {
        key: 'equipmentLevel' as const,
        name: '装備整備',
        desc: 'Lvごとに装備の効果 +5%',
        current: this.save.upgrades.equipmentLevel,
      },
    ]

    items.forEach((item, i) => {
      const y = CONTENT_TOP + 26 + i * 112
      const cost = upgradeCost(item.current)
      const canBuy = this.save.credits >= cost

      const bg = this.add.rectangle(GAME_W / 2, y + 42, GAME_W - 40, 92, 0x111a33)
        .setStrokeStyle(1, canBuy ? 0x44aa88 : 0x334466)
      const name = this.add.text(40, y + 8, item.name, {
        fontSize: '18px', color: '#ffffff', fontStyle: 'bold',
      })
      const level = this.add.text(GAME_W - 42, y + 8, `Lv.${item.current}`, {
        fontSize: '17px', color: '#ffdd88',
      }).setOrigin(1, 0)
      const desc = this.add.text(40, y + 34, item.desc, {
        fontSize: '12px', color: '#8899aa',
      })
      const buy = this.add.rectangle(GAME_W - 86, y + 66, 92, 30, canBuy ? 0x225544 : 0x333344)
        .setStrokeStyle(1, canBuy ? 0x44cc88 : 0x555566)
        .setInteractive({ useHandCursor: canBuy })
      const buyText = this.add.text(GAME_W - 86, y + 66, `${cost}で強化`, {
        fontSize: '12px', color: canBuy ? '#ffffff' : '#777788',
      }).setOrigin(0.5)

      if (canBuy) {
        buy.on('pointerdown', () => this.buyUpgrade(item.key))
        buy.on('pointerover', () => buy.setFillStyle(0x337755))
        buy.on('pointerout', () => buy.setFillStyle(0x225544))
      }

      c.add([bg, name, level, desc, buy, buyText])
    })

    return c
  }

  private buildFilePanel(): Phaser.GameObjects.Container {
    const c = this.add.container(0, 0)
    c.add(this.add.text(GAME_W / 2, CONTENT_TOP - 20, '敵ファイル', {
      fontSize: '17px', color: '#aaaacc',
    }).setOrigin(0.5))

    Object.values(ENEMIES).forEach((enemy, i) => {
      const col = i % 2
      const row = Math.floor(i / 2)
      const cardW = (GAME_W - 54) / 2
      const cardH = 56
      const x = 20 + cardW / 2 + col * (cardW + 14)
      const y = CONTENT_TOP + 16 + row * 62
      const color = enemy.color ?? 0x667788

      const bg = this.add.rectangle(x, y + cardH / 2, cardW, cardH, 0x111a33)
        .setStrokeStyle(1, color, 0.75)
      const iconBg = this.add.circle(x - cardW / 2 + 28, y + 22, 18, color, 0.3)
      const icon = this.add.text(x - cardW / 2 + 28, y + 19, enemy.emoji, {
        fontSize: '20px',
      }).setOrigin(0.5)
      const name = this.add.text(x - cardW / 2 + 52, y + 8, enemy.name, {
        fontSize: '13px', color: '#ffffff', fontStyle: 'bold',
      })
      const stats = this.add.text(x - cardW / 2 + 52, y + 27, `HP ${enemy.hp} / SPD ${enemy.speed}`, {
        fontSize: '10px', color: '#88aacc',
      })
      const detail = this.add.text(x - cardW / 2 + 52, y + 41, enemy.description ?? '詳細テキスト未設定', {
        fontSize: '9px', color: '#556677',
      })

      c.add([bg, iconBg, icon, name, stats, detail])
    })

    return c
  }

  private buyUpgrade(key: keyof GameSave['upgrades']) {
    this.save = this.loadSave()
    const current = this.save.upgrades[key]
    const cost = upgradeCost(current)
    if (this.save.credits < cost) return

    this.save.credits -= cost
    this.save.upgrades[key] = current + 1
    saveGame(this.save)
    this.rebuildPanel(3, this.buildUpgradePanel())
    this.panels[3].setVisible(true)
  }

  private loadSave(): GameSave {
    return loadSave()
  }

  static saveClear(stageId: string) {
    const save = loadSave()
    if (!save.clearedStages.includes(stageId)) {
      save.clearedStages.push(stageId)
      saveGame(save)
    }
  }
}
