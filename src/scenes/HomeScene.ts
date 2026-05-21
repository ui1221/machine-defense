import Phaser from 'phaser'
import { GAME_W, GAME_H } from '../constants'
import { STAGES } from '../data/stages'
import { CHARACTERS, PLAYABLE_CHARACTER_IDS } from '../data/characters'
import { ENEMIES } from '../data/enemies'
import { canEquipWeaponToCharacter, equipmentSlotLabel, RARITY_COLORS, WEAPONS } from '../data/weapons'
import { RESEARCH_ITEMS, type ResearchItem } from '../data/research'
import { loadSave, markStagePlayed, saveGame, upgradeCost } from '../systems/SaveData'
import type { EquipmentSlot, GameSave, OwnedWeapon } from '../types'
import {
  UI_ACTIVE_STROKE_ALPHA,
  UI_ACTIVE_STROKE_COLOR,
  UI_ACTIVE_STROKE_WIDTH,
  UI_DIALOG_FILL,
  UI_DIALOG_FILL_ALPHA,
  UI_DIALOG_H,
  UI_DIALOG_STROKE_ALPHA,
  UI_DIALOG_STROKE_COLOR,
  UI_DIALOG_W,
  UI_DIALOG_X,
  UI_EDGE_BUTTON_ACCENT,
  UI_EDGE_BUTTON_ACCENT_ALPHA,
  UI_EDGE_BUTTON_FILL,
  UI_EDGE_BUTTON_FILL_ALPHA,
  UI_EDGE_BUTTON_SLIDE_DURATION,
  UI_EDGE_BUTTON_SLIDE_OFFSET,
  UI_EDGE_BUTTON_SLIDE_STAGGER,
  UI_EDGE_BUTTON_STROKE_ALPHA,
  UI_EDGE_BUTTON_STROKE_WIDTH,
} from '../ui/theme'

const TAB_H = 72
const CONTENT_TOP = 82
const SIDE_FRAME_X = GAME_W - 100
const SIDE_FRAME_Y = CONTENT_TOP + 148
const SIDE_FRAME_W = 150
const SIDE_FRAME_H = 230
const SIDE_FRAME_FILL = 0x101827
const SIDE_FRAME_STROKE = 0x4d6388
const STANDEE_X = GAME_W - 118
const STANDEE_TOP_Y = 260
const STANDEE_DISPLAY_H = 670
const EQUIPMENT_SLOT_ORDER: EquipmentSlot[] = ['weapon', 'core', 'sensor', 'module']
type ShopMode = 'menu' | 'buy' | 'sell' | 'upgrade' | 'research'
type FileMode = 'items' | 'enemies'

export class HomeScene extends Phaser.Scene {
  private save!: GameSave
  private panels: Phaser.GameObjects.Container[] = []
  private tabTexts: Phaser.GameObjects.Text[] = []
  private tabBgs: Phaser.GameObjects.Rectangle[] = []
  private tabGlows: Phaser.GameObjects.Arc[] = []
  private tabIconBgs: Phaser.GameObjects.Arc[] = []
  private tabIcons: Phaser.GameObjects.Graphics[] = []
  private tabAccents: Phaser.GameObjects.Rectangle[] = []
  private shellObjects: Array<Phaser.GameObjects.GameObject & { setVisible: (visible: boolean) => unknown }> = []
  private topShellObjects: Phaser.GameObjects.GameObject[] = []
  private bottomShellObjects: Phaser.GameObjects.GameObject[] = []
  private hubHomeContainer?: Phaser.GameObjects.Container
  private lobbyPortrait?: Phaser.GameObjects.Image | Phaser.GameObjects.Text
  private backButtonContainer?: Phaser.GameObjects.Container
  private creditText?: Phaser.GameObjects.Text
  private lobbyMessageContainer?: Phaser.GameObjects.Container
  private lobbyMessageText?: Phaser.GameObjects.Text
  private lobbyMessageTimer?: Phaser.Time.TimerEvent
  private inHubMenu = false
  private activeTab = 0
  private selectedCharacterId = 'assault'
  private selectingEquipmentForCharId: string | null = null
  private selectingEquipmentSlot: EquipmentSlot | null = null
  private shopMode: ShopMode = 'menu'
  private fileMode: FileMode = 'items'
  private playLobbyReturnIntro = false

  constructor() { super('HomeScene') }

  create(data?: { fromBattle?: boolean }) {
    this.save = this.loadSave()
    this.panels = []
    this.tabTexts = []
    this.tabBgs = []
    this.tabGlows = []
    this.tabIconBgs = []
    this.tabIcons = []
    this.tabAccents = []
    this.shellObjects = []
    this.topShellObjects = []
    this.bottomShellObjects = []
    this.activeTab = 2
    this.playLobbyReturnIntro = !!data?.fromBattle
    this.inHubMenu = false
    this.selectedCharacterId = 'assault'
    this.selectingEquipmentForCharId = null
    this.selectingEquipmentSlot = null
    this.shopMode = 'menu'
    this.fileMode = 'items'

    this.buildBaseBackground()
    const topShade = this.createTopStatusShade()
    this.shellObjects.push(topShade)
    this.topShellObjects.push(topShade)
    this.buildTopStatus()
    const tabShade = this.createBottomNavShade()
    const tabLine = this.add.rectangle(GAME_W / 2, GAME_H - TAB_H + 1, GAME_W - 40, 1, 0x8ad7ff, 0.08).setDepth(11)
    this.shellObjects.push(tabShade, tabLine)
    this.bottomShellObjects.push(tabShade, tabLine)

    this.panels.push(this.buildStagePanel())
    this.panels.push(this.buildCharPanel())
    this.panels.push(this.add.container(0, 0))
    this.panels.push(this.buildShopPanel())
    this.panels.push(this.buildFilePanel())

    const tabDefs = [
      { label: 'ステージ', accent: 0x61d7ff },
      { label: 'キャラ', accent: 0xffcc66 },
      { label: 'ロビー', accent: 0x9bdcff },
      { label: 'ショップ', accent: 0x78f0b2 },
      { label: 'ファイル', accent: 0xd9e2ff },
    ]
    const navPadX = 34
    const tabW = (GAME_W - navPadX * 2) / tabDefs.length

    tabDefs.forEach((tab, i) => {
      const tx = navPadX + tabW * i + tabW / 2
      const selected = i === this.activeTab
      const tabBg = this.add.rectangle(tx, GAME_H - 37, tabW, TAB_H, 0x000000, 0.001)
        .setDepth(11)
        .setInteractive({ useHandCursor: true })
      const glow = this.add.circle(tx, GAME_H - 50, 30, tab.accent, selected ? 0.16 : 0.045).setDepth(11)
      const iconBg = this.add.circle(tx, GAME_H - 50, 22, selected ? 0x142238 : 0x080d17, selected ? 0.82 : 0.18)
        .setDepth(12)
        .setStrokeStyle(2, selected ? tab.accent : 0x5f6d82, selected ? 0.72 : 0.32)
      const icon = this.createNavIcon(i, tx, GAME_H - 50, selected)
      const txt = this.add.text(tx, GAME_H - 16, tab.label, {
        fontSize: '13px',
        color: selected ? '#ffffff' : '#a9b1bf',
        fontStyle: selected ? 'bold' : '',
      }).setOrigin(0.5).setDepth(13)
      const accent = this.add.rectangle(tx, GAME_H - 4, tabW - 34, 2, tab.accent, selected ? 0.46 : 0).setDepth(13)

      tabBg.on('pointerdown', () => this.switchTab(i))
      tabBg.on('pointerover', () => {
        if (this.activeTab === i) return
        iconBg.setFillStyle(0x101827, 0.42)
        glow.setAlpha(0.085)
      })
      tabBg.on('pointerout', () => {
        if (this.activeTab === i) return
        iconBg.setFillStyle(0x080d17, 0.18)
        glow.setAlpha(0.045)
      })
      this.tabBgs.push(tabBg)
      this.tabGlows.push(glow)
      this.tabIconBgs.push(iconBg)
      this.tabIcons.push(icon)
      this.tabAccents.push(accent)
      this.tabTexts.push(txt)
      this.shellObjects.push(tabBg, glow, iconBg, icon, txt, accent)
      this.bottomShellObjects.push(tabBg, glow, iconBg, icon, txt, accent)
    })

    this.panels.forEach(panel => panel.setVisible(false))
    this.buildHubHome()
    this.installTapSparkle()
  }

