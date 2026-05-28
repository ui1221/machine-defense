import { RESEARCH_ITEMS, type ResearchItem } from '../../data/research'
import { RARITY_COLORS, WEAPONS } from '../../data/weapons'
import { loadSave, saveGame } from '../../systems/SaveData'
import type { EquipmentSlot, GameSave, OwnedWeapon } from '../../types'
import { edgeButton, emptyState, listRow, scrollList } from './components'
import type { DomScreen } from './mount'

type ShopMode = 'menu' | 'buy' | 'sell' | 'upgrade' | 'research'

export interface ShopScreenOptions {
  initialMode: ShopMode
  onSaveChanged: () => void
}

export function mountShopScreen(root: HTMLElement, opts: ShopScreenOptions): DomScreen {
  let mode = opts.initialMode
  const screen = document.createElement('div')
  screen.className = 'md-ui-screen'
  root.append(screen)

  const render = () => {
    screen.replaceChildren()
    if (mode === 'menu') renderMenu()
    else renderList(mode)
  }

  const renderMenu = () => {
    const menu = document.createElement('div')
    menu.className = 'md-file-menu'
    menu.append(
      edgeButton({
        icon: '>',
        title: '購入',
        desc: 'クレジットで装備を入手する',
        onClick: () => {
          mode = 'buy'
          render()
        },
      }),
      edgeButton({
        icon: '>',
        title: '売却',
        desc: '未装備アイテムを安く売る',
        onClick: () => {
          mode = 'sell'
          render()
        },
      }),
      edgeButton({
        icon: '>',
        title: '装備強化',
        desc: '所持装備を+1強化する',
        onClick: () => {
          mode = 'upgrade'
          render()
        },
      }),
      edgeButton({
        icon: '>',
        title: '研究',
        desc: '恒久パッシブ強化を買う',
        onClick: () => {
          mode = 'research'
          render()
        },
      }),
    )
    screen.append(menu)
  }

  const renderList = (nextMode: ShopMode) => {
    const wrap = document.createElement('div')
    wrap.className = 'md-file-list'

    const header = document.createElement('div')
    header.className = 'md-file-header'
    const back = document.createElement('button')
    back.className = 'md-back-button'
    back.type = 'button'
    back.textContent = '< 戻る'
    back.addEventListener('click', () => {
      mode = 'menu'
      render()
    })
    const title = document.createElement('div')
    title.className = 'md-file-title'
    title.textContent = modeTitle(nextMode)
    header.append(back, title, document.createElement('div'))

    const list = scrollList()
    if (nextMode === 'buy') renderBuy(list)
    else if (nextMode === 'sell') renderSell(list)
    else if (nextMode === 'research') renderResearch(list)
    else list.append(emptyState('この項目は次に実装します。'))

    wrap.append(header, list)
    screen.append(wrap)
  }

  const rerenderAfterSave = () => {
    opts.onSaveChanged()
    render()
  }

  const renderBuy = (list: HTMLElement) => {
    const save = loadSave()
    const items = Object.values(WEAPONS)
      .filter(weapon => weapon.rarity === 'N')
      .sort((a, b) => {
        const slotDiff = slotOrder[a.slot] - slotOrder[b.slot]
        return slotDiff !== 0 ? slotDiff : a.name.localeCompare(b.name, 'ja')
      })

    items.forEach(weapon => {
      const price = buyPrice(weapon.id)
      list.append(listRow({
        icon: weapon.emoji,
        iconColor: rarityColor(weapon.rarity),
        title: weapon.name,
        detail: compactEquipmentDescription(weapon.description),
        meta: `${price} CREDIT`,
        disabled: save.credits < price,
        onClick: () => showConfirm(
          `${weapon.name}\n${compactEquipmentDescription(weapon.description)}\n${price} CREDIT で購入します。`,
          () => {
            const current = loadSave()
            if (current.credits < price) return
            current.ownedWeapons.push({
              uid: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
              weaponId: weapon.id,
              equippedCharId: null,
              level: 0,
              rarity: weapon.rarity,
            })
            current.credits -= price
            saveGame(current)
            rerenderAfterSave()
          },
        ),
      }))
    })
  }

  const renderSell = (list: HTMLElement) => {
    const save = loadSave()
    const items = save.ownedWeapons.filter(owned => !owned.equippedCharId && WEAPONS[owned.weaponId])
    if (items.length === 0) {
      list.append(emptyState('売却できるアイテムはありません。'))
      return
    }

    items.forEach(owned => {
      const weapon = WEAPONS[owned.weaponId]
      if (!weapon) return
      const price = sellPrice(owned)
      list.append(listRow({
        icon: weapon.emoji,
        iconColor: rarityColor(weapon.rarity),
        title: equipmentDisplayName(weapon.name, owned.level),
        detail: compactEquipmentDescription(weapon.description),
        meta: `${price} CREDIT`,
        onClick: () => showConfirm(
          `${equipmentDisplayName(weapon.name, owned.level)}\n${price} CREDIT で売却します。`,
          () => {
            const current = loadSave()
            const target = current.ownedWeapons.find(w => w.uid === owned.uid)
            if (!target || target.equippedCharId) return
            current.ownedWeapons = current.ownedWeapons.filter(w => w.uid !== owned.uid)
            current.credits += sellPrice(target)
            saveGame(current)
            rerenderAfterSave()
          },
        ),
      }))
    })
  }

  const renderResearch = (list: HTMLElement) => {
    const save = loadSave()
    RESEARCH_ITEMS.forEach(item => {
      const level = Number(save.upgrades[item.id] ?? 0)
      const maxed = level >= item.maxLevel
      const cost = item.cost(level)
      const canBuy = !maxed && save.credits >= cost
      list.append(listRow({
        icon: item.icon,
        iconColor: canBuy ? '#44ff88' : '#667188',
        title: item.name,
        subTitle: `Lv.${level}/${item.maxLevel}`,
        detail: maxed ? `${item.valueText(level)}  MAX` : `${item.valueText(level)} -> ${item.nextText(level)}`,
        meta: maxed ? 'MAX' : `${cost} CREDIT`,
        disabled: !canBuy,
        onClick: () => showConfirm(
          `${item.name}\nLv.${level} -> Lv.${level + 1}\n${item.nextText(level)}\n${cost} CREDIT で研究します。`,
          () => {
            if (buyResearch(item, cost)) rerenderAfterSave()
          },
        ),
      }))
    })

    const refund = calcResearchRefund(save)
    list.append(listRow({
      icon: '↺',
      iconColor: refund > 0 ? '#ffdd88' : '#667188',
      title: '強化のやり直し',
      detail: refund > 0 ? `研究を初期化して ${refund} CREDIT を返却` : '初期化できる研究はありません',
      disabled: refund <= 0,
      onClick: () => showConfirm(
        `研究を初期化します。\nクレジットは返却されます。\n返却: ${refund} CREDIT`,
        () => {
          if (resetResearch(refund)) rerenderAfterSave()
        },
      ),
    }))
  }

  const showConfirm = (message: string, onYes: () => void) => {
    const overlay = document.createElement('div')
    overlay.className = 'md-dialog-overlay'

    const dialog = document.createElement('div')
    dialog.className = 'md-dialog'
    const body = document.createElement('div')
    body.className = 'md-dialog__body'
    body.textContent = message

    const actions = document.createElement('div')
    actions.className = 'md-dialog__actions'
    actions.append(
      dialogButton('はい', () => {
        overlay.remove()
        onYes()
      }),
      dialogButton('いいえ', () => overlay.remove(), true),
    )

    dialog.append(body, actions)
    overlay.append(dialog)
    screen.append(overlay)
  }

  render()
  return {
    destroy: () => screen.remove(),
  }
}

