import Phaser from 'phaser'
import type { Enemy } from './Enemy'

export type BulletStyle = 'normal' | 'railgun' | 'field'

export class Bullet extends Phaser.GameObjects.Arc {
  private dx: number
  private dy: number
  private speed: number
  private hitEnemies = new Set<Enemy>()
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

    const ang = Math.atan2(targetY - y, targetX - x)
    this.dx = Math.cos(ang)
    this.dy = Math.sin(ang)

    this.setDepth(15)
  }

  update(_t: number, delta: number) {
    const step = (this.speed * delta) / 1000
    this.x += this.dx * step
    this.y += this.dy * step

    if (this.y < -20 || this.y > 900 || this.x < -20 || this.x > 520) {
      this.destroy()
    }
  }

  checkHit(enemies: Enemy[]): Enemy | null {
    for (const e of enemies) {
      if (!e.active || e.hp <= 0 || this.hitEnemies.has(e)) continue
      const dx = e.x - this.x
      const dy = e.y - this.y
      if (dx * dx + dy * dy < (e.size + 4) * (e.size + 4)) {
        this.hitEnemies.add(e)
        return e
      }
    }
    return null
  }
}
