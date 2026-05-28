import Phaser from 'phaser'
import { GAME_W, GAME_H } from '../constants'
import { applyRenderScale, logicalPointer } from '../utils/display'
import { loadSave, saveGame } from '../systems/SaveData'
import { LobbyLineSelector } from '../systems/LobbyLineSelector'
import type { GameSave } from '../types'
import { mountDomScreen, mountDomShell, syncUiRoot, unmountDomScreen, unmountDomShell } from '../ui/dom/mount'
import { mountFileScreen } from '../ui/dom/FileScreen'
import { mountStageScreen } from '../ui/dom/StageScreen'
import { mountShopScreen } from '../ui/dom/ShopScreen'
import { mountCharacterScreen } from '../ui/dom/CharacterScreen'
import { mountLobbyStandeeScreen, type LobbyStandeeScreenHandle } from '../ui/dom/LobbyStandeeScreen'
import { mountHomeShell, type HomeShellHandle } from '../ui/dom/HomeShell'

type ShopMode = 'menu' | 'buy' | 'sell' | 'upgrade' | 'research'
type FileMode = 'items' | 'enemies'

export class HomeScene extends Phaser.Scene {
  private save!: GameSave
  private panels: Phaser.GameObjects.Container[] = []
  private homeShell?: HomeShellHandle
  private lobbyScreen?: LobbyStandeeScreenHandle
  private hubHomeContainer?: Phaser.GameObjects.Container
  private lobbyMessageTimer?: Phaser.Time.TimerEvent
  private lobbyLineSelector = new LobbyLineSelector()
  private inHubMenu = false
  private activeTab = 0
  private selectedCharacterId = 'assault'
  private shopMode: ShopMode = 'menu'
  private fileMode: FileMode | null = null
  private playLobbyReturnIntro = false

  constructor() { super('HomeScene') }

  create(data?: { fromBattle?: boolean }) {
    applyRenderScale(this)
    this.save = this.loadSave()
    this.panels = []
    this.activeTab = 2
    this.playLobbyReturnIntro = !!data?.fromBattle
    this.inHubMenu = false
    this.selectedCharacterId = 'assault'
    this.shopMode = 'menu'
    this.fileMode = null

    this.buildBaseBackground()
    this.panels.push(this.buildStagePanel())
    this.panels.push(this.buildCharPanel())
    this.panels.push(this.add.container(0, 0))
    this.panels.push(this.buildShopPanel())
    this.panels.push(this.buildFilePanel())

    this.homeShell = mountDomShell(root => mountHomeShell(root, {
      activeTab: this.activeTab,
      credits: this.save.credits,
      onSelectTab: index => this.switchTab(index),
    })) as HomeShellHandle
    this.panels.forEach(panel => panel.setVisible(false))
    this.buildHubHome()
    this.installTapSparkle()
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      unmountDomScreen()
      unmountDomShell()
    })
  }

  private installTapSparkle() {
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      const pos = logicalPointer(p)
      this.spawnTapSparkle(pos.x, pos.y)
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
    if (index !== 0 && index !== 1 && index !== 3 && index !== 4) unmountDomScreen()
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
    if (index === 0) this.mountStageDom()
    if (index === 1) this.mountCharacterDom()
    if (index === 3) this.mountShopDom()
    if (index === 4) this.mountFileDom()
    this.updateNavSelection(index)
  }

  private updateNavSelection(index: number) {
    this.activeTab = index
    this.homeShell?.setActiveTab(index)
  }

  private enterHubMenu() {
    if (this.inHubMenu) return
    this.inHubMenu = true
    this.hubHomeContainer?.setVisible(false)
  }

  private returnToHubHome() {
    unmountDomScreen()
    this.inHubMenu = false
    this.panels.forEach(panel => panel.setVisible(false))
    this.hubHomeContainer?.setVisible(true)
    this.mountLobbyStandee(false)
  }

  private refreshTopStatus() {
    this.homeShell?.setCredits(this.loadSave().credits)
  }

  private buildBaseBackground() {
    const bg = this.add.image(GAME_W / 2, GAME_H / 2, 'home_base_bg').setOrigin(0.5).setDepth(-20)
    const src = bg.texture.getSourceImage() as HTMLImageElement | HTMLCanvasElement
    const scale = Math.max(GAME_W / src.width, GAME_H / src.height)
    bg.setScale(scale)
  }

  private buildHubHome() {
    const c = this.add.container(0, 0)
    this.hubHomeContainer = c
    const returningFromBattle = this.playLobbyReturnIntro
    this.mountLobbyStandee(returningFromBattle)
    if (this.playLobbyReturnIntro) {
      this.playLobbyReturnIntro = false
      this.time.delayedCall(1050, () => {
        this.showLobbyMessage('帰還しました。装備と研究を確認して、次の出撃に備えましょう。')
      })
    } else {
      this.showLobbyMessage('次の出撃に備えています。必要なら装備と研究を確認してください。')
    }
    if (returningFromBattle) {
      this.time.delayedCall(1060, () => this.showLobbyMessage(this.pickLobbyLine('return')))
    } else {
      this.showLobbyMessage(this.pickLobbyLine('idle'))
    }
  }

  private pickLobbyLine(trigger: 'idle' | 'tap' | 'return') {
    this.save = this.loadSave()
    return this.lobbyLineSelector.pick(this.save, trigger)
  }

  private showLobbyMessage(text: string, duration = 5200) {
    if (!this.lobbyScreen) return
    this.lobbyMessageTimer?.remove(false)
    this.lobbyScreen.setMessage(text)
    this.lobbyMessageTimer = this.time.delayedCall(duration, () => {
      this.lobbyScreen?.hideMessage()
    })
  }

  private rebuildPanel(index: number, next: Phaser.GameObjects.Container) {
    this.panels[index].destroy()
    this.panels[index] = next
  }

  private buildStagePanel(): Phaser.GameObjects.Container {
    return this.add.container(0, 0)
  }

  private buildCharPanel(): Phaser.GameObjects.Container {
    return this.add.container(0, 0)
  }

  private buildShopPanel(): Phaser.GameObjects.Container {
    return this.add.container(0, 0)
  }

  private buildFilePanel(): Phaser.GameObjects.Container {
    return this.add.container(0, 0)
  }

  private mountStageDom() {
    syncUiRoot()
    mountDomScreen(root => mountStageScreen(root, {
      onStartStage: stageId => {
        unmountDomScreen()
        this.scene.start('BattleScene', { stageId })
      },
    }))
  }

  private mountLobbyStandee(returning: boolean) {
    syncUiRoot()
    this.lobbyScreen = mountDomScreen(root => mountLobbyStandeeScreen(root, {
      returning,
      onTap: () => this.showLobbyMessage(this.pickLobbyLine('tap')),
    })) as LobbyStandeeScreenHandle
  }

  private mountShopDom() {
    syncUiRoot()
    mountDomScreen(root => mountShopScreen(root, {
      initialMode: this.shopMode,
      onSaveChanged: () => {
        this.save = this.loadSave()
        this.refreshTopStatus()
      },
    }))
  }

  private mountCharacterDom() {
    syncUiRoot()
    mountDomScreen(root => mountCharacterScreen(root, {
      initialCharacterId: this.selectedCharacterId,
      onCharacterChanged: id => {
        this.selectedCharacterId = id
      },
      onSaveChanged: () => {
        this.save = this.loadSave()
        this.refreshTopStatus()
      },
    }))
  }

  private mountFileDom() {
    syncUiRoot()
    mountDomScreen(root => mountFileScreen(root, { initialMode: this.fileMode }))
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
