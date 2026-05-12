import { BASE_EXP, EXP_PER_LEVEL } from '../constants'
import { UPGRADE_POOL } from '../data/upgrades'
import type { BattleState, UpgradeOption } from '../types'

export class LevelUpManager {
  exp = 0
  level = 0
  private acquiredUpgrades = new Map<string, number>()

  get requiredExp() {
    if (this.level === 0) return 5
    if (this.level === 1) return 16
    if (this.level === 2) return 28
    return BASE_EXP + this.level * EXP_PER_LEVEL
  }

  addExp(amount: number): boolean {
    this.exp += amount
    if (this.exp >= this.requiredExp) {
      this.exp -= this.requiredExp
      this.level++
      return true
    }
    return false
  }

  getExpRatio(): number {
    return this.exp / this.requiredExp
  }

  pickChoices(state: BattleState): UpgradeOption[] {
    const available = UPGRADE_POOL.filter(opt => {
      if (!opt.canAppear(state)) return false
      if (opt.maxStack !== -1) {
        const count = this.acquiredUpgrades.get(opt.id) ?? 0
        if (count >= opt.maxStack) return false
      }
      return true
    })

    const picked: UpgradeOption[] = []
    const pool = [...available]

    for (let i = 0; i < 3 && pool.length > 0; i++) {
      const totalWeight = pool.reduce((s, o) => s + o.weight, 0)
      let roll = Math.random() * totalWeight
      let idx = 0
      for (; idx < pool.length; idx++) {
        roll -= pool[idx].weight
        if (roll <= 0) break
      }
      idx = Math.min(idx, pool.length - 1)
      picked.push(pool[idx])
      pool.splice(idx, 1)
    }

    return picked
  }

  recordChoice(id: string) {
    this.acquiredUpgrades.set(id, (this.acquiredUpgrades.get(id) ?? 0) + 1)
  }

  getAcquired() {
    return this.acquiredUpgrades
  }
}
