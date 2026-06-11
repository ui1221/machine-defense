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

export function equipmentEffectDescription(weapon: WeaponConfig, level: number) {
  const bonus = enhancementBonusMultiplier(weapon, level)
  const parts: string[] = []

  if (weapon.atkMult !== 1) {
    parts.push(`${STAT_LABELS.atk} ${formatSignedPercent((enhancedMultiplier(weapon.atkMult, bonus) - 1) * 100)}`)
  }
  if (weapon.atkSpeedMult !== 1) {
    const speedMult = weapon.atkSpeedMult < 1
      ? enhancedMultiplier(weapon.atkSpeedMult, bonus)
      : weapon.atkSpeedMult
    parts.push(`${STAT_LABELS.cooldown} ${formatSignedPercent((speedMult - 1) * 100)}`)
  }
  if (weapon.rangeMult !== 1) {
    parts.push(`${STAT_LABELS.range} ${formatSignedPercent((enhancedMultiplier(weapon.rangeMult, bonus) - 1) * 100)}`)
  }
  if (weapon.areaMult && weapon.areaMult !== 1) {
    parts.push(`${STAT_LABELS.area} ${formatSignedPercent((enhancedMultiplier(weapon.areaMult, bonus) - 1) * 100)}`)
  }
  if (weapon.critChance > 0) {
    parts.push(`${STAT_LABELS.crit} ${formatSignedPercent(weapon.critChance * bonus * 100)}`)
  }

  return parts.length > 0 ? parts.join(' / ') : weapon.description
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

function enhancementBonusMultiplier(weapon: WeaponConfig, level: number) {
  if (weapon.slot !== 'weapon') return 1
  const enhancementLevel = Math.max(0, Math.min(level, ENHANCEMENT_MAX_LEVEL[weapon.rarity]))
  return 1 + enhancementLevel * 0.1
}

function enhancedMultiplier(multiplier: number, bonus: number) {
  return 1 + (multiplier - 1) * bonus
}

function formatSignedPercent(value: number) {
  const rounded = Math.round(value * 10) / 10
  const text = Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)
  return rounded > 0 ? `+${text}%` : `${text}%`
}

const STAT_LABELS = {
  atk: '\u653b\u6483',
  cooldown: '\u30af\u30fc\u30eb\u30bf\u30a4\u30e0',
  range: '\u5c04\u7a0b',
  area: '\u653b\u6483\u7bc4\u56f2',
  crit: '\u4f1a\u5fc3\u7387',
}
