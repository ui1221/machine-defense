import Phaser from 'phaser'
import { GAME_W, GAME_H } from '../constants'
import { STAGES } from '../data/stages'
import { CHARACTERS, PLAYABLE_CHARACTER_IDS } from '../data/characters'
import { ENEMIES } from '../data/enemies'
import { canEquipWeaponToCharacter, equipmentSlotLabel, RARITY_COLORS, WEAPONS } from '../data/weapons'
import { RESEARCH_ITEMS, type ResearchItem } from '../data/research'
import { loadSave, markStagePlayed, saveGame, upgradeCost } from '../systems/SaveData'
import type { EquipmentSlot, GameSave, OwnedWeapon } from '../types'

const TAB_H = 72
const CONTENT_TOP = 100
const STAGES_PER_PAGE = 6
const SIDE_FRAME_X = GAME_W - 100
const SIDE_FRAME_Y = CONTENT_TOP + 148
const SIDE_FRAME_W = 150
const SIDE_FRAME_H = 230
const SIDE_FRAME_FILL = 0x101827
const SIDE_FRAME_STROKE = 0x4d6388
const EQUIPMENT_SLOT_ORDER: EquipmentSlot[] = ['weapon', 'core', 'sensor', 'module']
type ShopMode = 'menu' | 'buy' | 'sell' | 'upgrade' | 'research'

export class HomeScene extends Phaser.Scene {
  private save!: GameSave
  private panels: Phaser.GameObjects.Container[] = []
  private tabTexts: Phaser.GameObjects.Text[] = []
  private shellObjects: Array<Phaser.GameObjects.GameObject & { setVisible: (visible: boolean) => unknown }> = []
  private hubHomeContainer?: Phaser.GameObjects.Container
  private backButtonContainer?: Phaser.GameObjects.Container
  private creditText?: Phaser.GameObjects.Text
  private inHubMenu = false
  private activeTab = 0
  private stagePage = 0
  private selectedCharacterId = 'assault'
  private selectingEquipmentForCharId: string | null = null
  private selectingEquipmentSlot: EquipmentSlot | null = null
  private shopMode: ShopMode = 'menu'

  constructor() { super('HomeScene') }

  create() {
    this.save = this.loadSave()
    this.panels = []
    this.tabTexts = []
    this.shellObjects = []
    this.activeTab = 0
    this.inHubMenu = false
    this.selectedCharacterId = 'assault'
    this.selectingEquipmentForCharId = null
    this.selectingEquipmentSlot = null
    this.shopMode = 'menu'

    this.buildBaseBackground()
    this.buildTopStatus()
    const tabBand = this.add.rectangle(GAME_W / 2, GAME_H - TAB_H / 2, GAME_W, TAB_H, 0x0a0a1a).setDepth(10)
    this.shellObjects.push(tabBand)

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
        fontSize: '14px', color: i === 0 ? '#ffffff' : '#445566',
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
    this.backButtonContainer?.setVisible(false)
  }

  private returnToHubHome() {
    this.inHubMenu = false
    this.panels.forEach(panel => panel.setVisible(false))
    this.shellObjects.forEach(obj => obj.setVisible(true))
    this.backButtonContainer?.setVisible(false)
    this.hubHomeContainer?.setVisible(true)
  }

  private buildTopStatus() {
    const faceBg = this.add.circle(34, 31, 18, 0x202a40, 0.95).setDepth(20)
    const face = this.add.text(34, 30, CHARACTERS.assault.emoji, {
      fontSize: '23px',
    }).setOrigin(0.5).setDepth(21)
    const label = this.add.text(62, 22, 'CREDIT', {
      fontSize: '13px', color: '#7f91ad', fontStyle: 'bold',
    }).setDepth(20)
    this.creditText = this.add.text(62, 38, `${this.save.credits}`, {
      fontSize: '18px', color: '#ffdd88', fontStyle: 'bold',
    }).setDepth(20)
    this.shellObjects.push(faceBg, face, label, this.creditText)
  }

  private refreshTopStatus() {
    if (this.creditText) this.creditText.setText(`${this.loadSave().credits}`)
  }

