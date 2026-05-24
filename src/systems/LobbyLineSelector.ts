import { PLAYABLE_CHARACTER_IDS } from '../data/characters'
import { LOBBY_LINES, type LobbyLine, type LobbyLineContext, type LobbyLineTrigger } from '../data/lobbyLines'
import { RESEARCH_ITEMS } from '../data/research'
import { upgradeCost } from './SaveData'
import type { GameSave } from '../types'

const RECENT_LINE_LIMIT = 3

export class LobbyLineSelector {
  private recentIds: string[] = []

  pick(save: GameSave, trigger: LobbyLineTrigger): string {
    const context = this.buildContext(save)
    const candidates = LOBBY_LINES.filter(line =>
      (line.trigger ?? 'idle') === trigger && (!line.condition || line.condition(context)),
    )

    const lessRecent = candidates.filter(line => !this.recentIds.includes(line.id))
    const pool = lessRecent.length > 0 ? lessRecent : candidates
    const picked = this.weightedPick(pool) ?? candidates[0]
    if (!picked) return ''

    this.recentIds.push(picked.id)
    if (this.recentIds.length > RECENT_LINE_LIMIT) this.recentIds.shift()
    return picked.text
  }

  private buildContext(save: GameSave): LobbyLineContext {
    return {
      save,
      canUpgradeCharacter: this.canUpgradeCharacter(save),
      hasAnyResearch: RESEARCH_ITEMS.some(item => Number(save.upgrades[item.id] ?? 0) > 0),
    }
  }

  private canUpgradeCharacter(save: GameSave) {
    return PLAYABLE_CHARACTER_IDS.some(id => {
      const key = `${id}AtkLevel` as keyof GameSave['upgrades']
      const level = Number(save.upgrades[key] ?? 0)
      return save.credits >= upgradeCost(level)
    })
  }

  private weightedPick(lines: LobbyLine[]) {
    if (lines.length === 0) return null
    const total = lines.reduce((sum, line) => sum + (line.weight ?? 1), 0)
    let roll = Math.random() * total
    for (const line of lines) {
      roll -= line.weight ?? 1
      if (roll <= 0) return line
    }
    return lines[lines.length - 1]
  }
}
