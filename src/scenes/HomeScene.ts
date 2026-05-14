import Phaser from 'phaser'
import { GAME_W, GAME_H } from '../constants'
import { STAGES } from '../data/stages'
import { CHARACTERS, PLAYABLE_CHARACTER_IDS } from '../data/characters'
import { ENEMIES } from '../data/enemies'
import { RARITY_COLORS, WEAPONS } from '../data/weapons'
import { loadSave, saveGame, upgradeCost } from '../systems/SaveData'
import type { GameSave, OwnedWeapon } from '../types'

const TAB_H = 72
const CONTENT_TOP = 100
const STAGES_PER_PAGE = 6
const ITEMS_PER_PAGE = 12
const EQUIP_ITEMS_PER_PAGE = 10
const SIDE_FRAME_X = GAME_W - 100
const SIDE_FRAME_Y = CONTENT_TOP + 148
const SIDE_FRAME_W = 150
const SIDE_FRAME_H = 230
const SIDE_FRAME_FILL = 0x101827
const SIDE_FRAME_STROKE = 0x4d6388

export class HomeScene extends Phaser.Scene {
  private save!: GameSave
  private panels: Phaser.GameObjects.Container[] = []
  private tabTexts: Phaser.GameObjects.Text[] = []
  private shellObjects: Array<Phaser.GameObjects.Rectangle | Phaser.GameObjects.Text> = []
  private hubHomeContainer?: Phaser.GameObjects.Container
  private backButtonContainer?: Phaser.GameObjects.Container
  private inHubMenu = false
  private activeTab = 0
  private stagePage = 0
  private itemPage = 0
  private equipPage = 0
  private selectedCharacterId = 'assault'
  private selectedWeaponUid: string | null = null
  private selectingEquipmentForCharId: string | null = null

  constructor() { super('HomeScene') }

  create() {
    this.save = this.loadSave()
    this.panels = []
    this.tabTexts = []
    this.shellObjects = []
    this.activeTab = 0
    this.itemPage = 0
    this.equipPage = 0
    this.inHubMenu = false
    this.selectedCharacterId = 'assault'
    this.selectingEquipmentForCharId = null

    const title = this.add.text(GAME_W / 2, 30, 'MACHINE DEFENCE', {
      fontSize: '24px', color: '#ff6644', fontStyle: 'bold',
    }).setOrigin(0.5)
    const tabBand = this.add.rectangle(GAME_W / 2, GAME_H - TAB_H / 2, GAME_W, TAB_H, 0x0a0a1a).setDepth(10)
    this.shellObjects.push(title, tabBand)

    this.panels.push(this.buildStagePanel())
    this.panels.push(this.buildCharPanel())
    this.panels.push(this.buildItemPanel())
    this.panels.push(this.buildShopPanel())
    this.panels.push(this.buildFilePanel())

    const tabDefs = [
      { label: '◇ ステージ' },
      { label: '● キャラ' },
      { label: '▣ アイテム' },
      { label: '◆ ショップ' },
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
      this.shellObjects.push(tabBg, txt)
    })