  private buildBaseBackground() {
    const bg = this.add.image(GAME_W / 2, GAME_H / 2, 'home_base_bg').setOrigin(0.5).setDepth(-20)
    const src = bg.texture.getSourceImage() as HTMLImageElement | HTMLCanvasElement
    const scale = Math.max(GAME_W / src.width, GAME_H / src.height)
    bg.setScale(scale)
    this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x08101d, 0.42).setDepth(-19)
    this.add.rectangle(GAME_W / 2, GAME_H - 150, GAME_W, 300, 0x030712, 0.28).setDepth(-18)
  }

  private buildHubHome() {
    this.shellObjects.forEach(obj => obj.setVisible(false))
    this.backButtonContainer = this.createBackButton()
    this.backButtonContainer.setVisible(false)

    const c = this.add.container(0, 0)
    this.hubHomeContainer = c
    const tint = this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x09101d, 0.28)
    const portraitShade = this.add.rectangle(GAME_W - 118, 426, 246, 690, 0x09101a, 0.16)
    const portrait = this.add.image(GAME_W - 118, 596, 'home_portrait').setOrigin(0.5).setScale(0.56)
    c.add([tint, portraitShade, portrait])
    this.shellObjects.forEach(obj => obj.setVisible(true))
  }

  private createBackButton() {
    const c = this.add.container(0, 0).setDepth(30)
    const bg = this.add.rectangle(48, 30, 72, 30, 0x1b273d)
      .setStrokeStyle(1, 0x5a7696)
      .setInteractive({ useHandCursor: true })
    const txt = this.add.text(48, 30, '< 戻る', {
      fontSize: '14px', color: '#ffffff', fontStyle: 'bold',
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

  private addCompactPortrait(
    x: number,
    y: number,
    w: number,
    h: number,
  ) {
    const maskShape = this.add.graphics().setVisible(false)
    maskShape.fillStyle(0xffffff)
    maskShape.fillRect(x - w / 2 + 4, y - h / 2 + 4, w - 8, h - 8)
    const portrait = this.add.image(x + 8, y + 8, 'home_portrait').setOrigin(0.5).setScale(0.2)
    portrait.setMask(maskShape.createGeometryMask())
    return [maskShape, portrait]
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
      fontSize: '15px', color: '#ffffff',
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
      const lastPlayed = this.save.lastPlayedStageId === stage.id
      const bgColor = lastPlayed ? 0x243055 : unlocked ? 0x1a2244 : 0x111827
      const strokeColor = lastPlayed ? 0xffdd66 : cleared ? 0x44ff88 : unlocked ? 0x334466 : 0x333344
      const bg = this.add.rectangle(GAME_W / 2, y + 30, GAME_W - 40, 78, bgColor)
        .setStrokeStyle(lastPlayed ? 3 : 2, strokeColor)
      if (unlocked) bg.setInteractive({ useHandCursor: true })

      const prefix = cleared ? '✓ ' : unlocked ? '' : 'LOCK '
      const name = this.add.text(40, y + 10, `${prefix}${stage.name}`, {
        fontSize: '20px', color: unlocked ? '#ffffff' : '#666677',
      })
      const desc = this.add.text(40, y + 36, stage.description, {
        fontSize: '15px', color: unlocked ? '#888899' : '#555566',
      })
      const mult = this.add.text(GAME_W - 40, y + 10, `HP x${(stage.enemyHpMult ?? 1).toFixed(2)}`, {
        fontSize: '14px', color: unlocked ? '#ffdd88' : '#555566',
      }).setOrigin(1, 0)
      const last = lastPlayed
        ? this.add.text(GAME_W - 40, y + 54, '前回', {
            fontSize: '13px', color: '#ffdd66', fontStyle: 'bold',
          }).setOrigin(1, 0)
        : null

      if (unlocked) {
        bg.on('pointerdown', () => {
          markStagePlayed(stage.id)
          this.scene.start('BattleScene', { stageId: stage.id })
        })
        bg.on('pointerover', () => bg.setFillStyle(0x2a3366))
        bg.on('pointerout', () => bg.setFillStyle(bgColor))
      }
      c.add(last ? [bg, name, desc, mult, last] : [bg, name, desc, mult])
    })
    return c
  }

  private addPageButton(c: Phaser.GameObjects.Container, x: number, y: number, label: string, enabled: boolean, onClick: () => void) {
    const bg = this.add.rectangle(x, y, 76, 26, enabled ? 0x223344 : 0x222233)
      .setStrokeStyle(1, 0x445566)
      .setInteractive({ useHandCursor: enabled })
    const text = this.add.text(x, y, label, {
      fontSize: '14px', color: enabled ? '#ffffff' : '#666677',
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
    this.refreshTopStatus()
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
    const researchAtkMult = 1 + Number(this.save.upgrades.researchAtkLevel ?? 0) * 0.05
    const currentAtk = cfg.atk * (1 + atkGrowthRate * level) * researchAtkMult
    const nextAtk = cfg.atk * (1 + atkGrowthRate * nextLevel) * researchAtkMult
    const baseCrit = (cfg.baseCritChance ?? 0) * 100
    const currentCrit = Math.min(65, baseCrit + level * critGrowth * 100)
    const nextCrit = Math.min(65, baseCrit + nextLevel * critGrowth * 100)
    const equippedBySlot = this.getEquippedBySlot(cfg.id)
    const equipmentStats = this.equipmentStatBonus(cfg.id)
    const cooldownNow = cfg.atkSpeed * (1 - Math.min(0.08, Math.floor(level / 10) * 0.005))
    const atkEquipBonus = currentAtk * (equipmentStats.atkMult - 1)
    const cooldownEquipBonus = cooldownNow * (equipmentStats.atkSpeedMult - 1)
    const critEquipBonus = equipmentStats.critAdd * 100

    c.add(this.add.text(GAME_W / 2, CONTENT_TOP - 22, 'キャラ管理', {
      fontSize: '17px', color: '#aaaacc',
    }).setOrigin(0.5))
    const side = this.addSideFrame(c)
    const divider = this.add.rectangle(250, CONTENT_TOP + 188, 1, 250, 0x2a344f, 0.55)
    c.add(divider)
    const sideVisual: Array<Phaser.GameObjects.GameObject & { setVisible: (visible: boolean) => unknown }> = []
    if (cfg.id === 'assault') {
      sideVisual.push(...this.addCompactPortrait(side.x, side.y, side.w, side.h))
    } else {
      sideVisual.push(this.add.text(side.x, side.y - 38, cfg.emoji, { fontSize: '58px' }).setOrigin(0.5))
    }
    const sideObjects = [...sideVisual]
    const name = this.add.text(36, CONTENT_TOP + 34, cfg.name, { fontSize: '22px', color: '#ffffff', fontStyle: 'bold' })
    const desc = this.add.text(36, CONTENT_TOP + 66, cfg.description, { fontSize: '14px', color: '#7f91ad', wordWrap: { width: 260 } })
    const levelTitle = this.add.text(38, CONTENT_TOP + 108, `Lv.${level}/${levelCap}`, {
      fontSize: '18px', color: '#ffdd88', fontStyle: 'bold',
    })
    const stats = this.add.text(38, CONTENT_TOP + 138, [
      `攻撃: ${currentAtk.toFixed(1)}${this.formatSigned(atkEquipBonus, 1)}`,
      `冷却: ${(cooldownNow / 1000).toFixed(2)}秒${this.formatSigned(cooldownEquipBonus / 1000, 2)}秒`,
      `会心: ${currentCrit.toFixed(2)}%${this.formatSigned(critEquipBonus, 2)}%`,
      `射程: ${cfg.range}`,
    ].join('\n'), { fontSize: '14px', color: '#d8e6ff', lineSpacing: 7 })

    const slotObjects: Phaser.GameObjects.GameObject[] = []
    EQUIPMENT_SLOT_ORDER.forEach((slot, i) => {
      const equipped = equippedBySlot.get(slot)
      const weapon = equipped ? WEAPONS[equipped.weaponId] : null
      const sx = 136
      const sy = CONTENT_TOP + 274 + i * 38
      const slotBg = this.add.rectangle(sx, sy, 196, 32, weapon ? 0x17213a : 0x0d1220)
        .setStrokeStyle(1, weapon ? RARITY_COLORS[weapon.rarity] : 0x334466)
        .setInteractive({ useHandCursor: true })
      const label = weapon && equipped
        ? `${equipmentSlotLabel(slot)}\n${weapon.emoji} ${this.equipmentDisplayName(weapon.name, equipped.level)}`
        : `${equipmentSlotLabel(slot)}\n空き`
      const slotLabel = this.add.text(sx, sy, label, {
        fontSize: '12px', color: weapon ? '#ffffff' : '#667788', align: 'center',
      }).setOrigin(0.5)
      slotBg.on('pointerdown', () => {
        this.selectingEquipmentForCharId = cfg.id
        this.selectingEquipmentSlot = slot
        this.rebuildPanel(1, this.buildCharPanel())
        this.panels[1].setVisible(true)
      })
      slotObjects.push(slotBg, slotLabel)
    })

    const canUpgrade = rawLevel < levelCap && this.save.credits >= cost
    const upgradeBtn = this.add.rectangle(136, CONTENT_TOP + 224, 196, 36, canUpgrade ? 0x225544 : 0x333344)
      .setStrokeStyle(1, canUpgrade ? 0x44cc88 : 0x555566)
      .setInteractive({ useHandCursor: canUpgrade })
    const upgradeLabel = rawLevel >= levelCap ? `Lv.${level}/${levelCap} CAP` : `Lv.${level} -> ${nextLevel}  ${cost} CREDIT`
    const upgradeText = this.add.text(136, CONTENT_TOP + 224, upgradeLabel, {
      fontSize: '14px', color: canUpgrade ? '#ffffff' : '#777788', align: 'center',
    }).setOrigin(0.5)
    if (canUpgrade) upgradeBtn.on('pointerdown', () => {
      this.showConfirmDialog(
        `${cfg.name}\nLv.${level} -> Lv.${nextLevel}\n攻撃: ${currentAtk.toFixed(1)} -> ${nextAtk.toFixed(1)}\n会心: ${currentCrit.toFixed(2)}% -> ${nextCrit.toFixed(2)}%\n${cost} CREDIT で強化します。\nよろしいですか？`,
        () => this.buyCharacterUpgrade(upgradeKey),
      )
    })

    const isSelectingEquipment = this.selectingEquipmentForCharId === cfg.id
    if (isSelectingEquipment) {
      sideObjects.forEach(obj => obj.setVisible(false))
      upgradeBtn.setVisible(false)
      upgradeText.setVisible(false)
    }
    c.add(isSelectingEquipment
      ? [name, desc, levelTitle, stats, ...slotObjects]
      : [...sideObjects, name, desc, levelTitle, stats, ...slotObjects, upgradeBtn, upgradeText])

    if (isSelectingEquipment) this.buildCharacterEquipList(c, cfg.id)
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
        fontSize: '14px', color: selected ? '#ffffff' : '#a8b8d0', fontStyle: selected ? 'bold' : '',
      }).setOrigin(0.5)
      bg.on('pointerdown', () => {
        this.selectedCharacterId = ch.id
        this.selectingEquipmentForCharId = null
        this.selectingEquipmentSlot = null
        this.rebuildPanel(1, this.buildCharPanel())
        this.panels[1].setVisible(true)
      })
      c.add([bg, emoji, lvText])
    })
  }

  private buildCharacterEquipList(c: Phaser.GameObjects.Container, charId: string) {
    const slot = this.selectingEquipmentSlot ?? 'weapon'
    const current = this.getEquippedBySlot(charId).get(slot)
    const list = this.add.container(0, 0).setDepth(45)
    c.add(list)

    const panelW = (GAME_W - 54) / 2
    const panelX = GAME_W - 20 - panelW / 2
    const viewTop = CONTENT_TOP + 16
    const viewBottom = GAME_H - TAB_H - 76
    const viewHeight = viewBottom - viewTop
    const cardH = 74
    const gap = 8
    const slotItems = this.save.ownedWeapons.filter(owned => {
      const weapon = WEAPONS[owned.weaponId]
      return weapon?.slot === slot && canEquipWeaponToCharacter(weapon, charId)
    })
    const contentHeight = Math.max(viewHeight, 40 + slotItems.length * (cardH + gap) + 8)
    const maxScroll = Math.max(0, contentHeight - viewHeight)
    let scrollY = 0

    const maskShape = this.add.rectangle(panelX, (viewTop + viewBottom) / 2, panelW + 4, viewHeight, 0xffffff)
    maskShape.setVisible(false)
    const mask = maskShape.createGeometryMask()
    list.setMask(mask)
    c.add(maskShape)

    const title = this.add.text(panelX, viewTop - 22, equipmentSlotLabel(slot), {
      fontSize: '15px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5)
    const close = this.add.text(panelX + panelW / 2 - 10, viewTop - 23, 'x', {
      fontSize: '18px', color: '#aab8cc', fontStyle: 'bold',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
    close.on('pointerdown', () => {
      this.selectingEquipmentForCharId = null
      this.selectingEquipmentSlot = null
      this.rebuildPanel(1, this.buildCharPanel())
      this.panels[1].setVisible(true)
    })
    c.add([title, close])

    const applyScroll = (next: number) => {
      scrollY = Phaser.Math.Clamp(next, 0, maxScroll)
      list.y = -scrollY
    }
    this.bindPanelScroll(c, panelX, (viewTop + viewBottom) / 2, panelW + 4, viewHeight, delta => applyScroll(scrollY + delta))

    const emptyY = viewTop + 4
    const emptyBg = this.add.rectangle(panelX, emptyY + 16, panelW, 32, current ? 0x442222 : 0x222233, 0.92)
      .setStrokeStyle(1, current ? 0xaa5555 : 0x555566)
      .setInteractive({ useHandCursor: !!current })
    const emptyText = this.add.text(panelX, emptyY + 16, current ? '\u5916\u3059' : '\u7a7a\u304d', {
      fontSize: '14px', color: current ? '#ffffff' : '#777788', fontStyle: 'bold',
    }).setOrigin(0.5)
    if (current) emptyBg.on('pointerdown', () => this.unequipCharacterWeapon(charId, slot))
    list.add([emptyBg, emptyText])

    if (slotItems.length === 0) {
      const none = this.add.text(panelX, viewTop + 74, '\u88c5\u5099\u3067\u304d\u308b\n\u30a2\u30a4\u30c6\u30e0\u306a\u3057', {
        fontSize: '13px', color: '#667788', align: 'center', lineSpacing: 4,
      }).setOrigin(0.5)
      list.add(none)
      return
    }

    slotItems.forEach((owned, i) => {
      const y = viewTop + 44 + i * (cardH + gap)
      this.createItemCard(list, owned, panelX, y, panelW, {
        selected: owned.uid === current?.uid,
        showEquippedTo: true,
        onDragDelta: delta => applyScroll(scrollY + delta),
        onClick: () => this.equipWeaponToCharacter(owned.uid, charId, slot),
      })
    })

    if (maxScroll > 0) {
      c.add(this.add.text(panelX + panelW / 2 - 8, viewBottom - 4, 'v', {
        fontSize: '12px', color: '#556680',
      }).setOrigin(0.5).setDepth(46))
    }
  }
  private buildItemPanel(): Phaser.GameObjects.Container {
    const c = this.add.container(0, 0)
    this.save = this.loadSave()
    const groupedCount = new Set(this.save.ownedWeapons.map(w => this.weaponStackKey(w))).size
    c.add(this.add.text(GAME_W / 2, CONTENT_TOP - 20, `アイテム  ${this.save.ownedWeapons.length}個 / ${groupedCount}種`, {
      fontSize: '17px', color: '#aaaacc',
    }).setOrigin(0.5))
    this.buildItemInventory(c)
    return c
  }

  private buildItemInventory(c: Phaser.GameObjects.Container) {
    if (this.save.ownedWeapons.length === 0) {
      c.add(this.add.text(GAME_W / 2, CONTENT_TOP + 230, 'アイテムはまだありません\n戦闘報酬で装備を入手できます。', {
        fontSize: '14px', color: '#667788', align: 'center',
      }).setOrigin(0.5))
      return
    }

    const list = this.add.container(0, 0)
    c.add(list)
    const viewTop = CONTENT_TOP + 10
    const viewBottom = GAME_H - TAB_H - 8
    const viewHeight = viewBottom - viewTop
    const sortedItems = this.sortedOwnedWeapons(this.save.ownedWeapons)
    const rowCount = Math.ceil(sortedItems.length / 2)
    const contentHeight = rowCount * 80 + 10
    const maxScroll = Math.max(0, contentHeight - viewHeight)
    let scrollY = 0
    const applyScroll = (next: number) => {
      scrollY = Phaser.Math.Clamp(next, 0, maxScroll)
      list.y = -scrollY
    }

    const scrollHit = this.add.rectangle(GAME_W / 2, (viewTop + viewBottom) / 2, GAME_W, viewHeight, 0x000000, 0.001)
      .setInteractive({ useHandCursor: false })
    c.add(scrollHit)
    scrollHit.on('wheel', (_p: Phaser.Input.Pointer, _x: number, _y: number, dy: number) => applyScroll(scrollY + dy * 0.6))
    let dragging = false
    let lastY = 0
    scrollHit.on('pointerdown', (p: Phaser.Input.Pointer) => { dragging = true; lastY = p.y })
    scrollHit.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!dragging || !p.isDown) return
      applyScroll(scrollY + (lastY - p.y))
      lastY = p.y
    })
    scrollHit.on('pointerup', () => { dragging = false })
    scrollHit.on('pointerout', () => { dragging = false })

    sortedItems.forEach((owned, i) => {
      const col = i % 2
      const row = Math.floor(i / 2)
      const cardW = (GAME_W - 54) / 2
      const x = 20 + cardW / 2 + col * (cardW + 14)
      const y = CONTENT_TOP + 16 + row * 80
      this.createItemCard(list, owned, x, y, cardW)
    })

    if (maxScroll > 0) {
      c.add(this.add.text(GAME_W - 24, viewBottom - 8, '▼', { fontSize: '14px', color: '#556680' }).setOrigin(0.5))
    }
  }

  private createItemCard(
    parent: Phaser.GameObjects.Container,
    owned: OwnedWeapon,
    x: number,
    y: number,
    cardW: number,
    options: { selected?: boolean; showEquippedTo?: boolean; onClick?: () => void; onDragDelta?: (delta: number) => void } = {},
  ) {
    const weapon = WEAPONS[owned.weaponId]
    if (!weapon) return
    const slotColor = this.equipmentSlotColor(weapon.slot)
    const objects = this.createInfoCard(parent, {
      x, y, cardW,
      icon: weapon.emoji,
      name: this.equipmentDisplayName(weapon.name, owned.level),
      description: weapon.description,
      meta: weapon.rarity,
      borderColor: slotColor,
      iconColor: slotColor,
      metaColor: this.rarityTextColor(weapon.rarity),
      selected: options.selected,
      onClick: options.onClick,
      onDragDelta: options.onDragDelta,
    })
    if (options.showEquippedTo && owned.equippedCharId && !options.selected) {
      const equippedTo = CHARACTERS[owned.equippedCharId]?.name ?? owned.equippedCharId
      objects.push(this.add.text(x + cardW / 2 - 10, y + 56, equippedTo, {
        fontSize: '11px', color: '#66ccff',
      }).setOrigin(1, 0))
      parent.add(objects[objects.length - 1])
    }
  }

  private createInfoCard(
    parent: Phaser.GameObjects.Container,
    params: {
      x: number
      y: number
      cardW: number
      icon: string
      name: string
      description: string
      meta: string
      borderColor: number
      iconColor: number
      metaColor: string
      selected?: boolean
      onClick?: () => void
      onDragDelta?: (delta: number) => void
    },
  ) {
    const { x, y, cardW } = params
    const cardH = 74
    const bg = this.add.rectangle(x, y + cardH / 2, cardW, cardH, params.selected ? 0x1e3150 : 0x111a33, 0.96)
      .setStrokeStyle(1, params.selected ? 0xffdd66 : params.borderColor, params.selected ? 1 : 0.85)
    if (params.onClick || params.onDragDelta) {
      let downY = 0
      let moved = 0
      let pressed = false
      bg.setInteractive({ useHandCursor: !!params.onClick })
      bg.on('pointerdown', (p: Phaser.Input.Pointer) => {
        downY = p.y
        moved = 0
        pressed = true
      })
      bg.on('pointermove', (p: Phaser.Input.Pointer) => {
        if (!pressed || !p.isDown || !params.onDragDelta) return
        const delta = downY - p.y
        moved += Math.abs(delta)
        downY = p.y
        params.onDragDelta(delta)
      })
      bg.on('pointerup', () => {
        if (pressed && moved < 8) params.onClick?.()
        pressed = false
      })
      bg.on('pointerout', () => { pressed = false })
    }
    const iconBg = this.add.circle(x - cardW / 2 + 28, y + 25, 18, params.iconColor, 0.24)
    const icon = this.add.text(x - cardW / 2 + 28, y + 22, params.icon, { fontSize: '18px' }).setOrigin(0.5)
    const name = this.add.text(x - cardW / 2 + 52, y + 10, params.name, {
      fontSize: '14px', color: '#ffffff', fontStyle: params.selected ? 'bold' : '', wordWrap: { width: cardW - 64 },
    })
    const effect = this.add.text(x - cardW / 2 + 52, y + 31, params.description, {
      fontSize: '12px', color: '#88aacc', wordWrap: { width: cardW - 64 },
    })
    const meta = this.add.text(x + cardW / 2 - 10, y + 10, params.meta, {
      fontSize: '12px', color: params.metaColor, fontStyle: 'bold',
    }).setOrigin(1, 0)
    const objects: Phaser.GameObjects.GameObject[] = [bg, iconBg, icon, name, effect, meta]
    parent.add(objects)
    return objects
  }

  private bindPanelScroll(
    owner: Phaser.GameObjects.Container,
    x: number,
    y: number,
    w: number,
    h: number,
    applyDelta: (delta: number) => void,
  ) {
    const contains = (p: Phaser.Input.Pointer) =>
      p.x >= x - w / 2 && p.x <= x + w / 2 && p.y >= y - h / 2 && p.y <= y + h / 2
    let dragging = false
    let lastY = 0
    const onWheel = (p: Phaser.Input.Pointer, _objects: unknown, _dx: number, dy: number) => {
      if (contains(p)) applyDelta(dy * 0.6)
    }
    const onDown = (p: Phaser.Input.Pointer) => {
      if (!contains(p)) return
      dragging = true
      lastY = p.y
    }
    const onMove = (p: Phaser.Input.Pointer) => {
      if (!dragging || !p.isDown) return
      applyDelta(lastY - p.y)
      lastY = p.y
    }
    const onUp = () => { dragging = false }
    this.input.on('wheel', onWheel)
    this.input.on('pointerdown', onDown)
    this.input.on('pointermove', onMove)
    this.input.on('pointerup', onUp)
    owner.once(Phaser.GameObjects.Events.DESTROY, () => {
      this.input.off('wheel', onWheel)
      this.input.off('pointerdown', onDown)
      this.input.off('pointermove', onMove)
      this.input.off('pointerup', onUp)
    })
  }

  private equipmentSlotColor(slot: EquipmentSlot) {
    if (slot === 'weapon') return 0xcc4455
    if (slot === 'core') return 0xffcc44
    if (slot === 'sensor') return 0x55aaff
    return 0xe8edf5
  }

  private rarityTextColor(rarity: string) {
    const color = RARITY_COLORS[rarity as keyof typeof RARITY_COLORS] ?? 0xffffff
    return '#' + color.toString(16).padStart(6, '0')
  }

  private sortedOwnedWeapons(items: OwnedWeapon[]) {
    const slotOrder: Record<EquipmentSlot, number> = { weapon: 0, core: 1, sensor: 2, module: 3 }
    const rarityOrder = { N: 0, R: 1, SR: 2, SSR: 3 }
    return [...items].sort((a, b) => {
      const aw = WEAPONS[a.weaponId]
      const bw = WEAPONS[b.weaponId]
      if (!aw || !bw) return aw ? -1 : bw ? 1 : 0
      const slotDiff = slotOrder[aw.slot] - slotOrder[bw.slot]
      if (slotDiff !== 0) return slotDiff
      const rarityDiff = rarityOrder[aw.rarity] - rarityOrder[bw.rarity]
      if (rarityDiff !== 0) return rarityDiff
      const nameDiff = aw.name.localeCompare(bw.name, 'ja')
      if (nameDiff !== 0) return nameDiff
      return (a.level ?? 0) - (b.level ?? 0)
    })
  }

  private sellPrice(owned: OwnedWeapon) {
    const weapon = WEAPONS[owned.weaponId]
    if (!weapon) return 0
    const rarityBase = weapon.rarity === 'N' ? 10 : weapon.rarity === 'R' ? 100 : weapon.rarity === 'SR' ? 1000 : 5000
    const slotMult = weapon.slot === 'core' ? 1.1 : weapon.slot === 'module' ? 0.9 : 1
    return Math.max(1, Math.round(rarityBase * slotMult * (1 + owned.level * 0.25)))
  }

  private equipmentStatBonus(charId: string) {
    const result = { atkMult: 1, atkSpeedMult: 1, critAdd: 0 }
    const equipmentBonus = 1 + this.save.upgrades.equipmentLevel * 0.03
    for (const owned of this.save.ownedWeapons) {
      if (owned.equippedCharId !== charId) continue
      const weapon = WEAPONS[owned.weaponId]
      if (!weapon || !canEquipWeaponToCharacter(weapon, charId)) continue
      const levelBonus = 1 + owned.level * 0.1
      const bonus = levelBonus * equipmentBonus
      if (weapon.atkMult !== 1) result.atkMult *= 1 + (weapon.atkMult - 1) * bonus
      if (weapon.atkSpeedMult < 1) result.atkSpeedMult *= 1 + (weapon.atkSpeedMult - 1) * bonus
      if (weapon.atkSpeedMult > 1) result.atkSpeedMult *= weapon.atkSpeedMult
      if (weapon.critChance > 0) result.critAdd += weapon.critChance * bonus
    }
    return result
  }

  private formatSigned(value: number, digits: number) {
    if (Math.abs(value) < 0.005) return ''
    return value > 0 ? ` +${value.toFixed(digits)}` : ` -${Math.abs(value).toFixed(digits)}`
  }

  private equipmentDisplayName(name: string, level: number) {
    return level > 0 ? `${name}+${level}` : name
  }

  private weaponStackKey(owned: OwnedWeapon) {
    return `${owned.weaponId}:lv${owned.level}`
  }

  private getEquippedBySlot(charId: string) {
    const equipped = new Map<EquipmentSlot, OwnedWeapon>()
    for (const owned of this.save.ownedWeapons) {
      if (owned.equippedCharId !== charId) continue
      const weapon = WEAPONS[owned.weaponId]
      if (!weapon) continue
      equipped.set(weapon.slot, owned)
    }
    return equipped
  }

  private equipWeaponToCharacter(uid: string, charId: string, slot: EquipmentSlot) {
    this.save = this.loadSave()
    const target = this.save.ownedWeapons.find(w => w.uid === uid)
    if (!target) return
    const weapon = WEAPONS[target.weaponId]
    if (!weapon || weapon.slot !== slot || !canEquipWeaponToCharacter(weapon, charId)) return
    for (const w of this.save.ownedWeapons) {
      const otherWeapon = WEAPONS[w.weaponId]
      if (w.uid !== target.uid && w.equippedCharId === charId && otherWeapon?.slot === slot) w.equippedCharId = null
    }
    target.equippedCharId = charId
    saveGame(this.save)
    this.refreshTopStatus()
    this.selectingEquipmentForCharId = null
    this.rebuildPanel(1, this.buildCharPanel())
    this.panels[1].setVisible(true)
  }

  private unequipCharacterWeapon(charId: string, slot: EquipmentSlot) {
    this.save = this.loadSave()
    const target = this.save.ownedWeapons.find(w => w.equippedCharId === charId && WEAPONS[w.weaponId]?.slot === slot)
    if (!target) return
    target.equippedCharId = null
    saveGame(this.save)
    this.refreshTopStatus()
    this.selectingEquipmentForCharId = null
    this.rebuildPanel(1, this.buildCharPanel())
    this.panels[1].setVisible(true)
  }

  private buildShopPanel(): Phaser.GameObjects.Container {
    const c = this.add.container(0, 0)
    this.save = this.loadSave()
    c.add(this.add.text(GAME_W / 2, CONTENT_TOP - 22, this.shopMode === 'menu' ? '\u30b7\u30e7\u30c3\u30d7' : this.shopModeTitle(), {
      fontSize: '17px', color: '#aaaacc',
    }).setOrigin(0.5))
    if (this.shopMode !== 'research') this.buildShopKeeper(c)
    if (this.shopMode === 'menu') this.buildShopMenu(c)
    else if (this.shopMode === 'sell') this.buildSellShop(c)
    else if (this.shopMode === 'research') this.buildResearchShop(c)
    else this.buildShopPlaceholder(c)
    return c
  }

  private buildShopKeeper(c: Phaser.GameObjects.Container) {
    const side = this.addSideFrame(c, 0xaa8855)
    const keeperIcon = this.add.text(side.x, side.y - 54, '*', { fontSize: '50px', color: '#ffffff' }).setOrigin(0.5)
    const keeperName = this.add.text(side.x, side.y + 2, '\u88dc\u7d66\u62c5\u5f53', {
      fontSize: '16px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5)
    const keeperLine = this.add.text(side.x, side.y + 48, '\u88c5\u5099\u3068\u7814\u7a76\u3092\n\u30af\u30ec\u30b8\u30c3\u30c8\u3067\u6574\u5099\u3057\u307e\u3059\u3002', {
      fontSize: '14px', color: '#9aa7bd', align: 'center', lineSpacing: 5,
    }).setOrigin(0.5)
    c.add([keeperIcon, keeperName, keeperLine])
  }

  private buildShopMenu(c: Phaser.GameObjects.Container) {
    const modes: Array<{ mode: ShopMode; title: string; desc: string; icon: string }> = [
      { mode: 'buy', title: '\u8cfc\u5165', desc: '\u30af\u30ec\u30b8\u30c3\u30c8\u3067\u88c5\u5099\u3092\u5165\u624b\u3059\u308b', icon: '>' },
      { mode: 'sell', title: '\u58f2\u5374', desc: '\u672a\u88c5\u5099\u30a2\u30a4\u30c6\u30e0\u3092\u5b89\u304f\u58f2\u308b', icon: '>' },
      { mode: 'upgrade', title: '\u88c5\u5099\u5f37\u5316', desc: '\u6240\u6301\u88c5\u5099\u3092+1\u5f37\u5316\u3059\u308b', icon: '>' },
      { mode: 'research', title: '\u7814\u7a76', desc: '\u6052\u4e45\u30d1\u30c3\u30b7\u30d6\u5f37\u5316\u3092\u8cb7\u3046', icon: '>' },
    ]
    modes.forEach((item, i) => {
      const y = CONTENT_TOP + 18 + i * 76
      const bg = this.add.rectangle(160, y + 32, 270, 62, 0x111a33, 0.94)
        .setStrokeStyle(1, 0x445a7a)
        .setInteractive({ useHandCursor: true })
      const icon = this.add.text(46, y + 30, item.icon, { fontSize: '16px', color: '#ffdd88' }).setOrigin(0.5)
      const title = this.add.text(66, y + 12, item.title, { fontSize: '18px', color: '#ffffff', fontStyle: 'bold' })
      const desc = this.add.text(66, y + 38, item.desc, { fontSize: '14px', color: '#8ea0bb' })
      bg.on('pointerdown', () => {
        this.shopMode = item.mode
        this.rebuildPanel(3, this.buildShopPanel())
        this.panels[3].setVisible(true)
      })
      c.add([bg, icon, title, desc])
    })
  }

  private buildShopBackButton(c: Phaser.GameObjects.Container) {
    const back = this.add.text(34, CONTENT_TOP - 23, '< \u623b\u308b', {
      fontSize: '15px', color: '#aab8cc', fontStyle: 'bold',
    }).setInteractive({ useHandCursor: true })
    back.on('pointerdown', () => {
      this.shopMode = 'menu'
      this.rebuildPanel(3, this.buildShopPanel())
      this.panels[3].setVisible(true)
    })
    c.add(back)
  }

  private buildShopPlaceholder(c: Phaser.GameObjects.Container) {
    this.buildShopBackButton(c)
    c.add(this.add.text(160, CONTENT_TOP + 120, '\u3053\u306e\u9805\u76ee\u306f\u6b21\u306b\u5b9f\u88c5\u3057\u307e\u3059\u3002', {
      fontSize: '16px', color: '#8ea0bb', align: 'center',
    }).setOrigin(0.5))
  }

  private buildSellShop(c: Phaser.GameObjects.Container) {
    this.buildShopBackButton(c)
    const items = this.save.ownedWeapons.filter(w => !w.equippedCharId && WEAPONS[w.weaponId])
    if (items.length === 0) {
      c.add(this.add.text(160, CONTENT_TOP + 120, '\u58f2\u5374\u3067\u304d\u308b\u30a2\u30a4\u30c6\u30e0\u306f\u3042\u308a\u307e\u305b\u3093\u3002', {
        fontSize: '15px', color: '#8ea0bb', align: 'center',
      }).setOrigin(0.5))
      return
    }

    const list = this.add.container(0, 0)
    c.add(list)
    const cardW = 270
    const cardH = 74
    const gap = 8
    const viewTop = CONTENT_TOP + 14
    const viewBottom = GAME_H - TAB_H - 10
    const viewHeight = viewBottom - viewTop
    const contentHeight = items.length * (cardH + gap) + 8
    const maxScroll = Math.max(0, contentHeight - viewHeight)
    let scrollY = 0
    const applyScroll = (next: number) => {
      scrollY = Phaser.Math.Clamp(next, 0, maxScroll)
      list.y = -scrollY
    }

    const maskShape = this.add.rectangle(160, (viewTop + viewBottom) / 2, cardW + 12, viewHeight, 0xffffff)
    maskShape.setVisible(false)
    list.setMask(maskShape.createGeometryMask())
    c.add(maskShape)
    this.bindPanelScroll(c, 160, (viewTop + viewBottom) / 2, cardW + 12, viewHeight, delta => applyScroll(scrollY + delta))

    items.forEach((owned, i) => {
      const y = viewTop + i * (cardH + gap)
      const price = this.sellPrice(owned)
      this.createItemCard(list, owned, 160, y, cardW, {
        onDragDelta: delta => applyScroll(scrollY + delta),
        onClick: () => this.showSellConfirm(owned.uid),
      })
      const priceText = this.add.text(160 + cardW / 2 - 10, y + cardH - 18, `${price} CREDIT`, {
        fontSize: '12px', color: '#ffdd88', fontStyle: 'bold',
      }).setOrigin(1, 0)
      list.add(priceText)
    })

    if (maxScroll > 0) {
      c.add(this.add.text(286, viewBottom - 8, 'v', { fontSize: '14px', color: '#556680' }).setOrigin(0.5))
    }
  }

  private buildResearchShop(c: Phaser.GameObjects.Container) {
    this.buildShopBackButton(c)
    const cardW = (GAME_W - 54) / 2
    RESEARCH_ITEMS.forEach((item, i) => {
      const col = i % 2
      const row = Math.floor(i / 2)
      const x = 20 + cardW / 2 + col * (cardW + 14)
      const y = CONTENT_TOP + 16 + row * 84
      this.createResearchCard(c, item, x, y, cardW)
    })
    this.createResearchResetCard(c, CONTENT_TOP + 16 + 3 * 84)
  }

  private createResearchResetCard(parent: Phaser.GameObjects.Container, y: number) {
    const refund = this.calcResearchRefund()
    const canReset = refund > 0
    this.createInfoCard(parent, {
      x: GAME_W / 2,
      y,
      cardW: GAME_W - 40,
      icon: '↺',
      name: '強化のやり直し',
      description: canReset ? `研究を初期化して ${refund} CREDIT を返却` : '初期化できる研究はありません',
      meta: canReset ? 'RESET' : 'EMPTY',
      borderColor: canReset ? 0xcc8866 : 0x445a7a,
      iconColor: 0xcc8866,
      metaColor: canReset ? '#ffdd88' : '#777788',
      selected: false,
      onClick: canReset ? () => this.showResearchResetConfirm(refund) : undefined,
    })
  }

  private createResearchCard(parent: Phaser.GameObjects.Container, item: ResearchItem, x: number, y: number, cardW: number) {
    const level = Number(this.save.upgrades[item.id] ?? 0)
    const maxed = level >= item.maxLevel
    const cost = item.cost(level)
    const canBuy = !maxed && this.save.credits >= cost
    const meta = maxed ? 'MAX' : 'Lv.' + level + '/' + item.maxLevel
    this.createInfoCard(parent, {
      x, y, cardW,
      icon: item.icon,
      name: item.name,
      description: item.valueText(level) + ' / ' + (maxed ? '強化済み' : item.nextText(level)),
      meta,
      borderColor: canBuy ? 0x44aa88 : 0x445a7a,
      iconColor: 0x44aa88,
      metaColor: maxed ? '#ffdd66' : '#ffffff',
      selected: false,
      onClick: canBuy ? () => this.showResearchConfirm(item, level, cost) : undefined,
    })
    if (!maxed) {
      const price = this.add.text(x + cardW / 2 - 10, y + 56, cost + ' CREDIT', {
        fontSize: '11px', color: canBuy ? '#ffdd88' : '#777788', fontStyle: 'bold',
      }).setOrigin(1, 0)
      parent.add(price)
    }
  }

  private showResearchConfirm(item: ResearchItem, level: number, cost: number) {
    this.showConfirmDialog(
      `${item.name}\nLv.${level} -> Lv.${level + 1}\n${item.nextText(level)}\n${cost} CREDIT で研究します。\nよろしいですか？`,
      () => this.buyResearchUpgrade(item.id, cost),
    )
  }

  private showResearchResetConfirm(refund: number) {
    this.showConfirmDialog(
      `研究を初期化します。\nクレジットは返却されます。\n返却: ${refund} CREDIT\nよろしいですか？`,
      () => this.resetResearchUpgrades(),
    )
  }

  private shopModeTitle() {
    if (this.shopMode === 'buy') return '\u30b7\u30e7\u30c3\u30d7 / \u8cfc\u5165'
    if (this.shopMode === 'sell') return '\u30b7\u30e7\u30c3\u30d7 / \u58f2\u5374'
    if (this.shopMode === 'upgrade') return '\u30b7\u30e7\u30c3\u30d7 / \u88c5\u5099\u5f37\u5316'
    return '\u30b7\u30e7\u30c3\u30d7 / \u7814\u7a76'
  }
  private buildFilePanel(): Phaser.GameObjects.Container {
    const c = this.add.container(0, 0)
    c.add(this.add.text(GAME_W / 2, CONTENT_TOP - 20, '敵ファイル', {
      fontSize: '17px', color: '#aaaacc',
    }).setOrigin(0.5))

    const list = this.add.container(0, 0)
    c.add(list)

    const viewTop = CONTENT_TOP + 8
    const viewBottom = GAME_H - TAB_H - 8
    const viewHeight = viewBottom - viewTop
    const enemyList = Object.values(ENEMIES)
    const rowCount = Math.ceil(enemyList.length / 2)
    const contentHeight = rowCount * 62 + 10
    const maxScroll = Math.max(0, contentHeight - viewHeight)
    let scrollY = 0
    const applyScroll = (next: number) => {
      scrollY = Phaser.Math.Clamp(next, 0, maxScroll)
      list.y = -scrollY
    }

    const scrollHit = this.add.rectangle(GAME_W / 2, (viewTop + viewBottom) / 2, GAME_W, viewHeight, 0x000000, 0.001)
      .setInteractive({ useHandCursor: false })
    c.add(scrollHit)
    scrollHit.on('wheel', (_p: Phaser.Input.Pointer, _x: number, _y: number, dy: number) => applyScroll(scrollY + dy * 0.6))
    let dragging = false
    let lastY = 0
    scrollHit.on('pointerdown', (p: Phaser.Input.Pointer) => { dragging = true; lastY = p.y })
    scrollHit.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!dragging || !p.isDown) return
      applyScroll(scrollY + (lastY - p.y))
      lastY = p.y
    })
    scrollHit.on('pointerup', () => { dragging = false })
    scrollHit.on('pointerout', () => { dragging = false })

    enemyList.forEach((enemy, i) => {
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
      const name = this.add.text(x - cardW / 2 + 52, y + 8, enemy.name, { fontSize: '15px', color: '#ffffff', fontStyle: 'bold' })
      const stats = this.add.text(x - cardW / 2 + 52, y + 27, `HP ${enemy.hp} / SPD ${enemy.speed}`, { fontSize: '15px', color: '#88aacc' })
      list.add([bg, iconBg, icon, name, stats])
    })

    if (maxScroll > 0) {
      c.add(this.add.text(GAME_W - 24, viewBottom - 8, '▼', { fontSize: '14px', color: '#556680' }).setOrigin(0.5))
    }

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
    this.refreshTopStatus()
    this.rebuildPanel(1, this.buildCharPanel())
    this.panels[1].setVisible(true)
  }

  private buyResearchUpgrade(key: keyof GameSave['upgrades'], cost: number) {
    this.save = this.loadSave()
    if (this.save.credits < cost) return
    const item = RESEARCH_ITEMS.find(r => r.id === key)
    const current = Number(this.save.upgrades[key] ?? 0)
    if (!item || current >= item.maxLevel) return
    this.save.credits -= cost
    this.save.upgrades[key] = current + 1
    saveGame(this.save)
    this.refreshTopStatus()
    this.rebuildPanel(3, this.buildShopPanel())
    this.panels[3].setVisible(true)
  }

  private calcResearchRefund() {
    return RESEARCH_ITEMS.reduce((sum, item) => {
      const level = Math.min(Number(this.save.upgrades[item.id] ?? 0), item.maxLevel)
      for (let i = 0; i < level; i += 1) sum += item.cost(i)
      return sum
    }, 0)
  }

  private resetResearchUpgrades() {
    this.save = this.loadSave()
    const refund = this.calcResearchRefund()
    if (refund <= 0) return
    for (const item of RESEARCH_ITEMS) {
      this.save.upgrades[item.id] = 0
    }
    this.save.credits += refund
    saveGame(this.save)
    this.refreshTopStatus()
    this.rebuildPanel(3, this.buildShopPanel())
    this.panels[3].setVisible(true)
  }

  private showSellConfirm(uid: string) {
    this.save = this.loadSave()
    const target = this.save.ownedWeapons.find(w => w.uid === uid)
    const weapon = target ? WEAPONS[target.weaponId] : null
    if (!target || !weapon || target.equippedCharId) return
    const price = this.sellPrice(target)
    this.showConfirmDialog(
      `${this.equipmentDisplayName(weapon.name, target.level)}\n${price} CREDIT で売却します。`,
      () => this.sellOwnedWeapon(uid),
    )
  }

  private showConfirmDialog(message: string, onYes: () => void) {
    const overlay = this.add.container(0, 0).setDepth(200)
    const veil = this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x000000, 0.58)
      .setInteractive({ useHandCursor: false })
    const bg = this.add.rectangle(GAME_W / 2, GAME_H / 2, 340, 176, 0x111a33, 0.98)
      .setStrokeStyle(2, 0x88aacc)
    const msg = this.add.text(GAME_W / 2, GAME_H / 2 - 42, message, {
      fontSize: '16px', color: '#ffffff', align: 'center', lineSpacing: 8,
    }).setOrigin(0.5)
    const yes = this.add.rectangle(GAME_W / 2 - 70, GAME_H / 2 + 48, 110, 38, 0x225544)
      .setStrokeStyle(1, 0x44cc88)
      .setInteractive({ useHandCursor: true })
    const no = this.add.rectangle(GAME_W / 2 + 70, GAME_H / 2 + 48, 110, 38, 0x333344)
      .setStrokeStyle(1, 0x667788)
      .setInteractive({ useHandCursor: true })
    const yesText = this.add.text(GAME_W / 2 - 70, GAME_H / 2 + 48, 'はい', {
      fontSize: '16px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5)
    const noText = this.add.text(GAME_W / 2 + 70, GAME_H / 2 + 48, 'いいえ', {
      fontSize: '16px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5)
    const stop = (_p: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => event.stopPropagation()
    veil.on('pointerdown', stop)
    veil.on('pointerup', stop)
    yes.on('pointerdown', stop)
    yes.on('pointerup', (_p: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation()
      overlay.destroy()
      onYes()
    })
    no.on('pointerdown', stop)
    no.on('pointerup', (_p: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation()
      overlay.destroy()
    })
    overlay.add([veil, bg, msg, yes, no, yesText, noText])
  }

  private sellOwnedWeapon(uid: string) {
    this.save = this.loadSave()
    const target = this.save.ownedWeapons.find(w => w.uid === uid)
    if (!target || target.equippedCharId) return
    const price = this.sellPrice(target)
    this.save.ownedWeapons = this.save.ownedWeapons.filter(w => w.uid !== uid)
    this.save.credits += price
    saveGame(this.save)
    this.refreshTopStatus()
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
