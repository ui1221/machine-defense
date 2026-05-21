import Phaser from 'phaser'
import { BARRICADE_Y, GAME_W } from '../constants'
import type { BattleScene } from './BattleScene'
import type { UpgradeOption } from '../types'
import {
  UI_ACTIVE_STROKE_ALPHA,
  UI_ACTIVE_STROKE_COLOR,
  UI_ACTIVE_STROKE_WIDTH,
  UI_DIALOG_FILL,
  UI_DIALOG_FILL_ALPHA,
  UI_DIALOG_STROKE_ALPHA,
  UI_DIALOG_STROKE_COLOR,
  UI_DIALOG_W,
  UI_DIALOG_X,
  UI_EDGE_BUTTON_ACCENT,
  UI_EDGE_BUTTON_ACCENT_ALPHA,
  UI_EDGE_BUTTON_FILL,
  UI_EDGE_BUTTON_FILL_ALPHA,
  UI_EDGE_BUTTON_STROKE_ALPHA,
  UI_EDGE_BUTTON_STROKE_WIDTH,
  UI_RARE_ACCENT,
  UI_RARE_FILL,
  UI_RARE_STROKE_COLOR,
} from '../ui/theme'

export class BattleUIScene extends Phaser.Scene {
  private battle!: BattleScene

  private expBar!: Phaser.GameObjects.Rectangle
  private levelText!: Phaser.GameObjects.Text
  private hpText!: Phaser.GameObjects.Text
  private timeText!: Phaser.GameObjects.Text
  private pauseText!: Phaser.GameObjects.Text
  private speedText!: Phaser.GameObjects.Text

  private levelUpContainer?: Phaser.GameObjects.Container

  constructor() { super({ key: 'BattleUIScene', active: false }) }

  init(data: { battle: BattleScene }) {
    this.battle = data.battle
  }

