import { canEquipWeaponToCharacter, WEAPONS } from '../data/weapons'
import type { GameSave, OwnedWeapon, WeaponConfig, WeaponRarity } from '../types'

export const ENHANCEMENT_MAX_LEVEL: Record<WeaponRarity, number> = {
  N: 3,
  R: 5,
  SR: 7,
  SSR: 10,
}

export const ENHANCEMENT_COSTS = [1, 2, 4, 7, 10, 13, 16, 19, 22, 26] as const

export const SELL_JUNK_PARTS: Record<WeaponRarity, number> = {
  N: 1,
  R: 2,
  SR: 3,
  SSR: 5,
}

export interface EquipmentStatBonus {
  atkMult: number
  atkSpeedMult: number
  rangeMult: number
  areaMult: number
  critAdd: number
}

export function equipmentDisplayName(name: string, level: number) {
  return level > 0 ? `${name} +${level}` : name
}

export function isEnhanceableEquipment(owned: OwnedWeapon) {
  return WEAPONS[owned.weaponId]?.slot === 'weapon'
}

export function enhancementMaxLevel(owned: OwnedWeapon) {
  const weapon = WEAPONS[owned.weaponId]
  return weapon ? ENHANCEMENT_MAX_LEVEL[weapon.rarity] : 0
}

export function nextEnhancementCost(level: number) {
  return ENHANCEMENT_COSTS[level] ?? 0
}

export function sellJunkParts(owned: OwnedWeapon) {
  const weapon = WEAPONS[owned.weaponId]
  return weapon ? SELL_JUNK_PARTS[weapon.rarity] : 0
}

export function equipmentStatBonus(save: GameSave, charId: string): EquipmentStatBonus {
  const result: EquipmentStatBonus = { atkMult: 1, atkSpeedMult: 1, rangeMult: 1, areaMult: 1, critAdd: 0 }
  const permanentBonus = 1 + save.upgrades.equipmentLevel * 0.03
  for (const owned of save.ownedWeapons) {
    if (owned.equippedCharId !== charId) continue
    const weapon = WEAPONS[owned.weaponId]
    if (!weapon || !canEquipWeaponToCharacter(weapon, charId)) continue
    applyEquipmentBonus(result, weapon, owned, permanentBonus)
  }
  return result
}

function applyEquipmentBonus(result: EquipmentStatBonus, weapon: WeaponConfig, owned: OwnedWeapon, permanentBonus: number) {
  const enhancementLevel = weapon.slot === 'weapon' ? Math.max(0, Math.min(owned.level, ENHANCEMENT_MAX_LEVEL[weapon.rarity])) : 0
  const bonus = permanentBonus * (1 + enhancementLevel * 0.1)

  if (weapon.atkMult !== 1) result.atkMult *= 1 + (weapon.atkMult - 1) * bonus
  if (weapon.atkSpeedMult < 1) result.atkSpeedMult *= 1 + (weapon.atkSpeedMult - 1) * bonus
  if (weapon.atkSpeedMult > 1) result.atkSpeedMult *= weapon.atkSpeedMult
  if (weapon.rangeMult !== 1) result.rangeMult *= 1 + (weapon.rangeMult - 1) * bonus
  if (weapon.areaMult && weapon.areaMult !== 1) result.areaMult *= 1 + (weapon.areaMult - 1) * bonus
  if (weapon.critChance > 0) result.critAdd += weapon.critChance * bonus
}
