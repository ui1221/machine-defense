import Phaser from 'phaser'
import { GAME_W, BARRICADE_Y, BARRICADE_H } from '../constants'

export class Barricade {
  hp: number
  maxHp: number
  private bar: Phaser.GameObjects.Rectangle
  private body: Phaser.GameObjects.Rectangle

  constructor(scene: Phaser.Scene, maxHp: number) {
    this.hp = maxHp
    this.maxHp = maxHp

    this.body = scene.add.rectangle(GAME_W / 2, BARRICADE_Y, GAME_W - 20, BARRICADE_H, 0x886644)
      .setDepth(3)

    scene.add.rectangle(GAME_W / 2, BARRICADE_Y + 14, GAME_W - 40, 6, 0x333333)
      .setDepth(4)
    this.bar = scene.add.rectangle(GAME_W / 2, BARRICADE_Y + 14, GAME_W - 40, 6, 0x44cc66)
      .setDepth(4)
  }

  takeDamage(amount: number, scene: Phaser.Scene): boolean {
    this.hp = Math.max(0, this.hp - amount)
    this.updateBar()
    scene.cameras.main.shake(150, 0.008)

    scene.tweens.add({
      targets: this.body,
      fillColor: 0xff2222,
      duration: 80,
      yoyo: true,
      onYoyo: () => this.body.setFillStyle(0x886644),
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
    this.bar.setScale(ratio, 1)
    if (ratio > 0.5) this.bar.setFillStyle(0x44cc66)
    else if (ratio > 0.25) this.bar.setFillStyle(0xddaa22)
    else this.bar.setFillStyle(0xff3333)
  }

  get y() { return BARRICADE_Y }
}