function dialogButton(label: string, onClick: () => void, quiet = false) {
  const button = document.createElement('button')
  button.className = quiet ? 'md-dialog-button is-quiet' : 'md-dialog-button'
  button.type = 'button'
  button.textContent = label
  button.addEventListener('click', onClick)
  return button
}

function modeTitle(mode: ShopMode) {
  if (mode === 'buy') return '購入'
  if (mode === 'sell') return '売却'
  if (mode === 'research') return '研究'
  return '装備強化'
}

function sellPrice(owned: OwnedWeapon) {
  const weapon = WEAPONS[owned.weaponId]
  if (!weapon) return 0
  const rarityBase = weapon.rarity === 'N' ? 10 : weapon.rarity === 'R' ? 100 : weapon.rarity === 'SR' ? 1000 : 5000
  const slotMult = weapon.slot === 'core' ? 1.1 : weapon.slot === 'module' ? 0.9 : 1
  return Math.max(1, Math.round(rarityBase * slotMult * (1 + owned.level * 0.25)))
}

function buyPrice(weaponId: string) {
  const weapon = WEAPONS[weaponId]
  if (!weapon) return 0
  const rarityBase = weapon.rarity === 'N' ? 180 : weapon.rarity === 'R' ? 1400 : weapon.rarity === 'SR' ? 9000 : 30000
  const slotMult = weapon.slot === 'core' ? 1.1 : weapon.slot === 'module' ? 0.9 : 1
  return Math.max(1, Math.round(rarityBase * slotMult))
}

function buyResearch(item: ResearchItem, cost: number) {
  const save = loadSave()
  const current = Number(save.upgrades[item.id] ?? 0)
  if (save.credits < cost || current >= item.maxLevel) return false
  save.credits -= cost
  save.upgrades[item.id] = current + 1
  saveGame(save)
  return true
}

function calcResearchRefund(save: GameSave) {
  return RESEARCH_ITEMS.reduce((sum, item) => {
    const level = Math.min(Number(save.upgrades[item.id] ?? 0), item.maxLevel)
    for (let i = 0; i < level; i += 1) sum += item.cost(i)
    return sum
  }, 0)
}

function resetResearch(refund: number) {
  if (refund <= 0) return false
  const save = loadSave()
  for (const item of RESEARCH_ITEMS) save.upgrades[item.id] = 0
  save.credits += refund
  saveGame(save)
  return true
}

function equipmentDisplayName(name: string, level: number) {
  return level > 0 ? `${name}+${level}` : name
}

function compactEquipmentDescription(description: string) {
  return description
    .replace(/攻撃力/g, '攻撃')
    .replace(/クールタイム/g, '冷却')
    .replace(/索敵範囲/g, '範囲')
    .replace(/会心率/g, '会心')
    .replace(/(攻撃|冷却|範囲|会心)\s+([+-])/g, '$1$2')
    .replace(/\s*\/\s*/g, '　')
}

function rarityColor(rarity: keyof typeof RARITY_COLORS) {
  return '#' + RARITY_COLORS[rarity].toString(16).padStart(6, '0')
}

const slotOrder: Record<EquipmentSlot, number> = {
  weapon: 0,
  core: 1,
  sensor: 2,
  module: 3,
}
