import Phaser from 'phaser'
import type { Enemy } from './Enemy'

const TICK_INTERVAL = 260
const RADIUS = 36

export class OrbField extends Phaser.GameObjects.Arc {
  readonly ownerId: string
  readonly damagePerTick: number
  readonly slowFactor = 0.55
  private readonly dx: number
  private readonly dy: number
  private readonly speed: number
  private tickElapsed = 0
  shouldTick = false

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    targetX: number,
    targetY: number,
    speed: number,
    damagePerTick: number,
    ownerId: string,
  ) {
    super(scene, x, y, RADIUS, 0, 360, false, 0x7aa6ff, 0.28)
    this.setStrokeStyle(3, 0xaac8ff, 0.9)
    this.setDepth(13)
    this.speed = speed
    this.damagePerTick = damagePerTick
    this.ownerId = ownerId
    const ang = Math.atan2(targetY - y, targetX - x)
    this.dx = Math.cos(ang)
    this.dy = Math.sin(ang)
  }

  containsEnemy(enemy: Enemy) {
    const dx = enemy.x - this.x
    const dy = enemy.y - this.y
    return dx * dx + dy * dy <= (RADIUS + enemy.size) * (RADIUS + enemy.size)
  }

  update(_t: number, delta: number) {
    const step = (this.speed * delta) / 1000
    this.x += this.dx * step
    this.y += this.dy * step
    this.tickElapsed += delta
    this.shouldTick = false
    if (this.tickElapsed >= TICK_INTERVAL) {
      this.tickElapsed -= TICK_INTERVAL
      this.shouldTick = true
    }
    if (this.y < -60 || this.y > 920 || this.x < -60 || this.x > 540) this.destroy()
  }
}
