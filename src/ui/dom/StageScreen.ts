import { STAGES } from '../../data/stages'
import { loadSave, markStagePlayed } from '../../systems/SaveData'
import { listRow, scrollList } from './components'
import type { DomScreen } from './mount'

export interface StageScreenOptions {
  onStartStage: (stageId: string) => void
}

export function mountStageScreen(root: HTMLElement, opts: StageScreenOptions): DomScreen {
  const save = loadSave()
  const screen = document.createElement('div')
  screen.className = 'md-ui-screen'
  root.append(screen)

  const list = scrollList('md-stage-list')
  let lastPlayedRow: HTMLElement | null = null
  STAGES.forEach((stage, i) => {
    const cleared = save.clearedStages.includes(stage.id)
    const unlocked = i === 0 || save.debugUnlockAllStages || save.clearedStages.includes(STAGES[i - 1].id)
    const lastPlayed = save.lastPlayedStageId === stage.id
    const row = listRow({
      icon: cleared ? '✓' : unlocked ? '>' : '×',
      iconColor: cleared ? '#44ff88' : unlocked ? '#44ff88' : '#667188',
      title: stage.name,
      detail: stage.description,
      meta: `${lastPlayed ? '前回  ' : ''}HP x${(stage.enemyHpMult ?? 1).toFixed(2)}`,
      selected: lastPlayed,
      disabled: !unlocked,
      onClick: () => {
        if (!unlocked) return
        markStagePlayed(stage.id)
        opts.onStartStage(stage.id)
      },
    })
    if (lastPlayed) lastPlayedRow = row
    list.append(row)
  })
  screen.append(list)
  if (lastPlayedRow) {
    requestAnimationFrame(() => {
      lastPlayedRow?.scrollIntoView({ block: 'center' })
    })
  }

  return {
    destroy: () => screen.remove(),
  }
}
