import Phaser from 'phaser'
import { BARRICADE_Y, GAME_W } from '../constants'
import type { BattleScene } from './BattleScene'
import type { UpgradeOption } from '../types'

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
    this.add.rectangle(GAME_W / 2, 25, GAME_W, 50, 0x05070d, 0.78).setDepth(100)
    this.add.rectangle(GAME_W / 2, 49, GAME_W - 18, 1, 0x41506d, 0.7).setDepth(101)

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
      fontSize: '9px', color: '#d8e8ff',
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
      fontSize: '12px', color: '#ffeecc', fontStyle: 'bold',
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

    this.levelUpContainer = this.add.container(GAME_W / 2, 300).setDepth(200)

    const bg = this.add.rectangle(0, 0, GAME_W - 40, 340, 0x000000, 0.9)
    const title = this.add.text(0, -140, 'LEVEL UP!', {
      fontSize: '28px', color: '#ffdd44', fontStyle: 'bold',
    }).setOrigin(0.5)
    const sub = this.add.text(0, -108, '強化を選択', {
      fontSize: '16px', color: '#aaaacc',
    }).setOrigin(0.5)

    this.levelUpContainer.add([bg, title, sub])

    choices.forEach((opt, i) => {
      const cy = -60 + i * 85
      const isRare = opt.id.startsWith('rare_')
      const card = this.add.rectangle(0, cy, GAME_W - 80, 72, isRare ? 0x302711 : 0x1a2a44)
        .setStrokeStyle(isRare ? 3 : 2, isRare ? 0xffd34d : 0x446688)
        .setInteractive({ useHandCursor: true })

      const emoji = this.add.text(-160, cy, opt.emoji, { fontSize: '32px' }).setOrigin(0.5)
      const name = this.add.text(-120, cy - 12, opt.name, {
        fontSize: '18px', color: '#ffffff', fontStyle: 'bold',
      })
      const desc = this.add.text(-120, cy + 12, opt.description, {
        fontSize: '13px', color: '#8899aa',
      })

      card.on('pointerdown', () => {
        this.battle.applyUpgrade(opt.id)
      })
      card.on('pointerover', () => card.setFillStyle(isRare ? 0x46391a : 0x2a3a66))
      card.on('pointerout', () => card.setFillStyle(isRare ? 0x302711 : 0x1a2a44))

      this.levelUpContainer!.add([card, emoji, name, desc])
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
