import Phaser from 'phaser'
import { GAME_W, GAME_H } from '../constants'
import { STAGES } from '../data/stages'
import { stageBackgroundKey } from '../data/stageBackgrounds'
import { CHARACTERS } from '../data/characters'
import { RARITY_COLORS, WEAPONS } from '../data/weapons'
import { addCredits, addOwnedWeapons, loadSave, markStageCleared } from '../systems/SaveData'
import {
  UI_EDGE_BUTTON_ACCENT_ALPHA,
  UI_EDGE_BUTTON_FILL,
  UI_EDGE_BUTTON_FILL_ALPHA,
  UI_EDGE_BUTTON_STROKE_ALPHA,
  UI_EDGE_BUTTON_STROKE_WIDTH,
} from '../ui/theme'
import type { CharacterDamageStat } from '../types'

const STANDEE_X = GAME_W - 118
const STANDEE_TOP_Y = 260
const STANDEE_DISPLAY_H = 670
const SHEET_ALPHA = 0.82
const RESULT_LABEL_X = 42
const RESULT_VALUE_X = 154
const DAMAGE_ICON_X = 52
const DAMAGE_NAME_X = 82
const DAMAGE_BAR_X = 252
const DAMAGE_BAR_W = 112
const DAMAGE_VALUE_X = GAME_W - 40

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
    const { victory, stageId, killCount, level, droppedWeapons = [], damageStats = [] } = data
    const stage = STAGES.find(s => s.id === stageId) ?? STAGES[0]
    const researchBonus = 1 + loadSave().upgrades.researchLevel * 0.02
    const creditReward = Math.round(this.calcCreditReward(victory, stage.difficulty, killCount, stageId) * researchBonus)

    if (victory) markStageCleared(stageId)
    if (droppedWeapons.length > 0) addOwnedWeapons(droppedWeapons)
    addCredits(creditReward)

    this.buildBackground(stageId)
    this.buildTitle(victory, stage.name)
    this.buildStandee(victory)
    this.buildRewardPanel(victory, creditReward, killCount, level, droppedWeapons)
    this.buildDamagePanel(damageStats)
    this.buildButtons(victory, stageId)
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

  private buildTitle(victory: boolean, stageName: string) {
    const color = victory ? '#ffdd66' : '#ff6f7f'
    this.add.text(34, 34, victory ? 'STAGE CLEAR' : 'MISSION FAILED', {
      fontSize: '31px',
      color,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 5,
    }).setDepth(10)
    this.add.text(36, 78, stageName, {
      fontSize: '18px',
      color: '#d8e6ff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    }).setDepth(10)
  }

  private buildStandee(victory: boolean) {
    const accent = victory ? 0xffee00 : 0xff6688
    const shadow = this.add.image(STANDEE_X + 14, STANDEE_TOP_Y + 10, 'home_portrait')
      .setOrigin(0.5, 0)
      .setTintFill(accent)
      .setAlpha(victory ? 0.34 : 0.3)
      .setDepth(2)
    shadow.displayHeight = STANDEE_DISPLAY_H
    shadow.scaleX = shadow.scaleY

    const portrait = this.add.image(STANDEE_X, STANDEE_TOP_Y, 'home_portrait')
      .setOrigin(0.5, 0)
      .setDepth(3)
    portrait.displayHeight = STANDEE_DISPLAY_H
    portrait.scaleX = portrait.scaleY
  }

  private buildRewardPanel(
    victory: boolean,
    creditReward: number,
    killCount: number,
    level: number,
    droppedWeapons: string[],
  ) {
    const y = 128
    const h = 176
    const accent = victory ? 0xffdd66 : 0xff7788
    const creditY = y + 66
    const statsY = y + 106
    const itemY = y + 142
    this.add.rectangle(GAME_W / 2, y + h / 2, GAME_W, h, UI_EDGE_BUTTON_FILL, SHEET_ALPHA).setDepth(5)
    this.add.rectangle(24, y + h / 2, 5, h - 24, accent, 0.86).setDepth(6)

    this.add.text(40, y + 18, '獲得報酬', {
      fontSize: '21px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
    }).setDepth(7)

    this.add.text(RESULT_LABEL_X, creditY, 'CREDIT', {
      fontSize: '16px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0, 0.5).setDepth(7)
    this.add.text(RESULT_VALUE_X, creditY, `${creditReward}`, {
      fontSize: '25px',
      color: '#ffdd88',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0, 0.5).setDepth(7)

    this.add.text(RESULT_LABEL_X, statsY, '撃破数', {
      fontSize: '17px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0, 0.5).setDepth(7)
    this.add.text(RESULT_VALUE_X, statsY, `${killCount}`, {
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0, 0.5).setDepth(7)
    this.add.text(236, statsY, '到達Lv', {
      fontSize: '17px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0, 0.5).setDepth(7)
    this.add.text(322, statsY, `${level}`, {
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0, 0.5).setDepth(7)

    this.add.text(RESULT_LABEL_X, itemY, '入手装備', {
      fontSize: '16px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0, 0.5).setDepth(7)

    if (droppedWeapons.length === 0) {
      this.add.text(RESULT_VALUE_X, itemY, 'なし', {
        fontSize: '16px',
        color: '#9fb2c8',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 3,
      }).setOrigin(0, 0.5).setDepth(7)
      return
    }

    const firstWeapon = WEAPONS[droppedWeapons[0]]
    if (!firstWeapon) return
    const color = RARITY_COLORS[firstWeapon.rarity]
    const extraCount = Math.max(0, droppedWeapons.length - 1)
    this.add.text(RESULT_VALUE_X, itemY, firstWeapon.emoji, { fontSize: '18px' }).setOrigin(0, 0.5).setDepth(7)
    this.add.text(RESULT_VALUE_X + 26, itemY, firstWeapon.name, {
      fontSize: '15px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0, 0.5).setDepth(7)
    this.add.text(RESULT_VALUE_X + 134, itemY, firstWeapon.rarity, {
      fontSize: '14px',
      color: this.hexColor(color),
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0, 0.5).setDepth(7)
    if (extraCount > 0) {
      this.add.text(RESULT_VALUE_X + 190, itemY, `ほか${extraCount}件`, {
        fontSize: '15px',
        color: '#d8e6ff',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 3,
      }).setOrigin(0, 0.5).setDepth(7)
    }
  }

  private buildDamagePanel(damageStats: CharacterDamageStat[]) {
    const y = 330
    const h = 198
    this.add.rectangle(GAME_W / 2, y + h / 2, GAME_W, h, UI_EDGE_BUTTON_FILL, SHEET_ALPHA).setDepth(5)
    this.add.rectangle(24, y + h / 2, 5, h - 24, 0x66ddff, 0.78).setDepth(6)
    this.add.text(40, y + 16, '総ダメージ', {
      fontSize: '21px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
    }).setDepth(7)

    if (damageStats.length === 0) {
      this.add.text(GAME_W / 2, y + 108, '記録なし', {
        fontSize: '17px',
        color: '#9fb2c8',
        fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(7)
      return
    }

    const maxDamage = Math.max(1, ...damageStats.map(s => s.damage))
    damageStats.slice(0, 5).forEach((stat, i) => {
      const ch = CHARACTERS[stat.characterId]
      if (!ch) return
      const rowY = y + 62 + i * 27
      const barW = Math.max(6, Math.round((stat.damage / maxDamage) * DAMAGE_BAR_W))
      this.add.text(DAMAGE_ICON_X, rowY, ch.emoji, { fontSize: '18px' }).setOrigin(0.5).setDepth(7)
      this.add.text(DAMAGE_NAME_X, rowY, ch.name, {
        fontSize: '16px',
        color: '#dce8ff',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 3,
      }).setOrigin(0, 0.5).setDepth(7)
      this.add.rectangle(DAMAGE_BAR_X, rowY, DAMAGE_BAR_W, 8, 0x1a2940, 0.9).setDepth(7)
      this.add.rectangle(DAMAGE_BAR_X - DAMAGE_BAR_W / 2 + barW / 2, rowY, barW, 8, 0x66ddff, 0.88).setDepth(8)
      this.add.text(DAMAGE_VALUE_X, rowY, `${stat.damage}`, {
        fontSize: '17px',
        color: '#ffffff',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 3,
      }).setOrigin(1, 0.5).setDepth(7)
    })
  }

  private buildButtons(victory: boolean, stageId: string) {
    if (!victory) {
      this.createResultButton(0, GAME_H - 156, 270, '再挑戦', '同じ区画にもう一度出撃する', 0xff7788, () => {
        this.scene.start('BattleScene', { stageId })
      })
    }
    this.createResultButton(0, GAME_H - 84, 270, '拠点に戻る', '報酬を確認して拠点へ戻る', 0x44ff88, () => {
      this.scene.start('HomeScene', { fromBattle: true })
    })
  }

  private createResultButton(
    x: number,
    y: number,
    w: number,
    title: string,
    desc: string,
    accent: number,
    onTap: () => void,
  ) {
    const h = 58
    const c = this.add.container(x, y).setDepth(20)
    const g = this.add.graphics()
    const draw = (pressed: boolean) => {
      g.clear()
      g.fillStyle(UI_EDGE_BUTTON_FILL, pressed ? 0.94 : UI_EDGE_BUTTON_FILL_ALPHA)
      g.fillRect(0, 0, w, h)
      g.lineStyle(UI_EDGE_BUTTON_STROKE_WIDTH, pressed ? 0xffdd66 : accent, pressed ? 0.9 : UI_EDGE_BUTTON_STROKE_ALPHA)
      g.strokeRect(0, 0, w, h)
      g.fillStyle(accent, UI_EDGE_BUTTON_ACCENT_ALPHA)
      g.fillRect(0, 10, 4, h - 20)
    }
    draw(false)
    const icon = this.add.text(22, h / 2, '>', {
      fontSize: '20px',
      color: this.hexColor(accent),
      fontStyle: 'bold',
    }).setOrigin(0.5)
    const titleText = this.add.text(54, 10, title, {
      fontSize: '20px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    })
    const descText = this.add.text(54, 34, desc, {
      fontSize: '14px',
      color: '#aebbd0',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2,
    })
    const hit = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.001)
      .setInteractive({ useHandCursor: true })
    hit.on('pointerdown', () => draw(true))
    hit.on('pointerup', () => {
      draw(false)
      onTap()
    })
    hit.on('pointerout', () => draw(false))
    c.add([g, icon, titleText, descText, hit])
    return c
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

  private hexColor(color: number) {
    return `#${color.toString(16).padStart(6, '0')}`
  }
}