    this.panels.forEach(panel => panel.setVisible(false))
    this.buildHubHome()
  }

  private switchTab(index: number) {
    this.enterHubMenu()
    if (index === 0) this.rebuildPanel(0, this.buildStagePanel())
    if (index === 1) this.rebuildPanel(1, this.buildCharPanel())
    if (index === 2) this.rebuildPanel(2, this.buildItemPanel())
    if (index === 3) this.rebuildPanel(3, this.buildShopPanel())
    if (index === 4) this.rebuildPanel(4, this.buildFilePanel())

    this.panels.forEach((panel, i) => panel.setVisible(i === index))
    this.tabTexts.forEach((text, i) => text.setColor(i === index ? '#ffffff' : '#445566'))
    this.activeTab = index
  }

  private enterHubMenu() {
    if (this.inHubMenu) return
    this.inHubMenu = true
    this.hubHomeContainer?.setVisible(false)
    this.shellObjects.forEach(obj => obj.setVisible(true))
    this.backButtonContainer?.setVisible(true)
  }

  private returnToHubHome() {
    this.inHubMenu = false
    this.panels.forEach(panel => panel.setVisible(false))
    this.shellObjects.forEach(obj => obj.setVisible(true))
    this.backButtonContainer?.setVisible(false)
    this.hubHomeContainer?.setVisible(true)
  }

  private buildHubHome() {
    this.shellObjects.forEach(obj => obj.setVisible(false))
    this.backButtonContainer = this.createBackButton()
    this.backButtonContainer.setVisible(false)

    const c = this.add.container(0, 0)
    this.hubHomeContainer = c
    const bg = this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x121826)
    const tint = this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x09101d, 0.28)
    const roomTitle = this.add.text(28, 142, '拠点背景差し替え予定', {
      fontSize: '16px', color: '#d7e3f4', fontStyle: 'bold',
    })
    const roomNote = this.add.text(28, 170, '背景全面に室内ビジュアルを配置する想定', {
      fontSize: '12px', color: '#8292aa',
    })
    const portraitShade = this.add.rectangle(GAME_W - 92, 404, 232, 720, 0x09101a, 0.18)
    const portrait = this.add.image(GAME_W - 76, 632, 'home_portrait').setOrigin(0.5).setScale(0.78)
    const portraitName = this.add.text(GAME_W - 100, 642, 'アサルト型', {
      fontSize: '17px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5)
    const portraitNote = this.add.text(GAME_W - 100, 668, '立ち絵仮置き', {
      fontSize: '11px', color: '#8292aa',
    }).setOrigin(0.5)
    c.add([bg, tint, roomTitle, roomNote, portraitShade, portrait, portraitName, portraitNote])
    this.shellObjects.forEach(obj => obj.setVisible(true))
  }

  private createBackButton() {
    const c = this.add.container(0, 0).setDepth(30)
    const bg = this.add.rectangle(48, 30, 72, 30, 0x1b273d)
      .setStrokeStyle(1, 0x5a7696)
      .setInteractive({ useHandCursor: true })
    const txt = this.add.text(48, 30, '< 戻る', {
      fontSize: '12px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5)
    bg.on('pointerdown', () => this.returnToHubHome())
    c.add([bg, txt])
    return c
  }

  private rebuildPanel(index: number, next: Phaser.GameObjects.Container) {
    this.panels[index].destroy()
    this.panels[index] = next
  }

  private addSideFrame(c: Phaser.GameObjects.Container, accent = SIDE_FRAME_STROKE) {
    const frame = this.add.rectangle(SIDE_FRAME_X, SIDE_FRAME_Y, SIDE_FRAME_W, SIDE_FRAME_H, SIDE_FRAME_FILL)
      .setStrokeStyle(2, accent)
    const topLine = this.add.rectangle(SIDE_FRAME_X, SIDE_FRAME_Y - SIDE_FRAME_H / 2 + 2, SIDE_FRAME_W - 12, 3, accent, 0.75)
    c.add([frame, topLine])
    return { x: SIDE_FRAME_X, y: SIDE_FRAME_Y, w: SIDE_FRAME_W, h: SIDE_FRAME_H }
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
    c.add([debugBtn, debugText])

    this.addPageButton(c, 70, CONTENT_TOP - 20, '前へ', this.stagePage > 0, () => this.changeStagePage(-1))
    this.addPageButton(c, 150, CONTENT_TOP - 20, '次へ', this.stagePage < pageCount - 1, () => this.changeStagePage(1))

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
      const name = this.add.text(40, y + 10, `${prefix}${stage.name}`, {
        fontSize: '20px', color: unlocked ? '#ffffff' : '#666677',
      })
      const desc = this.add.text(40, y + 36, stage.description, {
        fontSize: '13px', color: unlocked ? '#888899' : '#555566',
      })
      const mult = this.add.text(GAME_W - 40, y + 10, `HP x${(stage.enemyHpMult ?? 1).toFixed(2)}`, {
        fontSize: '12px', color: unlocked ? '#ffdd88' : '#555566',
      }).setOrigin(1, 0)

      if (unlocked) {
        bg.on('pointerdown', () => this.scene.start('BattleScene', { stageId: stage.id }))
        bg.on('pointerover', () => bg.setFillStyle(0x2a3366))
        bg.on('pointerout', () => bg.setFillStyle(bgColor))
      }
      c.add([bg, name, desc, mult])
    })
    return c
  }

  private addPageButton(c: Phaser.GameObjects.Container, x: number, y: number, label: string, enabled: boolean, onClick: () => void) {
    const bg = this.add.rectangle(x, y, 76, 26, enabled ? 0x223344 : 0x222233)
      .setStrokeStyle(1, 0x445566)
      .setInteractive({ useHandCursor: enabled })
    const text = this.add.text(x, y, label, {
      fontSize: '12px', color: enabled ? '#ffffff' : '#666677',
    }).setOrigin(0.5)
    if (enabled) bg.on('pointerdown', onClick)
    c.add([bg, text])
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

  private characterLevelCap(save = this.save) {
    if (save.debugUnlockAllStages) return 30
    const highestCleared = save.clearedStages.reduce((max, id) => {
      const n = Number(id.replace('stage_', ''))
      return Number.isFinite(n) ? Math.max(max, n) : max
    }, 0)
    return Math.min(30, highestCleared + 1)
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
    this.save = this.loadSave()
    const cfg = CHARACTERS[this.selectedCharacterId] ?? CHARACTERS[PLAYABLE_CHARACTER_IDS[0]]
    this.selectedCharacterId = cfg.id
    const upgradeKey = (cfg.id + 'AtkLevel') as keyof GameSave['upgrades']
    const rawLevel = Number(this.save.upgrades[upgradeKey] ?? 0)
    const levelCap = this.characterLevelCap(this.save)
    const level = Math.min(rawLevel, levelCap)
    const cost = upgradeCost(rawLevel)
    const atkGrowthRate = cfg.upgradeAtkGrowthRate ?? 0.06
    const critGrowth = cfg.upgradeCritGrowth ?? 0.001
    const nextLevel = Math.min(level + 1, levelCap)
    const currentAtk = cfg.atk * (1 + atkGrowthRate * level)
    const nextAtk = cfg.atk * (1 + atkGrowthRate * nextLevel)
    const baseCrit = (cfg.baseCritChance ?? 0) * 100
    const currentCrit = Math.min(65, baseCrit + level * critGrowth * 100)
    const nextCrit = Math.min(65, baseCrit + nextLevel * critGrowth * 100)
    const cooldownBonus = Math.floor(level / 10) * 0.5
    const equipped = this.save.ownedWeapons.find(w => w.equippedCharId === cfg.id)
    const weapon = equipped ? WEAPONS[equipped.weaponId] : null

    c.add(this.add.text(GAME_W / 2, CONTENT_TOP - 22, 'キャラ管理', {
      fontSize: '17px', color: '#aaaacc',
    }).setOrigin(0.5))
    const card = this.add.rectangle(GAME_W / 2, CONTENT_TOP + 190, GAME_W - 34, 368, 0x101827).setStrokeStyle(2, 0x334466)
    c.add(card)
    const side = this.addSideFrame(c)
    const icon = this.add.text(side.x, side.y - 38, cfg.emoji, { fontSize: '58px' }).setOrigin(0.5)
    const sideName = this.add.text(side.x, side.y + 38, cfg.name, {
      fontSize: '15px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5)
    const sideLevel = this.add.text(side.x, side.y + 62, `Lv.${level}/${levelCap}`, {
      fontSize: '13px', color: '#ffdd88', fontStyle: 'bold',
    }).setOrigin(0.5)
    const name = this.add.text(36, CONTENT_TOP + 34, cfg.name, { fontSize: '22px', color: '#ffffff', fontStyle: 'bold' })
    const desc = this.add.text(36, CONTENT_TOP + 66, cfg.description, { fontSize: '12px', color: '#7f91ad', wordWrap: { width: 260 } })
    const levelTitle = this.add.text(38, CONTENT_TOP + 108, `Lv.${level}/${levelCap}`, {
      fontSize: '18px', color: '#ffdd88', fontStyle: 'bold',
    })
    const stats = this.add.text(38, CONTENT_TOP + 138, [
      `攻撃: ${currentAtk.toFixed(1)} -> ${nextAtk.toFixed(1)}`,
      `冷却: ${(cfg.atkSpeed / 1000).toFixed(1)}秒 / 強化補正 -${cooldownBonus.toFixed(1)}%`,
      `会心: ${currentCrit.toFixed(2)}% -> ${nextCrit.toFixed(2)}%`,
      `射程: ${cfg.range}`,
    ].join('\n'), { fontSize: '14px', color: '#d8e6ff', lineSpacing: 7 })

    const slotBg = this.add.rectangle(134, CONTENT_TOP + 260, 204, 56, weapon ? 0x17213a : 0x0d1220)
      .setStrokeStyle(2, weapon ? RARITY_COLORS[weapon.rarity] : 0x334466)
      .setInteractive({ useHandCursor: true })
    const slotText = weapon && equipped
      ? `装備: ${weapon.emoji} ${weapon.name}  Lv.${equipped.level}`
      : '装備: 空きスロット'
    const slotLabel = this.add.text(134, CONTENT_TOP + 260, slotText, {
      fontSize: '12px', color: weapon ? '#ffffff' : '#667788', align: 'center',
    }).setOrigin(0.5)
    slotBg.on('pointerdown', () => {
      this.selectingEquipmentForCharId = cfg.id
      this.selectedWeaponUid = equipped?.uid ?? null
      this.equipPage = 0
      this.rebuildPanel(1, this.buildCharPanel())
      this.panels[1].setVisible(true)
    })

    const canUpgrade = rawLevel < levelCap && this.save.credits >= cost
    const upgradeBtn = this.add.rectangle(GAME_W - 112, CONTENT_TOP + 286, 150, 40, canUpgrade ? 0x225544 : 0x333344)
      .setStrokeStyle(1, canUpgrade ? 0x44cc88 : 0x555566)
      .setInteractive({ useHandCursor: canUpgrade })
    const upgradeLabel = rawLevel >= levelCap ? `Lv.${level}/${levelCap}\nCAP` : `Lv.${level}/${levelCap} 強化 +1\n${cost} CREDIT`
    const upgradeText = this.add.text(GAME_W - 112, CONTENT_TOP + 286, upgradeLabel, {
      fontSize: '12px', color: canUpgrade ? '#ffffff' : '#777788', align: 'center',
    }).setOrigin(0.5)
    if (canUpgrade) upgradeBtn.on('pointerdown', () => this.buyCharacterUpgrade(upgradeKey))
    c.add([icon, sideName, sideLevel, name, desc, levelTitle, stats, slotBg, slotLabel, upgradeBtn, upgradeText])

    if (this.selectingEquipmentForCharId === cfg.id) this.buildCharacterEquipList(c, cfg.id)
    this.buildCharacterSelector(c, cfg.id)
    return c
  }

  private buildCharacterSelector(c: Phaser.GameObjects.Container, selectedId: string) {
    PLAYABLE_CHARACTER_IDS.map(id => CHARACTERS[id]).forEach((ch, i) => {
      const x = 38 + i * 58
      const y = GAME_H - TAB_H - 42
      const selected = ch.id === selectedId
      const bg = this.add.circle(x, y, 22, selected ? 0x2d5488 : 0x141d32)
        .setStrokeStyle(2, selected ? 0x7cc8ff : 0x334466)
        .setInteractive({ useHandCursor: true })
      const emoji = this.add.text(x, y - 2, ch.emoji, { fontSize: '22px' }).setOrigin(0.5)
      const lv = Number(this.save.upgrades[(ch.id + 'AtkLevel') as keyof GameSave['upgrades']] ?? 0)
      const lvText = this.add.text(x, y + 29, `Lv.${lv}`, {
        fontSize: '12px', color: selected ? '#ffffff' : '#a8b8d0', fontStyle: selected ? 'bold' : '',
      }).setOrigin(0.5)
      bg.on('pointerdown', () => {
        this.selectedCharacterId = ch.id
        this.selectingEquipmentForCharId = null
        this.rebuildPanel(1, this.buildCharPanel())
        this.panels[1].setVisible(true)
      })
      c.add([bg, emoji, lvText])
    })
  }

  private buildCharacterEquipList(c: Phaser.GameObjects.Container, charId: string) {
    const x = GAME_W / 2
    const y = CONTENT_TOP + 272
    const bg = this.add.rectangle(x, y + 92, GAME_W - 58, 220, 0x070b14, 0.96)
      .setStrokeStyle(2, 0x5a7696)
      .setDepth(40)
    const title = this.add.text(38, y - 4, '装備を選択', {
      fontSize: '14px', color: '#ffffff', fontStyle: 'bold',
    }).setDepth(41)
    const close = this.add.rectangle(GAME_W - 52, y + 4, 46, 24, 0x222233)
      .setStrokeStyle(1, 0x667788)
      .setInteractive({ useHandCursor: true })
      .setDepth(41)
    const closeText = this.add.text(GAME_W - 52, y + 4, '閉じる', {
      fontSize: '10px', color: '#ffffff',
    }).setOrigin(0.5).setDepth(42)
    close.on('pointerdown', () => {
      this.selectingEquipmentForCharId = null
      this.rebuildPanel(1, this.buildCharPanel())
      this.panels[1].setVisible(true)
    })
    c.add([bg, title, close, closeText])

    const current = this.save.ownedWeapons.find(w => w.equippedCharId === charId)
    const unequip = this.add.rectangle(92, y + 32, 112, 24, current ? 0x442222 : 0x222233)
      .setStrokeStyle(1, current ? 0xaa5555 : 0x555566)
      .setInteractive({ useHandCursor: !!current })
      .setDepth(41)
    const unequipText = this.add.text(92, y + 32, '外す', {
      fontSize: '11px', color: current ? '#ffffff' : '#777788',
    }).setOrigin(0.5).setDepth(42)
    if (current) unequip.on('pointerdown', () => this.unequipCharacterWeapon(charId))
    c.add([unequip, unequipText])

    const pageCount = Math.max(1, Math.ceil(this.save.ownedWeapons.length / EQUIP_ITEMS_PER_PAGE))
    this.equipPage = Phaser.Math.Clamp(this.equipPage, 0, pageCount - 1)
    const start = this.equipPage * EQUIP_ITEMS_PER_PAGE
    const items = this.save.ownedWeapons.slice(start, start + EQUIP_ITEMS_PER_PAGE)
    if (items.length === 0) {
      c.add(this.add.text(GAME_W / 2, y + 78, '装備できるアイテムがありません。', {
        fontSize: '13px', color: '#667788',
      }).setOrigin(0.5).setDepth(41))
      return
    }

    const pageText = this.add.text(GAME_W - 52, y + 32, `${this.equipPage + 1}/${pageCount}`, {
      fontSize: '11px', color: '#aabbcc',
    }).setOrigin(0.5).setDepth(42)
    const prev = this.add.rectangle(GAME_W - 102, y + 32, 34, 22, this.equipPage > 0 ? 0x223344 : 0x222233)
      .setStrokeStyle(1, 0x667788)
      .setInteractive({ useHandCursor: this.equipPage > 0 })
      .setDepth(41)
    const prevText = this.add.text(GAME_W - 102, y + 32, '<', {
      fontSize: '12px', color: this.equipPage > 0 ? '#ffffff' : '#667788',
    }).setOrigin(0.5).setDepth(42)
    const next = this.add.rectangle(GAME_W - 22, y + 32, 34, 22, this.equipPage < pageCount - 1 ? 0x223344 : 0x222233)
      .setStrokeStyle(1, 0x667788)
      .setInteractive({ useHandCursor: this.equipPage < pageCount - 1 })
      .setDepth(41)
    const nextText = this.add.text(GAME_W - 22, y + 32, '>', {
      fontSize: '12px', color: this.equipPage < pageCount - 1 ? '#ffffff' : '#667788',
    }).setOrigin(0.5).setDepth(42)
    if (this.equipPage > 0) prev.on('pointerdown', () => this.changeEquipPage(-1))
    if (this.equipPage < pageCount - 1) next.on('pointerdown', () => this.changeEquipPage(1))
    c.add([pageText, prev, prevText, next, nextText])

    items.forEach((owned, i) => {
      const weapon = WEAPONS[owned.weaponId]
      if (!weapon) return
      const iy = y + 56 + i * 16
      const selected = owned.equippedCharId === charId
      const equippedTo = owned.equippedCharId ? CHARACTERS[owned.equippedCharId]?.name ?? owned.equippedCharId : '未装備'
      const rowBg = this.add.rectangle(GAME_W / 2, iy + 7, GAME_W - 82, 16, selected ? 0x263044 : 0x111a33)
        .setStrokeStyle(1, selected ? 0xffffff : RARITY_COLORS[weapon.rarity])
        .setInteractive({ useHandCursor: true })
        .setDepth(41)
      const rowText = this.add.text(48, iy, `${weapon.emoji} ${weapon.name} Lv.${owned.level}`, {
        fontSize: '11px', color: '#ffffff',
      }).setDepth(42)
      const rowMeta = this.add.text(GAME_W - 52, iy, equippedTo, {
        fontSize: '10px', color: owned.equippedCharId ? '#66ccff' : '#8899aa',
      }).setDepth(42)
      rowBg.on('pointerdown', () => this.equipWeaponToCharacter(owned.uid, charId))
      c.add([rowBg, rowText, rowMeta])
    })
  }

  private buildItemPanel(): Phaser.GameObjects.Container {
    const c = this.add.container(0, 0)
    this.save = this.loadSave()
    c.add(this.add.text(GAME_W / 2, CONTENT_TOP - 20, 'アイテム', {
      fontSize: '17px', color: '#aaaacc',
    }).setOrigin(0.5))
    this.buildItemInventory(c)
    this.buildSelectedWeaponPanel(c)
    return c
  }

  private buildItemInventory(c: Phaser.GameObjects.Container) {
    const pageCount = Math.max(1, Math.ceil(this.save.ownedWeapons.length / ITEMS_PER_PAGE))
    this.itemPage = Phaser.Math.Clamp(this.itemPage, 0, pageCount - 1)
    const start = this.itemPage * ITEMS_PER_PAGE
    const pageItems = this.save.ownedWeapons.slice(start, start + ITEMS_PER_PAGE)
    const groupedCount = new Set(this.save.ownedWeapons.map(w => this.weaponStackKey(w))).size

    c.add(this.add.text(28, CONTENT_TOP + 14, `所持アイテム ${this.itemPage + 1}/${pageCount}`, {
      fontSize: '14px', color: '#aaaacc', fontStyle: 'bold',
    }))
    this.addPageButton(c, GAME_W - 104, CONTENT_TOP + 20, '<', this.itemPage > 0, () => this.changeItemPage(-1))
    this.addPageButton(c, GAME_W - 44, CONTENT_TOP + 20, '>', this.itemPage < pageCount - 1, () => this.changeItemPage(1))
    c.add(this.add.text(28, CONTENT_TOP + 36, `合計 ${this.save.ownedWeapons.length}個 / 強化別 ${groupedCount}種`, {
      fontSize: '12px', color: '#88aacc',
    }))

    if (this.save.ownedWeapons.length === 0) {
      c.add(this.add.text(GAME_W / 2, CONTENT_TOP + 230, 'アイテムはまだありません\n戦闘報酬で装備を入手できます。', {
        fontSize: '14px', color: '#667788', align: 'center',
      }).setOrigin(0.5))
      return
    }

    pageItems.forEach((owned, i) => {
      const weapon = WEAPONS[owned.weaponId]
      if (!weapon) return
      const y = CONTENT_TOP + 52 + i * 30
      const selected = owned.uid === this.selectedWeaponUid
      const sameCount = this.ownedWeaponCount(owned)
      const equippedTo = owned.equippedCharId ? CHARACTERS[owned.equippedCharId]?.name ?? owned.equippedCharId : '未装備'
      const bg = this.add.rectangle(GAME_W / 2, y + 12, GAME_W - 36, 28, selected ? 0x263044 : 0x111a33)
        .setStrokeStyle(1, selected ? 0xffffff : RARITY_COLORS[weapon.rarity])
        .setInteractive({ useHandCursor: true })
      const name = this.add.text(32, y + 2, `${weapon.emoji} ${weapon.name}`, {
        fontSize: '14px', color: '#ffffff', fontStyle: selected ? 'bold' : '',
      })
      const meta = this.add.text(GAME_W - 28, y + 4, `${weapon.rarity} Lv.${owned.level} x${sameCount} / ${equippedTo}`, {
        fontSize: '12px', color: owned.equippedCharId ? '#66ccff' : '#8899aa',
      }).setOrigin(1, 0)
      bg.on('pointerdown', () => this.selectWeapon(owned.uid))
      c.add([bg, name, meta])
    })
  }

  private buildSelectedWeaponPanel(c: Phaser.GameObjects.Container) {
    const owned = this.selectedWeaponUid ? this.save.ownedWeapons.find(w => w.uid === this.selectedWeaponUid) : null
    const weapon = owned ? WEAPONS[owned.weaponId] : null
    const y = CONTENT_TOP + 462

    const bg = this.add.rectangle(GAME_W / 2, y + 58, GAME_W - 28, 116, 0x111a33)
      .setStrokeStyle(1, weapon ? RARITY_COLORS[weapon.rarity] : 0x334466)
    c.add(bg)
    if (!owned || !weapon) {
      c.add(this.add.text(GAME_W / 2, y + 58, 'アイテムを選択すると詳細が表示されます。', {
        fontSize: '15px', color: '#667788',
      }).setOrigin(0.5))
      return
    }

    c.add(this.add.text(36, y + 8, `${weapon.emoji} ${weapon.name}  ${weapon.rarity} Lv.${owned.level}`, {
      fontSize: '18px', color: '#ffffff', fontStyle: 'bold',
    }))
    c.add(this.add.text(36, y + 34, weapon.description, {
      fontSize: '14px', color: '#88aacc',
    }))
    c.add(this.add.text(36, y + 58, this.weaponDeltaText(owned), {
      fontSize: '14px', color: '#ffdd88',
    }))

    const cost = this.weaponUpgradeCost(owned.level)
    const canUpgrade = this.save.credits >= cost && owned.level < 5
    const upgradeBtn = this.add.rectangle(GAME_W - 80, y + 30, 128, 34, canUpgrade ? 0x225544 : 0x333344)
      .setStrokeStyle(1, canUpgrade ? 0x44cc88 : 0x555566)
      .setInteractive({ useHandCursor: canUpgrade })
    const upgradeText = this.add.text(GAME_W - 80, y + 30, owned.level >= 5 ? 'Lv.MAX' : `${cost} 強化`, {
      fontSize: '13px', color: canUpgrade ? '#ffffff' : '#777788',
    }).setOrigin(0.5)
    if (canUpgrade) upgradeBtn.on('pointerdown', () => this.upgradeSelectedWeapon())

    const unequipBtn = this.add.rectangle(GAME_W - 80, y + 72, 128, 32, owned.equippedCharId ? 0x442222 : 0x222233)
      .setStrokeStyle(1, owned.equippedCharId ? 0xaa5555 : 0x555566)
      .setInteractive({ useHandCursor: !!owned.equippedCharId })
    const unequipText = this.add.text(GAME_W - 80, y + 72, '外す', {
      fontSize: '13px', color: owned.equippedCharId ? '#ffffff' : '#777788',
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
    if (range !== 0) parts.push(`射程 ${range > 0 ? '+' : ''}${range}%`)
    if (crit !== 0) parts.push(`会心 +${crit}%`)
    return parts.join(' / ') || '性能変化なし'
  }

  private weaponUpgradeCost(level: number) {
    return 120 + level * 90
  }

  private weaponStackKey(owned: OwnedWeapon) {
    return `${owned.weaponId}:lv${owned.level}`
  }

  private ownedWeaponCount(owned: OwnedWeapon) {
    const key = this.weaponStackKey(owned)
    return this.save.ownedWeapons.filter(w => this.weaponStackKey(w) === key).length
  }

  private selectWeapon(uid: string) {
    this.selectedWeaponUid = uid
    this.rebuildPanel(2, this.buildItemPanel())
    this.panels[2].setVisible(true)
  }

  private changeItemPage(delta: number) {
    this.itemPage += delta
    this.rebuildPanel(2, this.buildItemPanel())
    this.panels[2].setVisible(true)
  }

  private changeEquipPage(delta: number) {
    this.equipPage += delta
    this.rebuildPanel(1, this.buildCharPanel())
    this.panels[1].setVisible(true)
  }

  private equipWeaponToCharacter(uid: string, charId: string) {
    this.save = this.loadSave()
    const target = this.save.ownedWeapons.find(w => w.uid === uid)
    if (!target) return
    for (const w of this.save.ownedWeapons) {
      if (w.uid !== target.uid && w.equippedCharId === charId) w.equippedCharId = null
    }
    target.equippedCharId = charId
    saveGame(this.save)
    this.selectedWeaponUid = uid
    this.selectingEquipmentForCharId = null
    this.rebuildPanel(1, this.buildCharPanel())
    this.panels[1].setVisible(true)
  }

  private unequipCharacterWeapon(charId: string) {
    this.save = this.loadSave()
    const target = this.save.ownedWeapons.find(w => w.equippedCharId === charId)
    if (!target) return
    target.equippedCharId = null
    saveGame(this.save)
    this.selectingEquipmentForCharId = null
    this.rebuildPanel(1, this.buildCharPanel())
    this.panels[1].setVisible(true)
  }

  private unequipSelectedWeapon() {
    if (!this.selectedWeaponUid) return
    this.save = this.loadSave()
    const target = this.save.ownedWeapons.find(w => w.uid === this.selectedWeaponUid)
    if (!target) return
    target.equippedCharId = null
    saveGame(this.save)
    this.rebuildPanel(2, this.buildItemPanel())
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
    this.rebuildPanel(2, this.buildItemPanel())
    this.panels[2].setVisible(true)
  }

  private buildShopPanel(): Phaser.GameObjects.Container {
    const c = this.add.container(0, 0)
    this.save = this.loadSave()
    c.add(this.add.text(GAME_W / 2, CONTENT_TOP - 22, `ショップ / 所持クレジット: ${this.save.credits}`, {
      fontSize: '17px', color: '#aaaacc',
    }).setOrigin(0.5))
    const side = this.addSideFrame(c, 0xaa8855)
    const keeperIcon = this.add.text(GAME_W - 96, CONTENT_TOP + 78, '🛠', { fontSize: '46px' }).setOrigin(0.5)
    const keeperName = this.add.text(GAME_W - 96, CONTENT_TOP + 126, '補給担当', {
      fontSize: '16px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5)
    const keeperLine = this.add.text(GAME_W - 96, CONTENT_TOP + 164, '防衛設備と研究を\nクレジットで整備します。', {
      fontSize: '11px', color: '#9aa7bd', align: 'center',
    }).setOrigin(0.5)
    c.add([keeperIcon, keeperName, keeperLine])
    keeperIcon.setPosition(side.x, side.y - 54).setFontSize(50)
    keeperName.setPosition(side.x, side.y + 2)
    keeperLine.setPosition(side.x, side.y + 48)

    const items = [
      { key: 'barricadeHpLevel' as keyof GameSave['upgrades'], title: 'バリケード補強', desc: '戦闘開始時のバリケード最大HP +5', value: (lv: number) => `現在 +${lv * 5} HP`, cost: (lv: number) => 140 + lv * 95 },
      { key: 'equipmentLevel' as keyof GameSave['upgrades'], title: '装備整備', desc: '装備効果 +3%。装備を拾った後に効く投資。', value: (lv: number) => `現在 +${lv * 3}%`, cost: (lv: number) => 180 + lv * 120 },
      { key: 'researchLevel' as keyof GameSave['upgrades'], title: '報酬研究', desc: '戦闘後クレジット +2%。周回効率を上げる。', value: (lv: number) => `現在 +${lv * 2}%`, cost: (lv: number) => 220 + lv * 150 },
    ]
    items.forEach((item, i) => {
      const lv = Number(this.save.upgrades[item.key] ?? 0)
      const cost = item.cost(lv)
      const canBuy = this.save.credits >= cost
      const y = CONTENT_TOP + 18 + i * 122
      const bg = this.add.rectangle(156, y + 48, 260, 102, 0x111a33).setStrokeStyle(1, canBuy ? 0x44aa88 : 0x334466)
      const title = this.add.text(42, y + 10, `${item.title}  Lv.${lv}`, { fontSize: '17px', color: '#ffffff', fontStyle: 'bold' })
      const desc = this.add.text(42, y + 36, item.desc, { fontSize: '11px', color: '#8ea0bb', wordWrap: { width: 190 } })
      const value = this.add.text(42, y + 68, item.value(lv), { fontSize: '12px', color: '#ffdd88' })
      const btn = this.add.rectangle(260, y + 66, 92, 32, canBuy ? 0x225544 : 0x333344).setStrokeStyle(1, canBuy ? 0x44cc88 : 0x555566).setInteractive({ useHandCursor: canBuy })
      const btnText = this.add.text(260, y + 66, `${cost}\n購入`, { fontSize: '10px', color: canBuy ? '#ffffff' : '#777788', align: 'center' }).setOrigin(0.5)
      if (canBuy) btn.on('pointerdown', () => this.buyShopUpgrade(item.key, cost))
      c.add([bg, title, desc, value, btn, btnText])
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
      const bg = this.add.rectangle(x, y + cardH / 2, cardW, cardH, 0x111a33).setStrokeStyle(1, color, 0.75)
      const iconBg = this.add.circle(x - cardW / 2 + 28, y + 22, 18, color, 0.3)
      const icon = this.add.text(x - cardW / 2 + 28, y + 19, enemy.emoji, { fontSize: '20px' }).setOrigin(0.5)
      const name = this.add.text(x - cardW / 2 + 52, y + 8, enemy.name, { fontSize: '13px', color: '#ffffff', fontStyle: 'bold' })
      const stats = this.add.text(x - cardW / 2 + 52, y + 27, `HP ${enemy.hp} / SPD ${enemy.speed}`, { fontSize: '10px', color: '#88aacc' })
      c.add([bg, iconBg, icon, name, stats])
    })
    return c
  }

  private buyCharacterUpgrade(key: keyof GameSave['upgrades']) {
    this.save = this.loadSave()
    const current = this.save.upgrades[key]
    if (current >= this.characterLevelCap(this.save)) return
    const cost = upgradeCost(current)
    if (this.save.credits < cost) return
    this.save.credits -= cost
    this.save.upgrades[key] = current + 1
    saveGame(this.save)
    this.rebuildPanel(1, this.buildCharPanel())
    this.panels[1].setVisible(true)
  }

  private buyShopUpgrade(key: keyof GameSave['upgrades'], cost: number) {
    this.save = this.loadSave()
    if (this.save.credits < cost) return
    this.save.credits -= cost
    this.save.upgrades[key] = Number(this.save.upgrades[key] ?? 0) + 1
    saveGame(this.save)
    this.rebuildPanel(3, this.buildShopPanel())
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
