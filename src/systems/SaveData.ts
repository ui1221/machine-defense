import type { GameSave, OwnedWeapon, PermanentUpgrades } from '../types'
import { WEAPONS } from '../data/weapons'

export const SAVE_KEY = 'td_save'

export const DEFAULT_UPGRADES: PermanentUpgrades = {
  assaultAtkLevel: 0,
  assaultCooldownLevel: 0,
  barricadeHpLevel: 0,
  equipmentLevel: 0,
}

export function loadSave(): GameSave {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<GameSave>
      return normalizeSave(parsed)
    }
  } catch { /* ignore */ }
  return normalizeSave({})
}

export function saveGame(save: GameSave) {
  localStorage.setItem(SAVE_KEY, JSON.stringify(normalizeSave(save)))
}

export function addCredits(amount: number): GameSave {
  const save = loadSave()
  save.credits += amount
  saveGame(save)
  return save
}

export function markStageCleared(stageId: string): GameSave {
  const save = loadSave()
  if (!save.clearedStages.includes(stageId)) save.clearedStages.push(stageId)
  saveGame(save)
  return save
}

export function addOwnedWeapons(weaponIds: string[]): GameSave {
  const save = loadSave()
  for (const weaponId of weaponIds) {
    const uid = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
    const owned: OwnedWeapon = { uid, weaponId, equippedCharId: null, level: 0, rarity: WEAPONS[weaponId]?.rarity }
    save.ownedWeapons.push(owned)
  }
  saveGame(save)
  return save
}

export function normalizeSave(raw: Partial<GameSave>): GameSave {
  return {
    clearedStages: Array.isArray(raw.clearedStages) ? raw.clearedStages : [],
    ownedWeapons: Array.isArray(raw.ownedWeapons) ? raw.ownedWeapons.map(normalizeOwnedWeapon) : [],
    credits: typeof raw.credits === 'number' ? raw.credits : 0,
    upgrades: {
      ...DEFAULT_UPGRADES,
      ...(raw.upgrades ?? {}),
    },
    debugUnlockAllStages: raw.debugUnlockAllStages === true,
  }
}

export function upgradeCost(level: number) {
  return 80 + level * 60
}

function normalizeOwnedWeapon(raw: Partial<OwnedWeapon>): OwnedWeapon {
  const weaponId = typeof raw.weaponId === 'string' ? raw.weaponId : ''
  return {
    uid: typeof raw.uid === 'string' ? raw.uid : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    weaponId,
    equippedCharId: typeof raw.equippedCharId === 'string' ? raw.equippedCharId : null,
    level: typeof raw.level === 'number' ? raw.level : 0,
    rarity: raw.rarity ?? WEAPONS[weaponId]?.rarity,
  }
}
