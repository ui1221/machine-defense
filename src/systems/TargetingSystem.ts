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

  findFrontmostEnemy(
    enemies: Enemy[],
    range: number,
    fromX: number,
    fromY: number,
    excluded: Set<Enemy> = new Set(),
  ): Enemy | null {
    let best: Enemy | null = null
    let bestScore = -Infinity

    for (const e of enemies) {
      if (!e.active || e.hp <= 0) continue
      if (excluded.has(e)) continue
      const dx = Math.abs(e.x - fromX)
      const dy = fromY - e.y
      if (dy >= 0 && dy <= range) {
        // 手前の敵を優先しつつ、立ち位置に近い敵へ少し傾く。
        const score = e.y - dx * 0.16
        if (score <= bestScore) continue
        best = e
        bestScore = score
      }
    }
    return best
  }
}
