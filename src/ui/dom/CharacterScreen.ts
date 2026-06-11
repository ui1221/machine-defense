import { CHARACTERS, PLAYABLE_CHARACTER_IDS } from '../../data/characters'
import { canEquipWeaponToCharacter, equipmentSlotLabel, RARITY_COLORS, WEAPONS } from '../../data/weapons'
import { loadSave, saveGame, upgradeCost } from '../../systems/SaveData'
import { equipmentDisplayName, equipmentEffectDescription, equipmentStatBonus } from '../../systems/EquipmentEnhancement'
import type { EquipmentSlot, GameSave, OwnedWeapon } from '../../types'
import { edgeButton, emptyState, listRow, scrollList } from './components'
import type { DomScreen } from './mount'
import { portraitStandee } from './standee'

const EQUIPMENT_SLOT_ORDER: EquipmentSlot[] = ['weapon', 'core', 'sensor', 'module']
const BLADE_PORTRAIT_SRC = '/machine-defense/assets/blade-portrait.png'

export interface CharacterScreenOptions {
  initialCharacterId: string
  onCharacterChanged: (id: string) => void
  onSaveChanged: () => void
}

export function mountCharacterScreen(root: HTMLElement, opts: CharacterScreenOptions): DomScreen {
  let selectedId = CHARACTERS[opts.initialCharacterId] ? opts.initialCharacterId : PLAYABLE_CHARACTER_IDS[0]
  let selectingSlot: EquipmentSlot | null = null
  const screen = document.createElement('div')
  screen.className = 'md-ui-screen'
  root.append(screen)

  const render = () => {
    screen.replaceChildren()
    if (selectingSlot) renderEquipmentList(selectingSlot)
    else renderCharacterDetail()
  }

  const rerenderAfterSave = () => {
    opts.onSaveChanged()
    render()
  }

  const renderCharacterDetail = () => {
    const save = loadSave()
    const cfg = CHARACTERS[selectedId] ?? CHARACTERS[PLAYABLE_CHARACTER_IDS[0]]
    selectedId = cfg.id
    const levelCap = characterLevelCap(save)
    const upgradeKey = (cfg.id + 'AtkLevel') as keyof GameSave['upgrades']
    const rawLevel = Number(save.upgrades[upgradeKey] ?? 0)
    const level = Math.min(rawLevel, levelCap)
    const cost = upgradeCost(rawLevel)
    const nextLevel = Math.min(level + 1, levelCap)
    const atkGrowthRate = cfg.upgradeAtkGrowthRate ?? 0.06
    const critGrowth = cfg.upgradeCritGrowth ?? 0.001
    const researchAtkMult = 1 + Number(save.upgrades.researchAtkLevel ?? 0) * 0.05
    const currentAtk = cfg.atk * (1 + atkGrowthRate * level) * researchAtkMult
    const nextAtk = cfg.atk * (1 + atkGrowthRate * nextLevel) * researchAtkMult
    const baseCrit = (cfg.baseCritChance ?? 0) * 100
    const currentCrit = Math.min(65, baseCrit + level * critGrowth * 100)
    const nextCrit = Math.min(65, baseCrit + nextLevel * critGrowth * 100)
    const cooldownNow = cfg.atkSpeed * (1 - Math.min(0.08, Math.floor(level / 10) * 0.005))
    const equipmentStats = equipmentStatBonus(save, cfg.id)
    const equippedBySlot = getEquippedBySlot(save, cfg.id)
    const canUpgrade = rawLevel < levelCap && save.credits >= cost

    screen.append(portraitStandee({
      className: cfg.id === 'blade' ? 'md-character-standee md-character-standee--blade' : 'md-character-standee',
      src: cfg.id === 'blade' ? BLADE_PORTRAIT_SRC : undefined,
      shadowColor: characterAccentColor(cfg.id),
      shadowAlpha: 0.42,
    }))

    const wrap = document.createElement('div')
    wrap.className = 'md-character-screen'

    const selector = document.createElement('div')
    selector.className = 'md-character-selector'
    PLAYABLE_CHARACTER_IDS.map(id => CHARACTERS[id]).forEach(ch => {
      const button = document.createElement('button')
      button.className = ch.id === selectedId ? 'md-character-chip is-selected' : 'md-character-chip'
      button.type = 'button'
      button.textContent = ch.emoji
      button.title = ch.name
      button.addEventListener('click', () => {
        selectedId = ch.id
        opts.onCharacterChanged(ch.id)
        render()
      })
      selector.append(button)
    })

    const info = document.createElement('div')
    info.className = 'md-character-info'
    info.style.setProperty('--md-char-accent', characterAccentColor(cfg.id))

    const heading = document.createElement('div')
    heading.className = 'md-character-heading'
    const name = document.createElement('div')
    name.className = 'md-character-name'
    name.textContent = cfg.name
    const lv = document.createElement('div')
    lv.className = 'md-character-level'
    lv.textContent = `Lv.${level}/${levelCap}`
    heading.append(name, lv)

    const desc = document.createElement('div')
    desc.className = 'md-character-desc'
    desc.textContent = cfg.description

    const stats = document.createElement('div')
    stats.className = 'md-character-stats'
    stats.append(
      statCell('攻撃', currentAtk.toFixed(1), formatStatBonus(currentAtk * (equipmentStats.atkMult - 1), 1)),
      statCell('冷却', `${(cooldownNow / 1000).toFixed(2)}秒`, formatStatBonus((cooldownNow * (equipmentStats.atkSpeedMult - 1)) / 1000, 2)),
      statCell('会心', `${currentCrit.toFixed(2)}%`, formatStatBonus(equipmentStats.critAdd * 100, 2)),
    )
    info.append(heading, desc, stats)

    const actions = document.createElement('div')
    actions.className = 'md-character-actions'
    const upgradeDesc = rawLevel >= levelCap ? `Lv.${level}/${levelCap} CAP` : `Lv.${level} -> ${nextLevel}  ${cost} CREDIT`
    const upgrade = edgeButton({
      icon: '>',
      title: '躯体強化（レベルアップ）',
      desc: upgradeDesc,
      disabled: !canUpgrade,
      onClick: () => showConfirm(
        `${cfg.name}\nLv.${level} -> Lv.${nextLevel}\n攻撃: ${currentAtk.toFixed(1)} -> ${nextAtk.toFixed(1)}\n会心: ${currentCrit.toFixed(2)}% -> ${nextCrit.toFixed(2)}%\n${cost} CREDIT で強化します。`,
        () => {
          if (buyCharacterUpgrade(upgradeKey, levelCap)) rerenderAfterSave()
        },
      ),
    })
    actions.append(upgrade)

    EQUIPMENT_SLOT_ORDER.forEach(slot => {
      const equipped = equippedBySlot.get(slot)
      const weapon = equipped ? WEAPONS[equipped.weaponId] : null
      actions.append(edgeButton({
        icon: weapon?.emoji ?? '>',
        title: weapon && equipped ? equipmentDisplayName(weapon.name, equipped.level) : equipmentSlotLabel(slot),
        desc: weapon && equipped ? equipmentEffectDescription(weapon, equipped.level) : '空き',
        onClick: () => {
          selectingSlot = slot
          render()
        },
      }))
    })

    wrap.append(selector, info, actions)
    screen.append(wrap)
  }

  const renderEquipmentList = (slot: EquipmentSlot) => {
    const save = loadSave()
    const current = getEquippedBySlot(save, selectedId).get(slot)
    const items = save.ownedWeapons.filter(owned => {
      const weapon = WEAPONS[owned.weaponId]
      return weapon?.slot === slot && canEquipWeaponToCharacter(weapon, selectedId)
    })

    const wrap = document.createElement('div')
    wrap.className = 'md-file-list'
    const header = document.createElement('div')
    header.className = 'md-file-header'

    const back = document.createElement('button')
    back.className = 'md-back-button'
    back.type = 'button'
    back.textContent = '< 戻る'
    back.addEventListener('click', () => {
      selectingSlot = null
      render()
    })

    const title = document.createElement('div')
    title.className = 'md-file-title'
    title.textContent = `${equipmentSlotLabel(slot)}を選択`

    const unequip = document.createElement('button')
    unequip.className = 'md-header-action'
    unequip.type = 'button'
    unequip.textContent = current ? '外す' : ''
    unequip.disabled = !current
    unequip.addEventListener('click', () => {
      if (current && unequipCharacterWeapon(selectedId, slot)) {
        selectingSlot = null
        rerenderAfterSave()
      }
    })

    header.append(back, title, unequip)
    const list = scrollList()
    if (items.length === 0) {
      list.append(emptyState('装備できるアイテムなし'))
    } else {
      items.forEach(owned => {
        const weapon = WEAPONS[owned.weaponId]
        if (!weapon) return
        const equippedByOther = !!owned.equippedCharId && owned.equippedCharId !== selectedId
        const equippedOwner = equippedByOther ? CHARACTERS[owned.equippedCharId!]?.name ?? owned.equippedCharId : null
        list.append(listRow({
          icon: weapon.emoji,
          iconColor: rarityColor(weapon.rarity),
          title: equipmentDisplayName(weapon.name, owned.level),
          detail: equipmentEffectDescription(weapon, owned.level),
          meta: owned.uid === current?.uid ? '装備中' : equippedOwner ? `${equippedOwner} 装備中` : weapon.rarity,
          disabled: equippedByOther,
          onClick: () => {
            if (!equippedByOther && equipWeaponToCharacter(owned.uid, selectedId, slot)) {
              selectingSlot = null
              rerenderAfterSave()
            }
          },
        }))
      })
    }
    wrap.append(header, list)
    screen.append(wrap)
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
    actions.append(dialogButton('はい', () => {
      overlay.remove()
      onYes()
    }), dialogButton('いいえ', () => overlay.remove(), true))
    dialog.append(body, actions)
    overlay.append(dialog)
    screen.append(overlay)
  }

  render()
  return {
    destroy: () => screen.remove(),
  }
}

