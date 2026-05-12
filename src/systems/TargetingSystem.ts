import type { Enemy } from '../objects/Enemy'

export class TargetingSystem {
  findClosestEnemy(enemies: Enemy[], fromX: number, fromY: number, range: number): Enemy | null {
    let best: Enemy | null = null
    let bestDist = Infinity

    for (const e of enemies) {
      if (!e.active || e.hp <= 0) continue
      const dx = e.x - fromX
      const dy = e.y - fromY
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist <= range && dist < bestDist) {
        best = e
        bestDist = dist
      }
    }
    return best
  }

  findFrontmostEnemy(enemies: Enemy[], range: number, fromY: number): Enemy | null {
    let best: Enemy | null = null
    let bestY = -Infinity

    for (const e of enemies) {
      if (!e.active || e.hp <= 0) continue
      const dy = fromY - e.y
      if (dy >= 0 && dy <= range && e.y > bestY) {
        best = e
        bestY = e.y
      }
    }
    return best
  }
}
