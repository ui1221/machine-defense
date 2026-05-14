import Phaser from 'phaser'

const DURATION = 3000
const TICK_INTERVAL = 280
const SLOW_FACTOR = 0.35

export class DamageZone extends Phaser.GameObjects.Arc {
  readonly zoneRadius: number
  readonly damagePerTick: number
  readonly ownerId: string
  private elapsed = 0
  private tickElapsed = 0
  shouldTick = false

  constructor(scene: Phaser.Scene, x: number, y: number, radius: number, damagePerTick: number, ownerId: string) {
    super(scene, x, y, radius, 0, 360, false, 0xff6600, 0.18)
    this.setStrokeStyle(2, 0xff9900, 0.6)
    this.zoneRadius = radius
    this.damagePerTick = damagePerTick
    this.ownerId = ownerId
    this.setDepth(9)

    // 出現爆発エフェクト
    const flash = scene.add.arc(x, y, radius * 1.4, 0, 360, false, 0xffaa00, 0.5).setDepth(20)
    scene.tweens.add({
      targets: flash, scaleX: 1.6, scaleY: 1.6, alpha: 0,
      duration: 300, onComplete: () => flash.destroy(),
    })
  }

  containsPoint(px: number, py: number): boolean {
    const dx = px - this.x
    const dy = py - this.y
    return dx * dx + dy * dy < this.zoneRadius * this.zoneRadius
  }

  get slowFactor() { return SLOW_FACTOR }

  get isExpired() { return this.elapsed >= DURATION }

  update(_t: number, delta: number) {
    this.elapsed += delta
    this.tickElapsed += delta
    this.shouldTick = false

    if (this.tickElapsed >= TICK_INTERVAL) {
      this.tickElapsed -= TICK_INTERVAL
      this.shouldTick = true
    }

    // フェードアウト
    const remaining = DURATION - this.elapsed
    if (remaining < 600) {
      this.setAlpha(0.18 * (remaining / 600))
    }

    if (this.isExpired) this.destroy()
  }
}
