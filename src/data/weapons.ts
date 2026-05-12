import type { WeaponConfig, WeaponRarity } from '../types'

export const WEAPONS: Record<string, WeaponConfig> = {
  light_blade: {
    id: 'light_blade',
    emoji: '▱',
    name: '軽量ブレード',
    description: '攻撃力 +15%',
    rarity: 'N',
    atkMult: 1.15,
    atkSpeedMult: 1,
    rangeMult: 1,
    critChance: 0,
  },
  accel_module: {
    id: 'accel_module',
    emoji: '»',
    name: '加速モジュール',
    description: 'クールタイム -18%',
    rarity: 'N',
    atkMult: 1,
    atkSpeedMult: 0.82,
    rangeMult: 1,
    critChance: 0,
  },
  reinforced_blade: {
    id: 'reinforced_blade',
    emoji: '▰',
    name: '強化ブレード',
    description: '攻撃力 +28% / 会心率 +2%',
    rarity: 'R',
    atkMult: 1.28,
    atkSpeedMult: 1,
    rangeMult: 1,
    critChance: 0.02,
  },
  control_core: {
    id: 'control_core',
    emoji: '◎',
    name: '制御コア',
    description: '攻撃力 +18% / クールタイム -8% / 会心率 +2%',
    rarity: 'R',
    atkMult: 1.18,
    atkSpeedMult: 0.92,
    rangeMult: 1,
    critChance: 0.02,
  },
  sensor_unit: {
    id: 'sensor_unit',
    emoji: '◉',
    name: 'センサー拡張',
    description: '索敵範囲 +25% / 会心率 +3%',
    rarity: 'R',
    atkMult: 1,
    atkSpeedMult: 1,
    rangeMult: 1.25,
    critChance: 0.03,
  },
  heavy_blade: {
    id: 'heavy_blade',
    emoji: '◆',
    name: '高出力ブレード',
    description: '攻撃力 +48% / クールタイム +18% / 会心率 +4%',
    rarity: 'SR',
    atkMult: 1.48,
    atkSpeedMult: 1.18,
    rangeMult: 1,
    critChance: 0.04,
  },
  overdrive_core: {
    id: 'overdrive_core',
    emoji: '✦',
    name: '過駆動コア',
    description: '攻撃力 +35% / クールタイム -12% / 会心率 +4%',
    rarity: 'SR',
    atkMult: 1.35,
    atkSpeedMult: 0.88,
    rangeMult: 1,
    critChance: 0.04,
  },
  singularity_unit: {
    id: 'singularity_unit',
    emoji: '✹',
    name: '特異点ユニット',
    description: '攻撃力 +45% / クールタイム -18% / 索敵範囲 +15% / 会心率 +6%',
    rarity: 'SSR',
    atkMult: 1.45,
    atkSpeedMult: 0.82,
    rangeMult: 1.15,
    critChance: 0.06,
  },
}

export const WEAPON_IDS = Object.keys(WEAPONS)
export const WEAPON_DROP_RATE = 0.001

export const RARITY_COLORS: Record<WeaponRarity, number> = {
  N: 0x9aa4b2,
  R: 0x55aaff,
  SR: 0xc77dff,
  SSR: 0xffcc44,
}

export const RARITY_WEIGHTS: Record<WeaponRarity, number> = {
  N: 72,
  R: 23,
  SR: 4.5,
  SSR: 0.5,
}
