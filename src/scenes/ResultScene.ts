import Phaser from 'phaser'
import { GAME_W, GAME_H } from '../constants'
import { STAGES } from '../data/stages'
import { CHARACTERS } from '../data/characters'
import { RARITY_COLORS, WEAPONS } from '../data/weapons'
import { addCredits, addOwnedWeapons, loadSave, markStageCleared } from '../systems/SaveData'
import type { CharacterDamageStat } from '../types'

const SIDE_FRAME_X = GAME_W - 100
const SIDE_FRAME_Y = 292
const SIDE_FRAME_W = 150
const SIDE_FRAME_H = 230
const SIDE_FRAME_FILL = 0x101827

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

    this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x0a0a1a)
    this.add.rectangle(GAME_W / 2, 120, GAME_W, 190, victory ? 0x201b30 : 0x25151d, 0.9)

    this.add.text(GAME_W / 2, 70, victory ? 'STAGE CLEAR' : 'MISSION FAILED', {
      fontSize: '36px',
      color: victory ? '#ffdd66' : '#ff6677',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5)

    this.add.text(GAME_W / 2, 112, stage.name, {
      fontSize: '20px',
      color: '#ffffff',
    }).setOrigin(0.5)

    this.buildCharacterArea(victory)
    this.buildRewardPanel(victory, creditReward, killCount, level, droppedWeapons)
    this.buildDamagePanel(damageStats)
    this.buildButtons(victory, stageId)
  }

  private buildCharacterArea(victory: boolean) {
    const portraitX = SIDE_FRAME_X
    const portraitY = SIDE_FRAME_Y
    const accent = victory ? 0xffdd66 : 0x774455

    this.add.rectangle(portraitX, portraitY, SIDE_FRAME_W, SIDE_FRAME_H, SIDE_FRAME_FILL)
      .setStrokeStyle(2, accent)
    this.add.rectangle(portraitX, portraitY - SIDE_FRAME_H / 2 + 2, SIDE_FRAME_W - 12, 3, accent, 0.75)
    const maskShape = this.add.graphics().setVisible(false)
    maskShape.fillStyle(0xffffff)
    maskShape.fillRect(
      portraitX - SIDE_FRAME_W / 2 + 4,
      portraitY - SIDE_FRAME_H / 2 + 4,
      SIDE_FRAME_W - 8,
      SIDE_FRAME_H - 8,
    )
    const portrait = this.add.image(portraitX + 8, portraitY + 8, 'home_portrait')
      .setScale(0.2)
    portrait.setMask(maskShape.createGeometryMask())
    this.add.rectangle(portraitX, portraitY + 92, SIDE_FRAME_W - 18, 50, 0x07101a, 0.68)
    this.add.text(portraitX, portraitY + 82, 'アサルト型', {
      fontSize: '16px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5)
    this.add.text(portraitX, portraitY + 106, '立ち絵仮置き', {
      fontSize: '15px',
      color: '#667788',
    }).setOrigin(0.5)

    const line = victory
      ? '回収完了。装備もクレジットも、次の強化に使えます。'
      : '撤退します。回収できた分だけでも、次に繋げましょう。'
    const bubbleY = 458
    this.add.rectangle(GAME_W / 2, bubbleY, GAME_W - 48, 70, 0xffffff)
      .setStrokeStyle(3, victory ? 0xffdd66 : 0xff8899)
    this.add.text(GAME_W / 2, bubbleY, line, {
      fontSize: '14px',
      color: '#2a1a12',
      align: 'center',
      wordWrap: { width: GAME_W - 84 },
    }).setOrigin(0.5)
  }

  private buildRewardPanel(
    victory: boolean,
    creditReward: number,
    killCount: number,
    level: number,
    droppedWeapons: string[],
  ) {
    const x = 28
    const y = 170
    const w = 260
    const h = 226
    this.add.rectangle(x + w / 2, y + h / 2, w, h, 0x111a33)
      .setStrokeStyle(2, victory ? 0x445577 : 0x553344)

    this.add.text(x + 18, y + 16, '獲得報酬', {
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold',
    })

    this.add.rectangle(x + 130, y + 62, 220, 46, 0x1b2744)
      .setStrokeStyle(1, 0x445577)
    this.add.text(x + 38, y + 50, 'CREDIT', {
      fontSize: '14px',
      color: '#8899aa',
    })
    this.add.text(x + 238, y + 50, `+${creditReward}`, {
      fontSize: '24px',
      color: '#ffdd88',
      fontStyle: 'bold',
    }).setOrigin(1, 0)

    this.add.text(x + 18, y + 100, `撃破数  ${killCount}`, {
      fontSize: '15px',
      color: '#aabbcc',
    })
    this.add.text(x + 142, y + 100, `到達Lv  ${level}`, {
      fontSize: '15px',
      color: '#aabbcc',
    })

    this.add.text(x + 18, y + 134, '入手装備', {
      fontSize: '15px',
      color: '#ffffff',
      fontStyle: 'bold',
    })

    if (droppedWeapons.length === 0) {
      this.add.text(x + 130, y + 176, 'なし', {
        fontSize: '18px',
        color: '#556677',
      }).setOrigin(0.5)
      return
    }

    droppedWeapons.slice(0, 3).forEach((weaponId, i) => {
      const weapon = WEAPONS[weaponId]
      if (!weapon) return
      const cardY = y + 166 + i * 40
      const color = RARITY_COLORS[weapon.rarity]
      this.add.rectangle(x + 130, cardY, 220, 32, 0x0f1828)
        .setStrokeStyle(1, color)
      this.add.text(x + 30, cardY - 10, weapon.emoji, {
        fontSize: '18px',
      })
      this.add.text(x + 56, cardY - 11, `${weapon.rarity} ${weapon.name}`, {
        fontSize: '14px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      this.add.text(x + 56, cardY + 4, weapon.description, {
        fontSize: '15px',
        color: '#88aacc',
      })
    })
  }

  private buildDamagePanel(damageStats: CharacterDamageStat[]) {
    const x = 28
    const y = 512
    const w = GAME_W - 56
    const h = 154
    this.add.rectangle(x + w / 2, y + h / 2, w, h, 0x101827)
      .setStrokeStyle(2, 0x334466)

    this.add.text(x + 18, y + 14, '総ダメージ', {
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold',
    })

    if (damageStats.length === 0) {
      this.add.text(x + w / 2, y + 84, '記録なし', {
        fontSize: '16px',
        color: '#667788',
      }).setOrigin(0.5)
      return
    }

    const maxDamage = Math.max(1, ...damageStats.map(s => s.damage))
    damageStats.slice(0, 5).forEach((stat, i) => {
      const ch = CHARACTERS[stat.characterId]
      if (!ch) return
      const rowY = y + 48 + i * 20
      const barW = Math.max(4, Math.round((stat.damage / maxDamage) * 142))
      this.add.text(x + 18, rowY - 8, ch.emoji, {
        fontSize: '16px',
      })
      this.add.text(x + 44, rowY - 7, ch.name, {
        fontSize: '14px',
        color: '#dce8ff',
        fontStyle: 'bold',
      })
      this.add.rectangle(x + 206, rowY, 150, 8, 0x1b2744)
      this.add.rectangle(x + 136 + barW / 2, rowY, barW, 8, 0x66ddff, 0.85)
      this.add.text(x + w - 18, rowY - 8, `${stat.damage}`, {
        fontSize: '15px',
        color: '#ffffff',
        fontStyle: 'bold',
      }).setOrigin(1, 0)
    })
  }

  private buildButtons(victory: boolean, stageId: string) {
    const back = this.add.rectangle(GAME_W / 2, GAME_H - 82, 230, 48, 0x224488)
      .setStrokeStyle(2, 0x4488ff)
      .setInteractive({ useHandCursor: true })
    this.add.text(GAME_W / 2, GAME_H - 82, '拠点に戻る', {
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5)
    back.on('pointerdown', () => this.scene.start('HomeScene'))
    back.on('pointerover', () => back.setFillStyle(0x3366aa))
    back.on('pointerout', () => back.setFillStyle(0x224488))

    if (!victory) {
      const retry = this.add.rectangle(GAME_W / 2, GAME_H - 28, 230, 38, 0x442222)
        .setStrokeStyle(2, 0x884444)
        .setInteractive({ useHandCursor: true })
      this.add.text(GAME_W / 2, GAME_H - 28, 'リトライ', {
        fontSize: '15px',
        color: '#ffffff',
      }).setOrigin(0.5)
      retry.on('pointerdown', () => this.scene.start('BattleScene', { stageId }))
      retry.on('pointerover', () => retry.setFillStyle(0x663333))
      retry.on('pointerout', () => retry.setFillStyle(0x442222))
    }
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
