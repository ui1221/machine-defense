import Phaser from 'phaser'
import { GAME_H, GAME_W } from '../constants'
import { STAGES } from '../data/stages'
import { stageBackgroundKey } from '../data/stageBackgrounds'
import { addCredits, addOwnedWeapons, loadSave, markStageCleared } from '../systems/SaveData'
import type { CharacterDamageStat } from '../types'
import { mountDomScreen, unmountDomScreen, unmountDomShell } from '../ui/dom/mount'
import { mountResultScreen } from '../ui/dom/ResultScreen'
import { applyRenderScale } from '../utils/display'

interface ResultData {
  victory: boolean
  stageId: string
  killCount: number
  level: number
  droppedWeapons: string[]
  damageStats?: CharacterDamageStat[]
}

export class ResultScene extends Phaser.Scene {
  constructor() { super('ResultScene') }

  create(data: ResultData) {
    applyRenderScale(this)
    unmountDomShell()
    const { victory, stageId, killCount, level, droppedWeapons = [], damageStats = [] } = data
    const stage = STAGES.find(s => s.id === stageId) ?? STAGES[0]
    const researchBonus = 1 + loadSave().upgrades.researchLevel * 0.02
    const creditReward = Math.round(this.calcCreditReward(victory, stage.difficulty, killCount, stageId) * researchBonus)

    if (victory) markStageCleared(stageId)
    if (droppedWeapons.length > 0) addOwnedWeapons(droppedWeapons)
    addCredits(creditReward)

    this.buildBackground(stageId)
    mountDomScreen(root => mountResultScreen(root, {
      victory,
      stageName: stage.name,
      creditReward,
      killCount,
      level,
      droppedWeapons,
      damageStats,
      onRetry: () => {
        unmountDomScreen()
        this.scene.start('BattleScene', { stageId })
      },
      onHome: () => {
        unmountDomScreen()
        this.scene.start('HomeScene', { fromBattle: true })
      },
    }))

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      unmountDomScreen()
    })
  }

  private buildBackground(stageId: string) {
    const bgKey = stageBackgroundKey(stageId)
    if (bgKey && this.textures.exists(bgKey)) {
      const bg = this.add.image(GAME_W / 2, GAME_H / 2, bgKey).setOrigin(0.5).setDepth(-20)
      const src = bg.texture.getSourceImage() as HTMLImageElement | HTMLCanvasElement
      bg.setScale(Math.max(GAME_W / src.width, GAME_H / src.height))
    } else {
      this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x071018).setDepth(-20)
    }
    this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x06101a, 0.56).setDepth(-19)
    this.add.rectangle(GAME_W / 2, 58, GAME_W, 116, 0x02060c, 0.54).setDepth(-18)
    this.add.rectangle(GAME_W / 2, GAME_H - 64, GAME_W, 128, 0x02060c, 0.48).setDepth(-18)
  }

  private calcCreditReward(victory: boolean, difficulty: number, killCount: number, stageId: string) {
    const stageNo = this.stageNumber(stageId)
    const progressBonus = stageNo * (victory ? 10 : 4)
    const clearBonus = victory ? 70 + difficulty * 45 + progressBonus : 20 + difficulty * 10 + progressBonus
    const killBonus = Math.floor(killCount * (victory ? 0.45 : 0.25))
    return Math.max(10, clearBonus + killBonus)
  }

  private stageNumber(stageId: string) {
    const num = Number(stageId.replace('stage_', ''))
    return Number.isFinite(num) ? num : 1
  }
}
