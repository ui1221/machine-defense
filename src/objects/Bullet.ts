import Phaser from 'phaser'
import type { Enemy } from './Enemy'

export type BulletStyle = 'normal' | 'railgun' | 'field'

export class Bullet extends Phaser.GameObjects.Arc {
  private dx: number
  private dy: number
  private speed: number
  private hitEnemies = new Set<Enemy>()
  private prevX: number
  private prevY: number
  atk: number
  hitsLeft: number
  isFieldBolt: boolean
  readonly ownerId: string

  constructor(
    scene: Phaser.Scene,
    x: number, y: number,
    targetX: number, targetY: number,
    speed: number, atk: number,
    ownerId: string,
    hitsLeft = 1,
    style: BulletStyle = 'normal',
  ) {
    const radius = style === 'railgun' ? 6 : style === 'field' ? 7 : 4
    const color = style === 'railgun' ? 0x88ddff : style === 'field' ? 0xaa44ff : 0xffee44
    super(scene, x, y, radius, 0, 360, false, color)

    this.speed = speed
    this.atk = atk
    this.ownerId = ownerId
    this.hitsLeft = hitsLeft
    this.isFieldBolt = style === 'field'
    this.prevX = x
    this.prevY = y

    const ang = Math.atan2(targetY - y, targetX - x)
    this.dx = Math.cos(ang)
    this.dy = Math.sin(ang)

    this.setDepth(15)
  }

  update(_t: number, delta: number) {
    const step = (this.speed * delta) / 1000
    this.prevX = this.x
    this.prevY = this.y
    this.x += this.dx * step
    this.y += this.dy * step

    if (this.y < -20 || this.y > 900 || this.x < -20 || this.x > 520) {
      this.destroy()
    }
  }

  checkHit(enemies: Enemy[]): Enemy | null {
    for (const e of enemies) {
      if (!e.active || e.hp <= 0 || this.hitEnemies.has(e)) continue
      const hitRadius = e.size + 4
      if (this.segmentDistanceSq(e.x, e.y) < hitRadius * hitRadius) {
        this.hitEnemies.add(e)
        return e
      }
    }
    return null
  }

  private segmentDistanceSq(x: number, y: number) {
    const vx = this.x - this.prevX
    const vy = this.y - this.prevY
    const lenSq = vx * vx + vy * vy
    if (lenSq <= 0.0001) {
      const dx = x - this.x
      const dy = y - this.y
      return dx * dx + dy * dy
    }

    const t = Phaser.Math.Clamp(((x - this.prevX) * vx + (y - this.prevY) * vy) / lenSq, 0, 1)
    const px = this.prevX + vx * t
    const py = this.prevY + vy * t
    const dx = x - px
    const dy = y - py
    return dx * dx + dy * dy
  }
}