  private installTapSparkle() {
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.spawnTapSparkle(p.x, p.y)
    })
  }

  private spawnTapSparkle(x: number, y: number) {
    const c = this.add.container(x, y).setDepth(200)
    const ring = this.add.circle(0, 0, 4, 0xffffff, 0)
      .setStrokeStyle(2, 0xbfefff, 0.85)
    c.add(ring)

    for (let i = 0; i < 6; i += 1) {
      const a = (Math.PI * 2 * i) / 6
      const dot = this.add.circle(0, 0, i % 2 === 0 ? 2.5 : 2, i % 2 === 0 ? 0xffffff : 0x8ad7ff, 0.95)
      c.add(dot)
      this.tweens.add({
        targets: dot,
        x: Math.cos(a) * 24,
        y: Math.sin(a) * 24,
        alpha: 0,
        scale: 0.4,
        duration: 320,
        ease: 'Cubic.easeOut',
      })
    }

    this.tweens.add({
      targets: ring,
      radius: 24,
      alpha: 0,
      duration: 320,
      ease: 'Cubic.easeOut',
      onComplete: () => c.destroy(),
    })
  }

  private switchTab(index: number) {
    if (index === 2) {
      this.returnToHubHome()
      this.updateNavSelection(index)
      return
    }

    this.enterHubMenu()
    if (index === 0) this.rebuildPanel(0, this.buildStagePanel())
    if (index === 1) this.rebuildPanel(1, this.buildCharPanel())
    if (index === 3) this.rebuildPanel(3, this.buildShopPanel())
    if (index === 4) this.rebuildPanel(4, this.buildFilePanel())

    this.panels.forEach((panel, i) => panel.setVisible(i === index))
    this.updateNavSelection(index)
  }

  private updateNavSelection(index: number) {
    this.tabTexts.forEach((text, i) => {
      const selected = i === index
      text.setColor(selected ? '#ffffff' : '#a9b1bf')
      text.setFontSize(13)
      text.setFontStyle(selected ? 'bold' : '')
    })
    this.tabBgs.forEach((_bg, i) => {
      const selected = i === index
      const accent = this.tabAccent(i)
      this.tabGlows[i]?.setFillStyle(accent, selected ? 0.16 : 0.045)
      this.tabGlows[i]?.setRadius(30)
      this.tabIconBgs[i]?.setFillStyle(selected ? 0x142238 : 0x080d17, selected ? 0.82 : 0.18)
      this.tabIconBgs[i]?.setStrokeStyle(2, selected ? accent : 0x5f6d82, selected ? 0.72 : 0.32)
      if (this.tabIcons[i]) this.paintNavIcon(this.tabIcons[i], i, selected)
      this.tabAccents[i]?.setFillStyle(accent, selected ? 0.46 : 0)
    })
    this.activeTab = index
  }

  private tabAccent(index: number) {
    return [0x61d7ff, 0xffcc66, 0x9bdcff, 0x78f0b2, 0xd9e2ff][index] ?? 0xffffff
  }

  private createBottomNavShade() {
    const g = this.add.graphics().setDepth(10)
    const top = GAME_H - 190
    const step = 3
    for (let y = top; y < GAME_H; y += step) {
      const t = (y - top) / (GAME_H - top)
      const alpha = Math.min(0.96, Math.pow(t, 2.35) * 0.96)
      g.fillStyle(0x000000, alpha)
      g.fillRect(0, y, GAME_W, step + 1)
    }
    g.fillStyle(0x000000, 0.24)
    g.fillRect(0, GAME_H - 24, GAME_W, 24)
    return g
  }

  private createNavIcon(index: number, x: number, y: number, selected: boolean) {
    const icon = this.add.graphics().setDepth(13)
    this.paintNavIcon(icon, index, selected, x, y)
    return icon
  }

  private paintNavIcon(
    icon: Phaser.GameObjects.Graphics,
    index: number,
    selected: boolean,
    x = icon.getData('x') as number,
    y = icon.getData('y') as number,
  ) {
    icon.setData('x', x)
    icon.setData('y', y)
    icon.clear()
    const color = selected ? 0xffffff : 0x8d9ab2
    const alpha = selected ? 0.95 : 0.62
    const scale = 1
    icon.lineStyle(3, color, alpha)
    icon.fillStyle(color, alpha)

    if (index === 0) {
      icon.beginPath()
      icon.moveTo(x, y - 13 * scale)
      icon.lineTo(x + 12 * scale, y)
      icon.lineTo(x, y + 13 * scale)
      icon.lineTo(x - 12 * scale, y)
      icon.closePath()
      icon.strokePath()
      icon.fillCircle(x, y, 3 * scale)
    } else if (index === 1) {
      icon.strokeCircle(x, y - 7 * scale, 6 * scale)
      icon.beginPath()
      icon.arc(x, y + 13 * scale, 12 * scale, Math.PI * 1.12, Math.PI * 1.88)
      icon.strokePath()
    } else if (index === 2) {
      icon.beginPath()
      icon.moveTo(x, y - 14 * scale)
      icon.lineTo(x + 12 * scale, y - 7 * scale)
      icon.lineTo(x + 12 * scale, y + 7 * scale)
      icon.lineTo(x, y + 14 * scale)
      icon.lineTo(x - 12 * scale, y + 7 * scale)
      icon.lineTo(x - 12 * scale, y - 7 * scale)
      icon.closePath()
      icon.strokePath()
      icon.fillCircle(x, y, 4 * scale)
      icon.beginPath()
      icon.moveTo(x, y - 8 * scale)
      icon.lineTo(x, y + 8 * scale)
      icon.moveTo(x - 7 * scale, y)
      icon.lineTo(x + 7 * scale, y)
      icon.strokePath()
    } else if (index === 3) {
      icon.strokeRoundedRect(x - 12 * scale, y - 6 * scale, 24 * scale, 18 * scale, 4 * scale)
      icon.beginPath()
      icon.arc(x, y - 6 * scale, 7 * scale, Math.PI, Math.PI * 2)
      icon.strokePath()
    } else {
      icon.strokeRect(x - 9 * scale, y - 12 * scale, 18 * scale, 24 * scale)
      icon.beginPath()
      icon.moveTo(x + 3 * scale, y - 12 * scale)
      icon.lineTo(x + 9 * scale, y - 6 * scale)
      icon.moveTo(x - 4 * scale, y - 2 * scale)
      icon.lineTo(x + 5 * scale, y - 2 * scale)
      icon.moveTo(x - 4 * scale, y + 5 * scale)
      icon.lineTo(x + 5 * scale, y + 5 * scale)
      icon.strokePath()
    }
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
    if (this.lobbyPortrait) this.slidePortraitIn(this.lobbyPortrait)
  }

  private buildTopStatus() {
    const hud = this.add.container(36, 34).setDepth(20)
    const faceGlow = this.add.circle(0, 0, 30, 0x61d7ff, 0.08)
    const faceBg = this.add.circle(0, 0, 22, 0x142238, 0.82)
      .setDepth(20)
      .setStrokeStyle(2, 0x61d7ff, 0.42)
    const face = this.add.text(0, -2, CHARACTERS.assault.emoji, {
      fontSize: '24px',
    }).setOrigin(0.5)
    const coin = this.add.circle(36, 0, 8, 0xffd466, 0.95)
      .setStrokeStyle(2, 0xfff0aa, 0.55)
    const coinMark = this.add.rectangle(36, 0, 3, 10, 0x9a681b, 0.75)
    this.creditText = this.add.text(52, 0, `${this.save.credits}`, {
      fontSize: '20px', color: '#ffdd88', fontStyle: 'bold',
    }).setOrigin(0, 0.5)
    hud.add([faceGlow, faceBg, face, coin, coinMark, this.creditText])
    this.alignTextVisualCenter(this.creditText, hud.y)

    const settings = this.add.container(GAME_W - 36, 34).setDepth(20)
    const settingsHit = this.add.circle(0, 0, 24, 0x000000, 0.001)
      .setInteractive({ useHandCursor: true })
    const settingsIcon = this.add.graphics()
    settingsIcon.lineStyle(2.5, 0xd9e2ff, 0.82)
    settingsIcon.strokeCircle(0, 0, 7)
    settingsIcon.fillStyle(0xd9e2ff, 0.82)
    settingsIcon.fillCircle(0, 0, 2.5)
    for (let i = 0; i < 6; i += 1) {
      const a = (Math.PI * 2 * i) / 6
      const cx = Math.cos(a) * 11
      const cy = Math.sin(a) * 11
      settingsIcon.fillRoundedRect(cx - 2.5, cy - 4, 5, 8, 2)
    }
    settings.add([settingsHit, settingsIcon])

    this.shellObjects.push(hud, settings)
    this.topShellObjects.push(hud, settings)
  }

  private alignTextVisualCenter(text: Phaser.GameObjects.Text, worldCenterY: number) {
    const bounds = text.getBounds()
    const visualCenterY = bounds.y + bounds.height / 2
    text.y += worldCenterY - visualCenterY
  }

  private createTopStatusShade() {
    const g = this.add.graphics().setDepth(18)
    const bottom = 150
    const step = 3
    for (let y = 0; y < bottom; y += step) {
      const t = 1 - y / bottom
      const alpha = Math.min(0.9, Math.pow(t, 2.35) * 0.9)
      g.fillStyle(0x000000, alpha)
      g.fillRect(0, y, GAME_W, step + 1)
    }
    return g
  }

  private refreshTopStatus() {
    if (this.creditText) this.creditText.setText(`${this.loadSave().credits}`)
  }

  private buildBaseBackground() {
    const bg = this.add.image(GAME_W / 2, GAME_H / 2, 'home_base_bg').setOrigin(0.5).setDepth(-20)
    const src = bg.texture.getSourceImage() as HTMLImageElement | HTMLCanvasElement
    const scale = Math.max(GAME_W / src.width, GAME_H / src.height)
    bg.setScale(scale)
  }

  private buildHubHome() {
    this.shellObjects.forEach(obj => obj.setVisible(false))
    this.backButtonContainer = this.createBackButton()
    this.backButtonContainer.setVisible(false)

    const c = this.add.container(0, 0)
    this.hubHomeContainer = c
    this.createLobbyMessageWindow(c)
    const portrait = this.addCharacterStandee('assault')
      .setInteractive({ useHandCursor: true })
    this.lobbyPortrait = portrait
    portrait.on('pointerdown', () => {
      this.showLobbyMessage('準備はできています。出撃先を選んでください。')
    })
    c.add([portrait])
    this.shellObjects.forEach(obj => obj.setVisible(true))
    if (this.playLobbyReturnIntro) {
      this.playLobbyReturnIntro = false
      this.playLobbyReturnAnimation(portrait)
      this.time.delayedCall(1050, () => {
        this.showLobbyMessage('帰還しました。装備と研究を確認して、次の出撃に備えましょう。')
      })
    } else {
      this.slidePortraitIn(portrait)
      this.showLobbyMessage('次の出撃に備えています。必要なら装備と研究を確認してください。')
    }
  }

  private playLobbyReturnAnimation(portrait: Phaser.GameObjects.Image | Phaser.GameObjects.Text) {
    this.slideObjects(this.topShellObjects, -120, 360, 0)
    this.slideObjects(this.bottomShellObjects, 130, 420, 0)

    const targetX = portrait.x
    portrait.x = GAME_W + 120
    portrait.setAlpha(0)
    this.tweens.add({
      targets: portrait,
      x: targetX,
      alpha: 1,
      duration: 520,
      delay: 360,
      ease: 'Cubic.easeOut',
    })
  }

  private addCharacterStandee(charId: string) {
    const cfg = CHARACTERS[charId] ?? CHARACTERS.assault
    if (cfg.id === 'assault') {
      const portrait = this.add.image(STANDEE_X, STANDEE_TOP_Y, 'home_portrait')
        .setOrigin(0.5, 0)
      portrait.displayHeight = STANDEE_DISPLAY_H
      portrait.scaleX = portrait.scaleY
      return portrait
    }

    return this.add.text(STANDEE_X, STANDEE_TOP_Y + 180, cfg.emoji, {
      fontSize: '104px',
    }).setOrigin(0.5)
  }

  private slideObjects(objects: Phaser.GameObjects.GameObject[], offsetY: number, duration: number, delay: number) {
    objects.forEach(obj => {
      const target = obj as Phaser.GameObjects.GameObject & { y: number }
      const targetY = target.y
      target.y = targetY + offsetY
      this.tweens.add({
        targets: target,
        y: targetY,
        duration,
        delay,
        ease: 'Cubic.easeOut',
      })
    })
  }

  private slidePortraitIn(target: Phaser.GameObjects.Image | Phaser.GameObjects.Text) {
    this.slideObjectInFromRight(target)
  }

  private slideObjectInFromRight(target: Phaser.GameObjects.GameObject & { x: number; setAlpha: (value: number) => unknown }) {
    const targetX = target.x
    target.x = targetX + 130
    target.setAlpha(0)
    this.tweens.add({
      targets: target,
      x: targetX,
      alpha: 1,
      duration: 420,
      ease: 'Cubic.easeOut',
    })
  }

  private createLobbyMessageWindow(c: Phaser.GameObjects.Container) {
    const x = 12
    const y = CONTENT_TOP
    const w = GAME_W - 24
    const h = 236
    const message = this.add.container(0, 0).setAlpha(0)
    const bg = this.add.graphics()
    bg.fillStyle(0x050914, 0.78)
    bg.fillRoundedRect(x, y, w, h, 8)
    bg.lineStyle(1, 0x8ad7ff, 0.28)
    bg.strokeRoundedRect(x, y, w, h, 8)
    bg.fillStyle(0x050914, 0.78)
    bg.beginPath()
    bg.moveTo(x + w - 146, y + h)
    bg.lineTo(x + w - 92, y + h)
    bg.lineTo(x + w - 112, y + h + 24)
    bg.closePath()
    bg.fillPath()

    const text = this.add.text(x + 24, y + 22, '', {
      fontSize: '17px',
      color: '#eef6ff',
      lineSpacing: 7,
      wordWrap: { width: w - 48, useAdvancedWrap: true },
    })
    message.add([bg, text])
    c.add(message)
    this.lobbyMessageContainer = message
    this.lobbyMessageText = text
  }

  private showLobbyMessage(text: string, duration = 5200) {
    if (!this.lobbyMessageContainer || !this.lobbyMessageText) return
    this.lobbyMessageTimer?.remove(false)
    this.tweens.killTweensOf(this.lobbyMessageContainer)
    this.lobbyMessageText.setText(text)
    this.lobbyMessageContainer.setAlpha(0)
    this.tweens.add({
      targets: this.lobbyMessageContainer,
      alpha: 1,
      duration: 180,
      ease: 'Sine.easeOut',
    })
    this.lobbyMessageTimer = this.time.delayedCall(duration, () => {
      if (!this.lobbyMessageContainer) return
      this.tweens.add({
        targets: this.lobbyMessageContainer,
        alpha: 0,
        duration: 420,
        ease: 'Sine.easeInOut',
      })
    })
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
    const frame = this.add.rectangle(SIDE_FRAME_X, SIDE_FRAME_Y, SIDE_FRAME_W, SIDE_FRAME_H, SIDE_FRAME_FILL, 0.46)
      .setStrokeStyle(1, accent, 0.48)
    const topLine = this.add.rectangle(SIDE_FRAME_X, SIDE_FRAME_Y - SIDE_FRAME_H / 2 + 2, SIDE_FRAME_W - 12, 2, accent, 0.54)
    c.add([frame, topLine])
    return { x: SIDE_FRAME_X, y: SIDE_FRAME_Y, w: SIDE_FRAME_W, h: SIDE_FRAME_H }
  }

  private buildStagePanel(): Phaser.GameObjects.Container {
    const c = this.add.container(0, 0)
    this.save = this.loadSave()

    const list = this.add.container(0, 0)
    c.add(list)
    const viewTop = CONTENT_TOP
    const viewBottom = GAME_H - TAB_H - 14
    const viewHeight = viewBottom - viewTop
    const cardH = 78
    const rowH = 96
    const contentHeight = Math.max(viewHeight, STAGES.length * rowH + 8)
    const maxScroll = Math.max(0, contentHeight - viewHeight)
    const lastPlayedIndex = Math.max(0, STAGES.findIndex(stage => stage.id === this.save.lastPlayedStageId))
    let scrollY = Phaser.Math.Clamp(lastPlayedIndex * rowH - viewHeight / 2 + cardH / 2, 0, maxScroll)

    const maskShape = this.add.rectangle(GAME_W / 2, (viewTop + viewBottom) / 2, GAME_W, viewHeight, 0xffffff)
    maskShape.setVisible(false)
    list.setMask(maskShape.createGeometryMask())
    c.add(maskShape)

    const applyScroll = (next: number) => {
      scrollY = Phaser.Math.Clamp(next, 0, maxScroll)
      list.y = -scrollY
    }

    STAGES.forEach((stage, i) => {
      const y = viewTop + 6 + i * rowH
      const cleared = this.save.clearedStages.includes(stage.id)
      const unlocked = this.isStageUnlocked(i)
      const lastPlayed = this.save.lastPlayedStageId === stage.id
      const bgColor = lastPlayed ? 0x243055 : unlocked ? 0x1a2244 : 0x111827
      const strokeColor = lastPlayed ? UI_ACTIVE_STROKE_COLOR : cleared ? 0x44ff88 : unlocked ? 0x334466 : 0x333344
      const bg = this.add.rectangle(GAME_W / 2, y + 30, GAME_W - 40, 78, bgColor, lastPlayed ? 0.78 : 0.58)
        .setStrokeStyle(lastPlayed ? UI_ACTIVE_STROKE_WIDTH : 1, strokeColor, lastPlayed ? UI_ACTIVE_STROKE_ALPHA : 0.52)
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
        this.bindTapOnly(bg, () => {
          markStagePlayed(stage.id)
          this.scene.start('BattleScene', { stageId: stage.id })
        })
        bg.on('pointerover', () => bg.setFillStyle(0x2a3366))
        bg.on('pointerout', () => bg.setFillStyle(bgColor))
      }
      list.add(last ? [bg, name, desc, mult, last] : [bg, name, desc, mult])
    })
    applyScroll(scrollY)
    this.bindPanelScroll(c, GAME_W / 2, (viewTop + viewBottom) / 2, GAME_W, viewHeight, delta => applyScroll(scrollY + delta))
    return c
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

    const portraitObjects: Array<Phaser.GameObjects.GameObject & { setVisible: (visible: boolean) => unknown }> = []
    const standee = this.addCharacterStandee(cfg.id)
    portraitObjects.push(standee)
    this.slideObjectInFromRight(standee)
    const panelX = 36
    const infoTop = CONTENT_TOP + 72
    const name = this.add.text(panelX, infoTop, cfg.name, { fontSize: '22px', color: '#ffffff', fontStyle: 'bold' })
    const desc = this.add.text(panelX, infoTop + 32, cfg.description, {
      fontSize: '14px', color: '#9fb0c8', wordWrap: { width: 245, useAdvancedWrap: true },
    })
    const levelTitle = this.add.text(panelX, infoTop + 86, `Lv.${level}/${levelCap}`, {
      fontSize: '18px', color: '#ffdd88', fontStyle: 'bold',
    })
    const stats = this.add.text(panelX, infoTop + 116, [
      `攻撃: ${currentAtk.toFixed(1)}${this.formatSigned(atkEquipBonus, 1)}`,
      `冷却: ${(cooldownNow / 1000).toFixed(2)}秒${this.formatSigned(cooldownEquipBonus / 1000, 2)}秒`,
      `会心: ${currentCrit.toFixed(2)}%${this.formatSigned(critEquipBonus, 2)}%`,
    ].join('\n'), { fontSize: '14px', color: '#d8e6ff', lineSpacing: 7 })

    const slotObjects: Phaser.GameObjects.GameObject[] = []
    const actionButtonX = -10
    const actionButtonW = 318
    const actionButtonH = 66
    const actionButtonStep = 78
    const actionButtonGap = actionButtonStep - actionButtonH
    const upgradeY = infoTop + 216
    EQUIPMENT_SLOT_ORDER.forEach((slot, i) => {
      const equipped = equippedBySlot.get(slot)
      const weapon = equipped ? WEAPONS[equipped.weaponId] : null
      const slotButton = this.createEdgeButton(c, {
        x: actionButtonX,
        y: upgradeY + actionButtonH + actionButtonGap * 2 + i * actionButtonStep,
        w: actionButtonW,
        h: actionButtonH,
        title: weapon && equipped ? this.equipmentDisplayName(weapon.name, equipped.level) : equipmentSlotLabel(slot),
        desc: weapon ? this.compactEquipmentDescription(weapon.description) : '空き',
        icon: weapon?.emoji ?? '>',
        accent: weapon ? RARITY_COLORS[weapon.rarity] : undefined,
        slideDelay: i * UI_EDGE_BUTTON_SLIDE_STAGGER,
        onTap: () => {
          this.selectingEquipmentForCharId = cfg.id
          this.selectingEquipmentSlot = slot
          this.rebuildPanel(1, this.buildCharPanel())
          this.panels[1].setVisible(true)
        },
      })
      slotObjects.push(slotButton)
    })

    const canUpgrade = rawLevel < levelCap && this.save.credits >= cost
    const upgradeLabel = rawLevel >= levelCap ? `Lv.${level}/${levelCap} CAP` : `Lv.${level} -> ${nextLevel}  ${cost} CREDIT`
    const upgradeBtn = this.createEdgeButton(c, {
      x: actionButtonX,
      y: upgradeY,
      w: actionButtonW,
      h: actionButtonH,
      title: '躯体強化',
      desc: upgradeLabel,
      icon: '>',
      enabled: canUpgrade,
      onTap: () => {
        this.showConfirmDialog(
          `${cfg.name}\nLv.${level} -> Lv.${nextLevel}\n攻撃: ${currentAtk.toFixed(1)} -> ${nextAtk.toFixed(1)}\n会心: ${currentCrit.toFixed(2)}% -> ${nextCrit.toFixed(2)}%\n${cost} CREDIT で強化します。\nよろしいですか？`,
          () => this.buyCharacterUpgrade(upgradeKey),
        )
      },
    })

    const isSelectingEquipment = this.selectingEquipmentForCharId === cfg.id
    if (isSelectingEquipment) {
      portraitObjects.forEach(obj => obj.setVisible(false))
      upgradeBtn.setVisible(false)
    }
    c.add(isSelectingEquipment
      ? [name, desc, levelTitle, stats, ...slotObjects]
      : [...portraitObjects, name, desc, levelTitle, stats, ...slotObjects, upgradeBtn])
    if (!isSelectingEquipment) c.bringToTop(upgradeBtn)
    slotObjects.forEach(obj => c.bringToTop(obj))

    if (isSelectingEquipment) this.buildCharacterEquipList(c, cfg.id)
    this.buildCharacterSelector(c, cfg.id)
    return c
  }

  private buildCharacterSelector(c: Phaser.GameObjects.Container, selectedId: string) {
    PLAYABLE_CHARACTER_IDS.map(id => CHARACTERS[id]).forEach((ch, i) => {
      const x = 42 + i * 54
      const y = CONTENT_TOP + 24
      const selected = ch.id === selectedId
      const bg = this.add.circle(x, y, 21, selected ? 0x2d5488 : 0x141d32, selected ? 0.92 : 0.58)
        .setStrokeStyle(2, selected ? 0x7cc8ff : 0x334466, selected ? 0.9 : 0.52)
        .setInteractive({ useHandCursor: true })
      const emoji = this.add.text(x, y - 2, ch.emoji, { fontSize: '21px' }).setOrigin(0.5)
      bg.on('pointerdown', () => {
        this.selectedCharacterId = ch.id
        this.selectingEquipmentForCharId = null
        this.selectingEquipmentSlot = null
        this.rebuildPanel(1, this.buildCharPanel())
        this.panels[1].setVisible(true)
      })
      c.add([bg, emoji])
    })
  }

  private buildCharacterEquipList(c: Phaser.GameObjects.Container, charId: string) {
    const slot = this.selectingEquipmentSlot ?? 'weapon'
    const current = this.getEquippedBySlot(charId).get(slot)

    const panelX = 0
    const panelY = CONTENT_TOP + 58
    const panelW = GAME_W - panelX
    const panelH = GAME_H - TAB_H - panelY - 8
    const viewTop = panelY + 42
    const viewBottom = GAME_H - TAB_H - 18
    const viewHeight = viewBottom - viewTop
    const rowH = 68
    const slotItems = this.save.ownedWeapons.filter(owned => {
      const weapon = WEAPONS[owned.weaponId]
      return weapon?.slot === slot && canEquipWeaponToCharacter(weapon, charId)
    })
    const contentHeight = Math.max(viewHeight, 48 + slotItems.length * rowH + 8)
    const maxScroll = Math.max(0, contentHeight - viewHeight)
    let scrollY = 0

    this.createSelectionPanel(c, panelX, panelY, panelW, panelH)
    const list = this.add.container(0, 0).setDepth(45)
    c.add(list)

    const maskShape = this.add.rectangle(panelX + panelW / 2, (viewTop + viewBottom) / 2, panelW, viewHeight, 0xffffff)
    maskShape.setVisible(false)
    const mask = maskShape.createGeometryMask()
    list.setMask(mask)
    c.add(maskShape)

    const back = this.add.text(panelX + 14, panelY + 12, '<', {
      fontSize: '18px', color: '#ffdd88', fontStyle: 'bold',
    }).setInteractive({ useHandCursor: true })
    const title = this.add.text(panelX + panelW / 2, panelY + 13, `${equipmentSlotLabel(slot)}を選択`, {
      fontSize: '17px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5, 0)
    back.on('pointerdown', () => {
      this.selectingEquipmentForCharId = null
      this.selectingEquipmentSlot = null
      this.rebuildPanel(1, this.buildCharPanel())
      this.panels[1].setVisible(true)
    })
    c.add([back, title])
    if (current) {
      const remove = this.add.text(panelX + panelW - 16, panelY + 13, '外す', {
        fontSize: '15px', color: '#ffb0a0', fontStyle: 'bold',
      }).setOrigin(1, 0).setInteractive({ useHandCursor: true })
      remove.on('pointerdown', () => this.unequipCharacterWeapon(charId, slot))
      c.add(remove)
    }

    const applyScroll = (next: number) => {
      scrollY = Phaser.Math.Clamp(next, 0, maxScroll)
      list.y = -scrollY
    }
    this.bindPanelScroll(c, panelX + panelW / 2, (viewTop + viewBottom) / 2, panelW, viewHeight, delta => applyScroll(scrollY + delta))

    if (slotItems.length === 0) {
      const none = this.add.text(panelX + panelW / 2, viewTop + 56, '\u88c5\u5099\u3067\u304d\u308b\n\u30a2\u30a4\u30c6\u30e0\u306a\u3057', {
        fontSize: '13px', color: '#667788', align: 'center', lineSpacing: 4,
      }).setOrigin(0.5)
      list.add(none)
      return
    }

    slotItems.forEach((owned, i) => {
      const weapon = WEAPONS[owned.weaponId]
      if (!weapon) return
      const equippedByOther = !!owned.equippedCharId && owned.equippedCharId !== charId
      const equippedOwner = equippedByOther ? CHARACTERS[owned.equippedCharId!]?.name ?? owned.equippedCharId : null
      const y = viewTop + 4 + i * rowH
      this.createListRow(list, {
        x: panelX,
        y,
        w: panelW,
        h: rowH,
        icon: weapon.emoji,
        iconColor: RARITY_COLORS[weapon.rarity],
        title: this.equipmentDisplayName(weapon.name, owned.level),
        detail: this.compactEquipmentDescription(weapon.description),
        meta: owned.uid === current?.uid ? '装備中' : equippedOwner ? `${equippedOwner} 装備中` : weapon.rarity,
        enabled: !equippedByOther,
        onDragDelta: delta => applyScroll(scrollY + delta),
        onClick: equippedByOther ? undefined : () => this.equipWeaponToCharacter(owned.uid, charId, slot),
      })
    })

    if (maxScroll > 0) {
      c.add(this.add.text(panelX + panelW / 2, panelY + panelH - 22, '▼', {
        fontSize: '13px', color: '#7d8ca3',
      }).setOrigin(0.5).setDepth(46))
    }
  }

  private createSelectionPanel(parent: Phaser.GameObjects.Container, x: number, y: number, w: number, h: number) {
    const bg = this.add.rectangle(x + w / 2, y + h / 2, w, h, UI_EDGE_BUTTON_FILL, 0.98)
      .setStrokeStyle(UI_EDGE_BUTTON_STROKE_WIDTH, UI_EDGE_BUTTON_ACCENT, 0.46)
    parent.add(bg)
    return { bg }
  }

  private buildItemInventory(c: Phaser.GameObjects.Container, topOffset = 0) {
    if (this.save.ownedWeapons.length === 0) {
      c.add(this.add.text(GAME_W / 2, CONTENT_TOP + 230 + topOffset, 'アイテムはまだありません\n戦闘報酬で装備を入手できます。', {
        fontSize: '14px', color: '#667788', align: 'center',
      }).setOrigin(0.5))
      return
    }

    const list = this.add.container(0, 0)
    c.add(list)
    const viewTop = CONTENT_TOP + 10 + topOffset
    const viewBottom = GAME_H - TAB_H - 8
    const viewHeight = viewBottom - viewTop
    const sortedItems = this.sortedOwnedWeapons(this.save.ownedWeapons)
    const rowH = 68
    const contentHeight = sortedItems.length * rowH + 10
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
      const weapon = WEAPONS[owned.weaponId]
      if (!weapon) return
      const y = CONTENT_TOP + 10 + topOffset + i * rowH
      this.createListRow(list, {
        x: 0,
        y,
        w: GAME_W,
        h: rowH,
        icon: weapon.emoji,
        iconColor: this.equipmentSlotColor(weapon.slot),
        title: this.equipmentDisplayName(weapon.name, owned.level),
        detail: this.compactEquipmentDescription(weapon.description),
        meta: weapon.rarity,
      })
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
    const cardH = 76
    const bg = this.add.rectangle(x, y + cardH / 2, cardW, cardH, params.selected ? 0x1e3150 : UI_EDGE_BUTTON_FILL, params.selected ? 0.88 : 0.66)
      .setStrokeStyle(
        params.selected ? UI_ACTIVE_STROKE_WIDTH : UI_EDGE_BUTTON_STROKE_WIDTH,
        params.selected ? UI_ACTIVE_STROKE_COLOR : params.borderColor,
        params.selected ? UI_ACTIVE_STROKE_ALPHA : 0.54,
      )
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
    const iconBg = this.add.circle(x - cardW / 2 + 30, y + 27, 18, params.iconColor, 0.2)
    const icon = this.add.text(x - cardW / 2 + 30, y + 24, params.icon, { fontSize: '18px' }).setOrigin(0.5)
    const name = this.add.text(x - cardW / 2 + 52, y + 10, params.name, {
      fontSize: '15px', color: '#ffffff', fontStyle: params.selected ? 'bold' : '', wordWrap: { width: cardW - 70 },
    })
    const effect = this.add.text(x - cardW / 2 + 52, y + 31, params.description, {
      fontSize: '13px', color: '#9fb0c8', wordWrap: { width: cardW - 70 },
    })
    const meta = this.add.text(x + cardW / 2 - 10, y + 10, params.meta, {
      fontSize: '12px', color: params.metaColor, fontStyle: 'bold',
    }).setOrigin(1, 0)
    const objects: Phaser.GameObjects.GameObject[] = [bg, iconBg, icon, name, effect, meta]
    parent.add(objects)
    return objects
  }

  private createListRow(
    parent: Phaser.GameObjects.Container,
    params: {
      x: number
      y: number
      w: number
      h: number
      icon: string
      iconColor: number
      title: string
      detail: string
      meta?: string
      enabled?: boolean
      onClick?: () => void
      onDragDelta?: (delta: number) => void
    },
  ) {
    const { x, y, w, h } = params
    const enabled = params.enabled ?? true
    const bg = this.add.rectangle(x + w / 2, y + h / 2, w, h, UI_EDGE_BUTTON_FILL, enabled ? 0.36 : 0.18)
    const line = this.add.rectangle(x + w / 2, y + h - 1, w - 24, 1, 0x8aa0bb, enabled ? 0.18 : 0.08)
    if (enabled && (params.onClick || params.onDragDelta)) {
      let downY = 0
      let moved = 0
      let pressed = false
      bg.setInteractive({ useHandCursor: !!params.onClick })
      bg.on('pointerdown', (p: Phaser.Input.Pointer) => {
        downY = p.y
        moved = 0
        pressed = true
        bg.setFillStyle(0x132137, 0.58)
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
        bg.setFillStyle(UI_EDGE_BUTTON_FILL, 0.36)
      })
      bg.on('pointerout', () => {
        pressed = false
        bg.setFillStyle(UI_EDGE_BUTTON_FILL, 0.36)
      })
    }
    const icon = this.add.text(x + 34, y + h / 2 - 2, params.icon, {
      fontSize: '19px',
      color: enabled ? '#ffffff' : '#667188',
      fontStyle: 'bold',
    }).setOrigin(0.5)
    const textBlockY = y + h / 2 - 19
    const title = this.add.text(x + 66, textBlockY, params.title, {
      fontSize: '17px',
      color: enabled ? '#ffffff' : '#778294',
      fontStyle: 'bold',
    })
    const detail = this.add.text(x + 66, textBlockY + 24, params.detail, {
      fontSize: '15px',
      color: enabled ? '#9fb0c8' : '#667188',
    })
    const objects: Phaser.GameObjects.GameObject[] = [bg, line, icon, title, detail]
    if (params.meta) {
      const meta = this.add.text(x + w - 12, y + h / 2 - 1, params.meta, {
        fontSize: '14px',
        color: enabled ? '#ffdd88' : '#778294',
        fontStyle: 'bold',
      }).setOrigin(1, 0.5)
      objects.push(meta)
    }
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

  private bindTapOnly(target: Phaser.GameObjects.GameObject, onTap: () => void) {
    let pressed = false
    let downY = 0
    let moved = 0
    target.on('pointerdown', (p: Phaser.Input.Pointer) => {
      pressed = true
      downY = p.y
      moved = 0
    })
    target.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!pressed) return
      moved = Math.max(moved, Math.abs(p.y - downY))
    })
    target.on('pointerup', () => {
      if (pressed && moved < 8) onTap()
      pressed = false
    })
    target.on('pointerout', () => { pressed = false })
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

  private compactEquipmentDescription(description: string) {
    return description
      .replace(/攻撃力/g, '攻撃')
      .replace(/クールタイム/g, '冷却')
      .replace(/索敵範囲/g, '範囲')
      .replace(/会心率/g, '会心')
      .replace(/(攻撃|冷却|範囲|会心)\s+([+-])/g, '$1$2')
      .replace(/\s*\/\s*/g, '　')
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
      const y = CONTENT_TOP + 18 + i * 78
      this.createEdgeButton(c, {
        x: -10,
        y,
        w: 318,
        h: 66,
        title: item.title,
        desc: item.desc,
        icon: item.icon,
        slideDelay: i * UI_EDGE_BUTTON_SLIDE_STAGGER,
        onTap: () => {
          this.shopMode = item.mode
          this.rebuildPanel(3, this.buildShopPanel())
          this.panels[3].setVisible(true)
        },
      })
    })
  }

  private createEdgeButton(
    c: Phaser.GameObjects.Container,
    opts: {
      x: number
      y: number
      w: number
      h: number
      title: string
      desc?: string
      icon?: string
      accent?: number
      enabled?: boolean
      slideDelay?: number
      onTap: () => void
    },
  ): Phaser.GameObjects.Container {
    const accent = opts.accent ?? UI_EDGE_BUTTON_ACCENT
    const enabled = opts.enabled ?? true
    const button = this.add.container(0, 0)
    const g = this.add.graphics()
    const drawButton = (pressed: boolean) => {
      g.clear()
      g.fillStyle(UI_EDGE_BUTTON_FILL, UI_EDGE_BUTTON_FILL_ALPHA)
      g.fillRect(opts.x, opts.y, opts.w, opts.h)
      g.lineStyle(
        pressed && enabled ? UI_ACTIVE_STROKE_WIDTH : UI_EDGE_BUTTON_STROKE_WIDTH,
        pressed && enabled ? UI_ACTIVE_STROKE_COLOR : accent,
        pressed && enabled ? UI_ACTIVE_STROKE_ALPHA : UI_EDGE_BUTTON_STROKE_ALPHA,
      )
      g.strokeRect(opts.x, opts.y, opts.w, opts.h)
      g.fillStyle(accent, enabled ? UI_EDGE_BUTTON_ACCENT_ALPHA : 0.16)
      g.fillRect(opts.x, opts.y + 8, 4, opts.h - 16)
    }
    drawButton(false)

    const hit = this.add.rectangle(opts.x + opts.w / 2, opts.y + opts.h / 2, opts.w, opts.h, 0x000000, 0.001)
    if (enabled) hit.setInteractive({ useHandCursor: true })
    const icon = this.add.text(opts.x + 34, opts.y + opts.h / 2 - 1, opts.icon ?? '', {
      fontSize: '18px',
      color: enabled ? '#ffdd88' : '#667188',
      fontStyle: 'bold',
    }).setOrigin(0.5)
    const title = this.add.text(opts.x + 62, opts.y + 12, opts.title, {
      fontSize: '20px',
      color: enabled ? '#ffffff' : '#7f889a',
      fontStyle: 'bold',
    })
    const desc = this.add.text(opts.x + 62, opts.y + 39, opts.desc ?? '', {
      fontSize: '15px',
      color: enabled ? '#9fb0c8' : '#687386',
      wordWrap: { width: opts.w - 98, useAdvancedWrap: true },
    })
    if (enabled) {
      hit.on('pointerdown', () => drawButton(true))
      hit.on('pointerup', () => drawButton(false))
      hit.on('pointerout', () => drawButton(false))
      this.bindTapOnly(hit, opts.onTap)
    }
    button.add([g, hit, icon, title, desc])
    c.add(button)
    button.x = -UI_EDGE_BUTTON_SLIDE_OFFSET
    button.setAlpha(0)
    this.tweens.add({
      targets: button,
      x: 0,
      alpha: 1,
      duration: UI_EDGE_BUTTON_SLIDE_DURATION,
      delay: opts.slideDelay ?? 0,
      ease: 'Cubic.easeOut',
    })
    return button
  }

  private buildShopBackButton(c: Phaser.GameObjects.Container) {
    const back = this.add.text(34, CONTENT_TOP + 2, '< \u623b\u308b', {
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
    RESEARCH_ITEMS.forEach((item, i) => {
      const y = CONTENT_TOP + 38 + i * 78
      this.createResearchButton(c, item, y, i)
    })
    this.createResearchResetButton(c, CONTENT_TOP + 38 + RESEARCH_ITEMS.length * 78, RESEARCH_ITEMS.length)
  }

  private createResearchResetButton(parent: Phaser.GameObjects.Container, y: number, index: number) {
    const refund = this.calcResearchRefund()
    const canReset = refund > 0
    this.createEdgeButton(parent, {
      x: -10,
      y,
      w: GAME_W - 20,
      h: 66,
      icon: '↺',
      title: '強化のやり直し',
      desc: canReset ? `研究を初期化して ${refund} CREDIT を返却` : '初期化できる研究はありません',
      accent: 0xcc8866,
      enabled: canReset,
      slideDelay: index * UI_EDGE_BUTTON_SLIDE_STAGGER,
      onTap: () => this.showResearchResetConfirm(refund),
    })
  }

  private createResearchButton(parent: Phaser.GameObjects.Container, item: ResearchItem, y: number, index: number) {
    const level = Number(this.save.upgrades[item.id] ?? 0)
    const maxed = level >= item.maxLevel
    const cost = item.cost(level)
    const canBuy = !maxed && this.save.credits >= cost
    const state = maxed ? `Lv.${level}/${item.maxLevel} MAX` : `Lv.${level}/${item.maxLevel}  ${cost} CREDIT`
    this.createEdgeButton(parent, {
      x: -10,
      y,
      w: GAME_W - 20,
      h: 66,
      icon: item.icon,
      title: item.name,
      desc: `${state}　${item.valueText(level)}${maxed ? '' : ` -> ${item.nextText(level)}`}`,
      enabled: canBuy,
      slideDelay: index * UI_EDGE_BUTTON_SLIDE_STAGGER,
      onTap: () => this.showResearchConfirm(item, level, cost),
    })
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

  private buildFilePanel(): Phaser.GameObjects.Container {
    const c = this.add.container(0, 0)
    this.save = this.loadSave()

    this.addFileModeButton(c, GAME_W / 2 - 62, CONTENT_TOP + 8, 'アイテム', 'items')
    this.addFileModeButton(c, GAME_W / 2 + 62, CONTENT_TOP + 8, '敵', 'enemies')

    if (this.fileMode === 'items') this.buildItemInventory(c, 44)
    else this.buildEnemyFileList(c, 44)

    return c
  }

  private addFileModeButton(
    c: Phaser.GameObjects.Container,
    x: number,
    y: number,
    label: string,
    mode: FileMode,
  ) {
    const selected = this.fileMode === mode
    const bg = this.add.rectangle(x, y, 108, 30, selected ? 0x1a2a44 : 0x0c1322, selected ? 0.8 : 0.42)
      .setStrokeStyle(1, selected ? 0x8ad7ff : 0x3a465f, selected ? 0.7 : 0.3)
      .setInteractive({ useHandCursor: true })
    const text = this.add.text(x, y, label, {
      fontSize: '14px',
      color: selected ? '#ffffff' : '#a9b1bf',
      fontStyle: selected ? 'bold' : '',
    }).setOrigin(0.5)
    bg.on('pointerdown', () => {
      this.fileMode = mode
      this.rebuildPanel(4, this.buildFilePanel())
      this.panels[4].setVisible(true)
    })
    c.add([bg, text])
  }

  private buildEnemyFileList(c: Phaser.GameObjects.Container, topOffset = 0) {
    const list = this.add.container(0, 0)
    c.add(list)

    const viewTop = CONTENT_TOP + 8 + topOffset
    const viewBottom = GAME_H - TAB_H - 8
    const viewHeight = viewBottom - viewTop
    const enemyList = Object.values(ENEMIES)
    const rowH = 68
    const contentHeight = enemyList.length * rowH + 8
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
      const x = 0
      const y = CONTENT_TOP + 10 + topOffset + i * rowH
      const color = enemy.color ?? 0x667788
      this.createListRow(list, {
        x,
        y,
        w: GAME_W,
        h: rowH,
        icon: enemy.emoji,
        iconColor: color,
        title: enemy.name,
        detail: `HP ${enemy.hp}　SPD ${enemy.speed}`,
      })
    })

    if (maxScroll > 0) {
      c.add(this.add.text(GAME_W - 24, viewBottom - 8, '▼', { fontSize: '14px', color: '#556680' }).setOrigin(0.5))
    }

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
    const dialogY = Math.round(GAME_H / 2 - UI_DIALOG_H / 2)
    const bg = this.add.graphics()
    bg.fillStyle(UI_DIALOG_FILL, UI_DIALOG_FILL_ALPHA)
    bg.fillRect(UI_DIALOG_X, dialogY, UI_DIALOG_W, UI_DIALOG_H)
    bg.lineStyle(UI_EDGE_BUTTON_STROKE_WIDTH, UI_DIALOG_STROKE_COLOR, UI_DIALOG_STROKE_ALPHA)
    bg.strokeRect(UI_DIALOG_X, dialogY, UI_DIALOG_W, UI_DIALOG_H)
    bg.fillStyle(UI_DIALOG_STROKE_COLOR, UI_EDGE_BUTTON_ACCENT_ALPHA)
    bg.fillRect(UI_DIALOG_X, dialogY + 12, 4, UI_DIALOG_H - 24)

    const msg = this.add.text(GAME_W / 2, dialogY + 34, message, {
      fontSize: '19px',
      color: '#ffffff',
      align: 'center',
      lineSpacing: 8,
      wordWrap: { width: UI_DIALOG_W - 44, useAdvancedWrap: true },
    }).setOrigin(0.5, 0)
    const yes = this.createDialogButton(UI_DIALOG_X + 24, dialogY + UI_DIALOG_H - 70, 196, 50, 'はい', UI_EDGE_BUTTON_ACCENT)
    const no = this.createDialogButton(UI_DIALOG_X + UI_DIALOG_W - 220, dialogY + UI_DIALOG_H - 70, 196, 50, 'いいえ', 0x667788)
    const stop = (_p: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => event.stopPropagation()
    veil.on('pointerdown', stop)
    veil.on('pointerup', stop)
    yes.hit.on('pointerdown', stop)
    yes.hit.on('pointerup', (_p: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation()
      overlay.destroy()
      onYes()
    })
    no.hit.on('pointerdown', stop)
    no.hit.on('pointerup', (_p: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation()
      overlay.destroy()
    })
    overlay.add([veil, bg, msg, yes.container, no.container])
  }

  private createDialogButton(x: number, y: number, w: number, h: number, label: string, accent: number) {
    const container = this.add.container(0, 0)
    const g = this.add.graphics()
    const draw = (pressed: boolean) => {
      g.clear()
      g.fillStyle(UI_EDGE_BUTTON_FILL, UI_EDGE_BUTTON_FILL_ALPHA)
      g.fillRect(x, y, w, h)
      g.lineStyle(
        pressed ? UI_ACTIVE_STROKE_WIDTH : UI_EDGE_BUTTON_STROKE_WIDTH,
        pressed ? UI_ACTIVE_STROKE_COLOR : accent,
        pressed ? UI_ACTIVE_STROKE_ALPHA : UI_EDGE_BUTTON_STROKE_ALPHA,
      )
      g.strokeRect(x, y, w, h)
      g.fillStyle(accent, UI_EDGE_BUTTON_ACCENT_ALPHA)
      g.fillRect(x, y + 8, 4, h - 16)
    }
    draw(false)
    const hit = this.add.rectangle(x + w / 2, y + h / 2, w, h, 0x000000, 0.001)
      .setInteractive({ useHandCursor: true })
    const text = this.add.text(x + w / 2, y + h / 2, label, {
      fontSize: '19px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5)
    hit.on('pointerdown', () => draw(true))
    hit.on('pointerup', () => draw(false))
    hit.on('pointerout', () => draw(false))
    container.add([g, hit, text])
    return { container, hit }
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