function statCell(labelText: string, valueText: string, bonusText: string) {
  const cell = document.createElement('div')
  cell.className = 'md-character-stat'
  const label = document.createElement('span')
  label.className = 'md-character-stat__label'
  label.textContent = labelText
  const value = document.createElement('span')
  value.className = 'md-character-stat__value'
  value.textContent = valueText
  const bonus = document.createElement('span')
  bonus.className = 'md-character-stat__bonus'
  bonus.textContent = bonusText
  cell.append(label, value, bonus)
  return cell
}

function dialogButton(label: string, onClick: () => void, quiet = false) {
  const button = document.createElement('button')
  button.className = quiet ? 'md-dialog-button is-quiet' : 'md-dialog-button'
  button.type = 'button'
  button.textContent = label
  button.addEventListener('click', onClick)
  return button
}

function characterLevelCap(save: GameSave) {
  if (save.debugUnlockAllStages) return 30
  const highestCleared = save.clearedStages.reduce((max, id) => {
    const n = Number(id.replace('stage_', ''))
    return Number.isFinite(n) ? Math.max(max, n) : max
  }, 0)
  return Math.min(30, highestCleared + 1)
}

function buyCharacterUpgrade(key: keyof GameSave['upgrades'], levelCap: number) {
  const save = loadSave()
  const current = Number(save.upgrades[key] ?? 0)
  if (current >= levelCap) return false
  const cost = upgradeCost(current)
  if (save.credits < cost) return false
  save.credits -= cost
  save.upgrades[key] = current + 1
  saveGame(save)
  return true
}

