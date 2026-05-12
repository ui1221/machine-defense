import Phaser from 'phaser'
import { CHAR_LINE_Y } from '../constants'

export class ExpOrb extends Phaser.GameObjects.Arc {
  value: number
  private collected = false

  constructor(scene: Phaser.Scene, x: number, y: number, value: number) {
    super(scene, x, y, 7, 0, 360, false, 0x00ee66)
    this.value = value
    this.setDepth(8)
    this.setAlpha(0.9)
    this.setStrokeStyle(1.5, 0x88ffcc)

    // 出現時のポップアニメーション
    scene.tweens.add({
      targets: this,
      scaleX: 1.4, scaleY: 1.4,
      duration: 100,
      yoyo: true,
    })
  }

  update(_t: number, delta: number) {
    if (this.collected) return

    // 常にキャラクターラインに向かって吸い寄せられる
    const dy = CHAR_LINE_Y - this.y
    const speed = Math.abs(dy) > 200 ? 300 : 180
    const step = (speed * delta) / 1000
    if (Math.abs(dy) < step) {
      this.y = CHAR_LINE_Y
      this.collected = true
    } else {
      this.y += Math.sign(dy) * step
    }
  }

  isCollected() { return this.collected }
}
