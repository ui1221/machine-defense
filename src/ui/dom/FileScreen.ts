import { ENEMIES } from '../../data/enemies'
import { WEAPONS } from '../../data/weapons'
import { loadSave } from '../../systems/SaveData'
import { equipmentDisplayName, equipmentEffectDescription } from '../../systems/EquipmentEnhancement'
import { edgeButton, emptyState, listRow, scrollList } from './components'
import type { DomScreen } from './mount'

type FileMode = 'items' | 'enemies'

export interface FileScreenOptions {
  initialMode: FileMode | null
}

export function mountFileScreen(root: HTMLElement, opts: FileScreenOptions): DomScreen {
  let mode = opts.initialMode
  const screen = document.createElement('div')
  screen.className = 'md-ui-screen'
  root.append(screen)

  const render = () => {
    screen.replaceChildren()
    if (!mode) renderMenu()
    else renderList(mode)
  }

  const renderMenu = () => {
    const menu = document.createElement('div')
    menu.className = 'md-file-menu'
    menu.append(
      edgeButton({
        icon: '>',
        title: 'アイテム',
        desc: '所持装備の一覧を確認する',
        onClick: () => {
          mode = 'items'
          render()
        },
      }),
      edgeButton({
        icon: '>',
        title: '敵',
        desc: '確認済みの敵情報を見る',
        onClick: () => {
          mode = 'enemies'
          render()
        },
      }),
    )
    screen.append(menu)
  }

  const renderList = (nextMode: FileMode) => {
    const wrap = document.createElement('div')
    wrap.className = 'md-file-list'

    const header = document.createElement('div')
    header.className = 'md-file-header'
    const back = document.createElement('button')
    back.className = 'md-back-button'
    back.type = 'button'
    back.textContent = '< 戻る'
    back.addEventListener('click', () => {
      mode = null
      render()
    })
    const title = document.createElement('div')
    title.className = 'md-file-title'
    title.textContent = nextMode === 'items' ? 'アイテム' : '敵'
    header.append(back, title, document.createElement('div'))

    const list = scrollList()
    if (nextMode === 'items') renderItems(list)
    else renderEnemies(list)

    wrap.append(header, list)
    screen.append(wrap)
  }

  const renderItems = (list: HTMLElement) => {
    const save = loadSave()
    if (save.ownedWeapons.length === 0) {
      list.append(emptyState('アイテムはまだありません\n戦闘報酬で装備を入手できます。'))
      return
    }
    const slotOrder = { weapon: 0, core: 1, sensor: 2, module: 3 }
    const rarityOrder = { N: 0, R: 1, SR: 2, SSR: 3 }
    const sorted = [...save.ownedWeapons].sort((a, b) => {
      const aw = WEAPONS[a.weaponId]
      const bw = WEAPONS[b.weaponId]
      if (!aw || !bw) return a.weaponId.localeCompare(b.weaponId)
      const slotDiff = slotOrder[aw.slot] - slotOrder[bw.slot]
      if (slotDiff !== 0) return slotDiff
      const rarityDiff = rarityOrder[aw.rarity] - rarityOrder[bw.rarity]
      if (rarityDiff !== 0) return rarityDiff
      return aw.name.localeCompare(bw.name, 'ja')
    })
    sorted.forEach(owned => {
      const weapon = WEAPONS[owned.weaponId]
      if (!weapon) return
      list.append(listRow({
        icon: weapon.emoji,
        iconColor: slotColor(weapon.slot),
        title: equipmentDisplayName(weapon.name, owned.level),
        detail: equipmentEffectDescription(weapon, owned.level),
        meta: weapon.rarity,
      }))
    })
  }

  const renderEnemies = (list: HTMLElement) => {
    Object.values(ENEMIES).forEach(enemy => {
      list.append(listRow({
        icon: enemy.emoji,
        iconColor: enemy.color ? `#${enemy.color.toString(16).padStart(6, '0')}` : '#667788',
        title: enemy.name,
        detail: `HP ${enemy.hp}  SPD ${enemy.speed}`,
        meta: enemy.abilities?.includes('boss') ? 'BOSS' : undefined,
      }))
    })
  }

  render()
  return {
    destroy: () => screen.remove(),
  }
}

function slotColor(slot: keyof typeof slotColors) {
  return slotColors[slot]
}

const slotColors = {
  weapon: '#cc4455',
  core: '#ffcc44',
  sensor: '#55aaff',
  module: '#e8edf5',
}
