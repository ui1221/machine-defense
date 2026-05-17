import type { GameSave } from '../types'

export interface ResearchItem {
  id: keyof GameSave['upgrades']
  icon: string
  name: string
  description: string
  maxLevel: number
  valueText: (level: number) => string
  nextText: (level: number) => string
  cost: (level: number) => number
}

export const RESEARCH_ITEMS: ResearchItem[] = [
  {
    id: 'researchExpLevel',
    icon: 'XP',
    name: '経験値増加',
    description: '敵から得るEXPを増やす',
    maxLevel: 5,
    valueText: level => `現在 +${level * 4}%`,
    nextText: level => `次 +${(level + 1) * 4}%`,
    cost: level => 500 + level * 300,
  },
  {
    id: 'researchAtkLevel',
    icon: 'ATK',
    name: '攻撃力増加',
    description: '全キャラの攻撃力を上げる',
    maxLevel: 5,
    valueText: level => `現在 +${level * 5}%`,
    nextText: level => `次 +${(level + 1) * 5}%`,
    cost: level => 500 + level * 300,
  },
  {
    id: 'researchCooldownLevel',
    icon: 'CD',
    name: 'クールタイム減少',
    description: '全キャラの冷却を少し短縮',
    maxLevel: 5,
    valueText: level => `現在 -${level}%`,
    nextText: level => `次 -${level + 1}%`,
    cost: level => 500 + level * 300,
  },
  {
    id: 'researchRangeLevel',
    icon: 'RG',
    name: '攻撃範囲増加',
    description: '索敵範囲と一部範囲攻撃を広げる',
    maxLevel: 5,
    valueText: level => `現在 +${level * 2}%`,
    nextText: level => `次 +${(level + 1) * 2}%`,
    cost: level => 500 + level * 300,
  },
  {
    id: 'researchProjectileLevel',
    icon: '+1',
    name: '弾数増加',
    description: 'ビーム・ブレード以外の行動回数 +1',
    maxLevel: 1,
    valueText: level => level > 0 ? '解放済み' : '未解放',
    nextText: () => '行動回数 +1',
    cost: () => 5000,
  },
  {
    id: 'researchBarricadeLevel',
    icon: 'HP',
    name: 'バリケード強化',
    description: '戦闘開始時のバリケード最大HPを増やす',
    maxLevel: 5,
    valueText: level => `現在 +${level * 50} HP`,
    nextText: level => `次 +${(level + 1) * 50} HP`,
    cost: level => 300 + level * 100,
  },
]
