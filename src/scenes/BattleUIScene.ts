import Phaser from 'phaser'
import { applyRenderScale } from '../utils/display'
import type { UpgradeOption } from '../types'
import { mountDomScreen, mountDomShell, unmountDomScreen, unmountDomShell } from '../ui/dom/mount'
import { mountBattleHudScreen, type BattleHudScreenHandle } from '../ui/dom/BattleHudScreen'
import { mountLevelUpScreen } from '../ui/dom/LevelUpScreen'
import type { BattleScene } from './BattleScene'

export class BattleUIScene extends Phaser.Scene {
  private battle!: BattleScene
  private hud?: BattleHudScreenHandle
  private levelUpVisible = false

  constructor() { super({ key: 'BattleUIScene', active: false }) }

  init(data: { battle: BattleScene }) {
    this.battle = data.battle
  }

  create() {
    applyRenderScale(this)
    this.hud = mountDomShell(root => mountBattleHudScreen(root, {
      onTogglePause: () => {
        this.battle.toggleUserPause()
        this.onUpdate()
      },
      onCycleSpeed: () => {
        this.battle.cycleSpeed()
        this.onUpdate()
      },
    })) as BattleHudScreenHandle

    this.battle.events.on('battleUpdate', this.onUpdate, this)
    this.battle.events.on('expChanged', this.onUpdate, this)
    this.battle.events.on('levelUp', this.showLevelUpUI, this)
    this.battle.events.on('levelUpDone', this.hideLevelUpUI, this)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroyDomUi())

    this.onUpdate()
  }

  private onUpdate() {
    const levelUp = this.battle.levelUpManager
    const barricade = this.battle.barricade
    this.hud?.setState({
      level: levelUp.level,
      expRatio: levelUp.getExpRatio(),
      hp: barricade.hp,
      maxHp: barricade.maxHp,
      elapsedMs: this.battle.elapsedMs,
      paused: this.battle.isPausedByUser,
      speed: this.battle.currentSpeed,
    })
  }

  private showLevelUpUI(choices: UpgradeOption[]) {
    if (this.levelUpVisible) return
    this.levelUpVisible = true
    mountDomScreen(root => mountLevelUpScreen(root, {
      choices,
      onSelect: id => this.battle.applyUpgrade(id),
    }))
  }

  private hideLevelUpUI() {
    unmountDomScreen()
    this.levelUpVisible = false
    this.onUpdate()
  }

  shutdown() {
    this.destroyDomUi()
  }

  private destroyDomUi() {
    this.battle.events.off('battleUpdate', this.onUpdate, this)
    this.battle.events.off('expChanged', this.onUpdate, this)
    this.battle.events.off('levelUp', this.showLevelUpUI, this)
    this.battle.events.off('levelUpDone', this.hideLevelUpUI, this)
    unmountDomScreen()
    unmountDomShell()
    this.hud = undefined
    this.levelUpVisible = false
  }
}
