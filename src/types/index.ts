export type AttackType = 'bullet' | 'burst' | 'field' | 'slash' | 'beam' | 'orb' | 'stun'
export type EnemyAbility = 'armor' | 'charge' | 'split' | 'warning_attack' | 'elite' | 'boss' | 'heal_aura'

export type AttackResult =
  | { kind: 'bullet'; tx: number; ty: number }
  | { kind: 'burst';  tx: number; ty: number }
  | { kind: 'field_bolt'; tx: number; ty: number }
  | { kind: 'slash'; tx: number; ty: number }
  | { kind: 'beam'; tx: number; ty: number }
  | { kind: 'orb'; tx: number; ty: number }
  | { kind: 'stun_shot'; tx: number; ty: number }

export interface CharacterConfig {
  id: string
  emoji: string
  name: string
  description: string
  attackType: AttackType
  atk: number
  atkSpeed: number    // ms between shots (lower = faster)
  range: number       // px
  bulletSpeed: number  // px/s
  baseCritChance?: number
  baseBurstCount?: number
  upgradeAtkGrowth?: number
  upgradeAtkGrowthRate?: number
  upgradeCritGrowth?: number
}

export interface EnemyConfig {
  id: string
  name: string
  emoji: string
  description?: string
  hp: number
  speed: number       // px/s downward
  damage: number      // barricade damage on contact
  expReward: number
  size: number        // collision radius
  color?: number
  abilities?: EnemyAbility[]
  knockbackResist?: number // 0 = full knockback, 1 = immune
}

export interface SpawnEntry {
  time: number        // seconds since stage start
  enemyId: string
  count: number
  spread: number      // x spread in px
  duration?: number   // seconds to trickle-spawn this entry; 0 = instant
  hpMult?: number
}

export interface AmbientSpawnConfig {
  start: number
  end: number
  interval: number
  enemyId: string
  count: number
  spread: number
  hpMult?: number
}

export interface StageConfig {
  id: string
  name: string
  description: string
  difficulty: number  // 1-5
  barricadeHp: number
  enemyHpMult?: number
  startingCharacter: string
  spawnTable: SpawnEntry[]
  ambientSpawns?: AmbientSpawnConfig[]
}

export type UpgradeCategory = 'add_character' | 'stat_boost' | 'special'

export interface UpgradeOption {
  id: string
  category: UpgradeCategory
  name: string
  description: string
  emoji: string
  weight: number
  maxStack: number    // -1 = unlimited
  canAppear: (state: BattleState) => boolean
  apply: (state: BattleState) => void
}

export interface BattleState {
  characterCount: number
  level: number
  acquiredUpgrades: Map<string, number>
  addCharacter: (id: string) => void
  hasCharacter: (id: string) => boolean
  boostCharAtk: (charId: string, mult: number) => void
  boostCharAtkSpeed: (charId: string, mult: number) => void
  boostCharArea: (charId: string, mult: number) => void
  boostCharCrit: (charId: string, add: number) => void
  addCharAction: (charId: string) => void
  addCharBurst: (charId: string) => void
  enableStunBlast: (charId: string) => void
  enableCharPiercing: (charId: string) => void
}

export interface WeaponConfig {
  id: string
  emoji: string
  name: string
  description: string
  rarity: WeaponRarity
  slot: EquipmentSlot
  equipGroup: EquipmentEquipGroup
  atkMult: number
  atkSpeedMult: number  // < 1 = faster
  rangeMult: number
  critChance: number
}

export type WeaponRarity = 'N' | 'R' | 'SR' | 'SSR'
export type EquipmentSlot = 'weapon' | 'sensor' | 'module' | 'core'
export type EquipmentEquipGroup = 'all' | 'non_blade' | 'blade_only'

export interface OwnedWeapon {
  uid: string
  weaponId: string
  equippedCharId: string | null
  level: number
  rarity?: WeaponRarity
}

export interface CharacterDamageStat {
  characterId: string
  damage: number
}

export interface PermanentUpgrades {
  assaultAtkLevel: number
  assaultCooldownLevel: number
  railgunAtkLevel: number
  railgunCooldownLevel: number
  rapidAtkLevel: number
  rapidCooldownLevel: number
  bladeAtkLevel: number
  bladeCooldownLevel: number
  fieldAtkLevel: number
  fieldCooldownLevel: number
  beamAtkLevel: number
  beamCooldownLevel: number
  orbAtkLevel: number
  orbCooldownLevel: number
  stunAtkLevel: number
  stunCooldownLevel: number
  barricadeHpLevel: number
  equipmentLevel: number
  researchLevel: number
  researchExpLevel: number
  researchAtkLevel: number
  researchCooldownLevel: number
  researchRangeLevel: number
  researchProjectileLevel: number
  researchBarricadeLevel: number
}

export interface GameSave {
  clearedStages: string[]
  ownedWeapons: OwnedWeapon[]
  credits: number
  upgrades: PermanentUpgrades
  debugUnlockAllStages: boolean
}
