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
  private readonly beamVisual: Phaser.GameObjects.Graphics

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
    super(scene, x, y, length, width, 0x66ddff, 0)
    this.setRotation(angleRad)
    this.setDepth(11)
    this.ownerId = ownerId
    this.damagePerTick = damagePerTick
    this.angleRad = angleRad
    this.halfLength = length / 2
    this.halfWidth = width / 2
    this.beamVisual = scene.add.graphics().setDepth(12)
    this.drawBeamVisual(length, width)
  }

  private drawBeamVisual(length: number, width: number) {
    const rootX = this.x - Math.cos(this.angleRad) * this.halfLength
    const rootY = this.y - Math.sin(this.angleRad) * this.halfLength
    const forwardX = Math.cos(this.angleRad)
    const forwardY = Math.sin(this.angleRad)
    const sideX = -Math.sin(this.angleRad)
    const sideY = Math.cos(this.angleRad)
    const taperLen = Math.max(56, width * 1.7)
    const bodyHalf = width / 2
    const flareHalf = bodyHalf * 1.45

    const rootTipX = rootX
    const rootTipY = rootY
    const flareLeftX = rootX + forwardX * taperLen + sideX * flareHalf
    const flareLeftY = rootY + forwardY * taperLen + sideY * flareHalf
    const endLeftX = rootX + forwardX * length + sideX * bodyHalf
    const endLeftY = rootY + forwardY * length + sideY * bodyHalf
    const endRightX = rootX + forwardX * length - sideX * bodyHalf
    const endRightY = rootY + forwardY * length - sideY * bodyHalf
    const flareRightX = rootX + forwardX * taperLen - sideX * flareHalf
    const flareRightY = rootY + forwardY * taperLen - sideY * flareHalf

    this.beamVisual.clear()
    this.beamVisual.fillStyle(0x66ddff, 0.22)
    this.beamVisual.lineStyle(2, 0xc8fbff, 0.82)
    this.beamVisual.beginPath()
    this.beamVisual.moveTo(rootTipX, rootTipY)
    this.beamVisual.lineTo(flareLeftX, flareLeftY)
    this.beamVisual.lineTo(endLeftX, endLeftY)
    this.beamVisual.lineTo(endRightX, endRightY)
    this.beamVisual.lineTo(flareRightX, flareRightY)
    this.beamVisual.closePath()
    this.beamVisual.fillPath()
    this.beamVisual.strokePath()

    this.beamVisual.lineStyle(1, 0xffffff, 0.36)
    this.beamVisual.beginPath()
    this.beamVisual.moveTo(rootTipX, rootTipY)
    this.beamVisual.lineTo(rootX + forwardX * length, rootY + forwardY * length)
    this.beamVisual.strokePath()
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
    if (remaining < 420) this.beamVisual.setAlpha(remaining / 420)
    if (this.expired) this.destroy()
  }

  destroy(fromScene?: boolean) {
    this.beamVisual.destroy()
    super.destroy(fromScene)
  }
}
