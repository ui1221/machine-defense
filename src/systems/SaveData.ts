import type { GameSave, GameSettings, OwnedWeapon, PermanentUpgrades } from '../types'
import { canEquipWeaponToCharacter, WEAPONS } from '../data/weapons'

export const SAVE_KEY = 'td_save'
const RETIRED_CHARACTER_IDS = new Set(['rapid'])

export const DEFAULT_UPGRADES: PermanentUpgrades = {
  assaultAtkLevel: 0,
  assaultCooldownLevel: 0,
  railgunAtkLevel: 0,
  railgunCooldownLevel: 0,
  rapidAtkLevel: 0,
  rapidCooldownLevel: 0,
  bladeAtkLevel: 0,
  bladeCooldownLevel: 0,
  fieldAtkLevel: 0,
  fieldCooldownLevel: 0,
  beamAtkLevel: 0,
  beamCooldownLevel: 0,
  orbAtkLevel: 0,
  orbCooldownLevel: 0,
  stunAtkLevel: 0,
  stunCooldownLevel: 0,
  barricadeHpLevel: 0,
  equipmentLevel: 0,
  researchLevel: 0,
  researchExpLevel: 0,
  researchAtkLevel: 0,
  researchCooldownLevel: 0,
  researchRangeLevel: 0,
  researchProjectileLevel: 0,
  researchBarricadeLevel: 0,
}

export const DEFAULT_SETTINGS: GameSettings = {
  enableQuadSpeed: false,
  enableAutoLevelUp: false,
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

export function markStagePlayed(stageId: string): GameSave {
  const save = loadSave()
  save.lastPlayedStageId = stageId
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
  const rawUpgrades = (raw.upgrades ?? {}) as Partial<PermanentUpgrades>
  const assaultAtkLevel = Math.max(rawUpgrades.assaultAtkLevel ?? 0, rawUpgrades.rapidAtkLevel ?? 0)
  const assaultCooldownLevel = Math.max(rawUpgrades.assaultCooldownLevel ?? 0, rawUpgrades.rapidCooldownLevel ?? 0)

  return {
    clearedStages: Array.isArray(raw.clearedStages) ? raw.clearedStages : [],
    lastPlayedStageId: typeof raw.lastPlayedStageId === 'string' ? raw.lastPlayedStageId : undefined,
    ownedWeapons: Array.isArray(raw.ownedWeapons) ? raw.ownedWeapons.map(normalizeOwnedWeapon) : [],
    credits: typeof raw.credits === 'number' ? raw.credits : 0,
    junkParts: typeof raw.junkParts === 'number' ? raw.junkParts : 0,
    upgrades: {
      ...DEFAULT_UPGRADES,
      ...rawUpgrades,
      assaultAtkLevel,
      assaultCooldownLevel,
      rapidAtkLevel: 0,
      rapidCooldownLevel: 0,
    },
    settings: {
      ...DEFAULT_SETTINGS,
      ...raw.settings,
    },
    debugUnlockAllStages: raw.debugUnlockAllStages === true,
  }
}

export function upgradeCost(level: number) {
  return 80 + level * 65
}

function normalizeOwnedWeapon(raw: Partial<OwnedWeapon>): OwnedWeapon {
  const weaponId = typeof raw.weaponId === 'string' ? raw.weaponId : ''
  const equippedCharId = typeof raw.equippedCharId === 'string'
    && !RETIRED_CHARACTER_IDS.has(raw.equippedCharId)
    && WEAPONS[weaponId]
    && canEquipWeaponToCharacter(WEAPONS[weaponId], raw.equippedCharId)
    ? raw.equippedCharId
    : null
  return {
    uid: typeof raw.uid === 'string' ? raw.uid : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    weaponId,
    equippedCharId,
    level: typeof raw.level === 'number' ? raw.level : 0,
    rarity: raw.rarity ?? WEAPONS[weaponId]?.rarity,
  }
}
