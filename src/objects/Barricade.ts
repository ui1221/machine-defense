import Phaser from 'phaser'
import { GAME_W, BARRICADE_Y } from '../constants'

export class Barricade {
  hp: number
  maxHp: number
  private body: Phaser.GameObjects.Image
  private damagedBody: Phaser.GameObjects.Image

  constructor(scene: Phaser.Scene, maxHp: number) {
    this.hp = maxHp
    this.maxHp = maxHp

    scene.add.rectangle(GAME_W / 2, BARRICADE_Y - 8, GAME_W - 28, 10, 0x1d2636, 0.72)
      .setDepth(2)
    this.body = scene.add.image(GAME_W / 2, BARRICADE_Y - 24, 'barricade_full')
      .setOrigin(0.5)
      .setDisplaySize(GAME_W + 38, 148)
      .setDepth(3)
    this.damagedBody = scene.add.image(GAME_W / 2, BARRICADE_Y - 24, 'barricade_damaged')
      .setOrigin(0.5)
      .setDisplaySize(GAME_W + 38, 148)
      .setDepth(3)
      .setVisible(false)

  }

  takeDamage(amount: number, scene: Phaser.Scene): boolean {
    this.hp = Math.max(0, this.hp - amount)
    this.updateBar()
    scene.cameras.main.shake(120, 0.002)

    scene.tweens.add({
      targets: this.body,
      alpha: 0.45,
      duration: 80,
      yoyo: true,
    })
    scene.tweens.add({
      targets: this.damagedBody,
      alpha: 0.45,
      duration: 80,
      yoyo: true,
    })

    return this.hp <= 0
  }

  heal(ratio: number) {
    this.hp = Math.min(this.maxHp, this.hp + Math.floor(this.maxHp * ratio))
    this.updateBar()
  }

  boostMax(amount: number) {
    this.maxHp += amount
    this.hp += amount
    this.updateBar()
  }

  private updateBar() {
    const ratio = Math.max(0, this.hp / this.maxHp)
    const damaged = ratio <= 0.5
    this.body.setVisible(!damaged)
    this.damagedBody.setVisible(damaged)
    this.body.setAlpha(1)
    this.damagedBody.setAlpha(1)
  }

  get y() { return BARRICADE_Y }
}