function getEquippedBySlot(save: GameSave, charId: string) {
  const equipped = new Map<EquipmentSlot, OwnedWeapon>()
  for (const owned of save.ownedWeapons) {
    if (owned.equippedCharId !== charId) continue
    const weapon = WEAPONS[owned.weaponId]
    if (!weapon) continue
    equipped.set(weapon.slot, owned)
  }
  return equipped
}

function equipWeaponToCharacter(uid: string, charId: string, slot: EquipmentSlot) {
  const save = loadSave()
  const target = save.ownedWeapons.find(w => w.uid === uid)
  if (!target) return false
  const weapon = WEAPONS[target.weaponId]
  if (!weapon || weapon.slot !== slot || !canEquipWeaponToCharacter(weapon, charId)) return false
  for (const owned of save.ownedWeapons) {
    const otherWeapon = WEAPONS[owned.weaponId]
    if (owned.uid !== target.uid && owned.equippedCharId === charId && otherWeapon?.slot === slot) owned.equippedCharId = null
  }
  target.equippedCharId = charId
  saveGame(save)
  return true
}

function unequipCharacterWeapon(charId: string, slot: EquipmentSlot) {
  const save = loadSave()
  const target = save.ownedWeapons.find(w => w.equippedCharId === charId && WEAPONS[w.weaponId]?.slot === slot)
  if (!target) return false
  target.equippedCharId = null
  saveGame(save)
  return true
}

function formatStatBonus(value: number, digits: number) {
  if (Math.abs(value) < 0.005) return ''
  return value > 0 ? `+${value.toFixed(digits)}` : `-${Math.abs(value).toFixed(digits)}`
}

function rarityColor(rarity: keyof typeof RARITY_COLORS) {
  return '#' + RARITY_COLORS[rarity].toString(16).padStart(6, '0')
}

function characterAccentColor(charId: string) {
  if (charId === 'assault') return '#ffee00'
  if (charId === 'blade') return '#00E6CD'
  if (charId === 'orb') return '#9b6dff'
  if (charId === 'railgun') return '#ff6688'
  if (charId === 'field') return '#66dd88'
  if (charId === 'beam') return '#77e6ff'
  if (charId === 'stun') return '#ffffff'
  return '#ffdd66'
}
