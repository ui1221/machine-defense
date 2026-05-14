import Phaser from 'phaser'
import type { Enemy } from './Enemy'

const DURATION = 3300
const TICK_INTERVAL = 280

export class BeamZone extends Phaser.GameObjects.Rectangle {
  readonly ownerId: string
  readonly damagePerTick: number
  private elapsed = 0
  private tickElapsed = 0
  shouldTick = false
  private readonly angleRad: number
  private readonly halfLength: number
  private readonly halfWidth: number

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    length: number,
    width: number,
    angleRad: number,
    damagePerTick: number,
    ownerId: string,
  ) {
    super(scene, x, y, length, width, 0x66ddff, 0.2)
    this.setStrokeStyle(2, 0xaaf2ff, 0.9)
    this.setRotation(angleRad)
    this.setDepth(11)
    this.ownerId = ownerId
    this.damagePerTick = damagePerTick
    this.angleRad = angleRad
    this.halfLength = length / 2
    this.halfWidth = width / 2
  }

  containsEnemy(enemy: Enemy) {
    const dx = enemy.x - this.x
    const dy = enemy.y - this.y
    const cos = Math.cos(-this.angleRad)
    const sin = Math.sin(-this.angleRad)
    const lx = dx * cos - dy * sin
    const ly = dx * sin + dy * cos
    return Math.abs(lx) <= this.halfLength + enemy.size && Math.abs(ly) <= this.halfWidth + enemy.size
  }

  get expired() { return this.elapsed >= DURATION }

  update(_t: number, delta: number) {
    this.elapsed += delta
    this.tickElapsed += delta
    this.shouldTick = false
    if (this.tickElapsed >= TICK_INTERVAL) {
      this.tickElapsed -= TICK_INTERVAL
      this.shouldTick = true
    }
    const remaining = DURATION - this.elapsed
    if (remaining < 420) this.setAlpha(0.2 * (remaining / 420))
    if (this.expired) this.destroy()
  }
}