  create() {
    // 上段HUD。中央の戦場面積を守るため、情報は最上部に押し込む。
    this.levelText = this.add.text(12, 7, 'Lv.0', {
      fontSize: '16px', color: '#ffdd44', fontStyle: 'bold',
    }).setDepth(101)

    this.timeText = this.add.text(GAME_W - 12, 7, '00:00', {
      fontSize: '14px', color: '#d8e8ff', fontStyle: 'bold',
    }).setOrigin(1, 0).setDepth(101)

    this.add.rectangle(GAME_W / 2, 35, GAME_W - 24, 10, 0x20243a).setDepth(101)
    this.expBar = this.add.rectangle(12, 35, GAME_W - 24, 10, 0x48b5ff)
      .setOrigin(0, 0.5)
      .setDepth(102)
    this.expBar.scaleX = 0
    this.add.text(GAME_W / 2, 35, 'EXP', {
      fontSize: '15px', color: '#d8e8ff',
    }).setOrigin(0.5).setDepth(103)

    // 操作系は右上に寄せ、戦場中央から外す。
    this.pauseText = this.makeHudButton(GAME_W - 90, 72, 46, 'II', () => {
      this.battle.toggleUserPause()
      this.onUpdate()
    })

    this.speedText = this.makeHudButton(GAME_W - 34, 72, 54, 'x1', () => {
      this.battle.cycleSpeed()
      this.onUpdate()
    })

    // バリケード耐久は設備本体の右端へ寄せる。
    this.hpText = this.add.text(GAME_W - 26, BARRICADE_Y + 33, '', {
      fontSize: '14px', color: '#ffeecc', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(1, 0.5).setDepth(105)

    this.battle.events.on('battleUpdate', this.onUpdate, this)
    this.battle.events.on('expChanged', this.onUpdate, this)
    this.battle.events.on('levelUp', this.showLevelUpUI, this)
    this.battle.events.on('levelUpDone', this.hideLevelUpUI, this)

    this.onUpdate()
  }

  private makeHudButton(x: number, y: number, w: number, label: string, onClick: () => void) {
    const bg = this.add.rectangle(x, y, w, 28, 0x10213a, 0.48)
      .setStrokeStyle(1, 0x88bbdd, 0.58)
      .setInteractive({ useHandCursor: true })
      .setDepth(101)
    const text = this.add.text(x, y, label, {
      fontSize: '14px', color: '#ffffff', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(102)

    bg.on('pointerdown', onClick)
    bg.on('pointerover', () => bg.setFillStyle(0x203a5f, 0.5))
    bg.on('pointerout', () => bg.setFillStyle(0x10213a, 0.38))
    text.setInteractive({ useHandCursor: true }).on('pointerdown', onClick)
    return text
  }

  private onUpdate() {
    const lm = this.battle.levelUpManager
    this.levelText.setText(`Lv.${lm.level}`)
    this.expBar.scaleX = Phaser.Math.Clamp(lm.getExpRatio(), 0, 1)

    const b = this.battle.barricade
    this.hpText.setText(`${b.hp}/${b.maxHp}`)

    const totalSec = Math.floor(this.battle.elapsedMs / 1000)
    const min = Math.floor(totalSec / 60).toString().padStart(2, '0')
    const sec = (totalSec % 60).toString().padStart(2, '0')
    this.timeText.setText(`${min}:${sec}`)
    this.pauseText.setText(this.battle.isPausedByUser ? '>' : 'II')
    this.speedText.setText(`x${this.battle.currentSpeed}`)
  }

  private showLevelUpUI(choices: UpgradeOption[]) {
    if (this.levelUpContainer) return

    const levelUpH = 360
    const dialogY = Math.round(300 - levelUpH / 2)
    this.levelUpContainer = this.add.container(0, 0).setDepth(200)

    const bg = this.add.graphics()
    bg.fillStyle(UI_DIALOG_FILL, UI_DIALOG_FILL_ALPHA)
    bg.fillRect(UI_DIALOG_X, dialogY, UI_DIALOG_W, levelUpH)
    bg.lineStyle(UI_EDGE_BUTTON_STROKE_WIDTH, UI_DIALOG_STROKE_COLOR, UI_DIALOG_STROKE_ALPHA)
    bg.strokeRect(UI_DIALOG_X, dialogY, UI_DIALOG_W, levelUpH)
    bg.fillStyle(UI_EDGE_BUTTON_ACCENT, UI_EDGE_BUTTON_ACCENT_ALPHA)
    bg.fillRect(UI_DIALOG_X, dialogY + 12, 4, levelUpH - 24)
    const title = this.add.text(GAME_W / 2, dialogY + 26, 'レベルアップ', {
      fontSize: '24px', color: '#fff0a8', fontStyle: 'bold',
    }).setOrigin(0.5)
    const sub = this.add.text(GAME_W / 2, dialogY + 58, '強化を選択', {
      fontSize: '16px', color: '#b8c4d8',
    }).setOrigin(0.5)

    this.levelUpContainer.add([bg, title, sub])

    choices.forEach((opt, i) => {
      const cardX = UI_DIALOG_X + 14
      const cardY = dialogY + 88 + i * 82
      const isRare = opt.id.startsWith('rare_')
      const cardW = UI_DIALOG_W - 28
      const cardH = 74
      const accent = isRare ? UI_RARE_ACCENT : UI_EDGE_BUTTON_ACCENT
      const fill = isRare ? UI_RARE_FILL : UI_EDGE_BUTTON_FILL
      const card = this.add.graphics()
      const drawCard = (pressed: boolean) => {
        card.clear()
        card.fillStyle(fill, isRare ? 0.92 : UI_EDGE_BUTTON_FILL_ALPHA)
        card.fillRect(cardX, cardY, cardW, cardH)
        card.lineStyle(
          pressed ? UI_ACTIVE_STROKE_WIDTH : UI_EDGE_BUTTON_STROKE_WIDTH,
          pressed ? UI_ACTIVE_STROKE_COLOR : isRare ? UI_RARE_STROKE_COLOR : accent,
          pressed ? UI_ACTIVE_STROKE_ALPHA : isRare ? 0.9 : UI_EDGE_BUTTON_STROKE_ALPHA,
        )
        card.strokeRect(cardX, cardY, cardW, cardH)
        card.fillStyle(accent, isRare ? 0.5 : UI_EDGE_BUTTON_ACCENT_ALPHA)
        card.fillRect(cardX, cardY + 10, 4, cardH - 20)
      }
      drawCard(false)
      const hit = this.add.rectangle(cardX + cardW / 2, cardY + cardH / 2, cardW, cardH, 0x000000, 0.001)
        .setInteractive({ useHandCursor: true })

      const emoji = this.add.text(cardX + 48, cardY + cardH / 2, opt.emoji, { fontSize: '30px' }).setOrigin(0.5)
      const name = this.add.text(cardX + 88, cardY + 10, opt.name, {
        fontSize: '20px', color: isRare ? '#ffef9a' : '#ffffff', fontStyle: 'bold',
      })
      const desc = this.add.text(cardX + 88, cardY + 37, opt.description, {
        fontSize: '15px', color: '#9fb0c8',
        wordWrap: { width: cardW - 104, useAdvancedWrap: true },
      })

      hit.on('pointerdown', () => drawCard(true))
      hit.on('pointerup', () => {
        drawCard(false)
        this.battle.applyUpgrade(opt.id)
      })
      hit.on('pointerout', () => drawCard(false))

      this.levelUpContainer!.add([card, hit, emoji, name, desc])
    })
  }

  private hideLevelUpUI() {
    this.levelUpContainer?.destroy()
    this.levelUpContainer = undefined
    this.onUpdate()
  }

  shutdown() {
    this.battle.events.off('battleUpdate', this.onUpdate, this)
    this.battle.events.off('expChanged', this.onUpdate, this)
    this.battle.events.off('levelUp', this.showLevelUpUI, this)
    this.battle.events.off('levelUpDone', this.hideLevelUpUI, this)
  }
}
