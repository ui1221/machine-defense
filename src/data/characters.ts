import type { CharacterConfig } from '../types'

export const CHARACTERS: Record<string, CharacterConfig> = {
  assault: {
    id: 'assault',
    emoji: '🤖',
    name: 'アサルト型',
    description: '標準的な射撃ユニット。扱いやすいが、強化なしでは火力不足になりやすい。',
    attackType: 'bullet',
    atk: 4,
    atkSpeed: 1100,
    range: 820,
    bulletSpeed: 800,
  },
  railgun: {
    id: 'railgun',
    emoji: '🎯',
    name: 'レールガン型',
    description: '単発高威力の貫通弾を撃つ。クールタイムは長い。',
    attackType: 'bullet',
    atk: 16,
    atkSpeed: 5200,
    range: 900,
    bulletSpeed: 1200,
  },
  rapid: {
    id: 'rapid',
    emoji: '⚡',
    name: 'ラピッド型',
    description: '低威力の連射型。強化で同時発射数が増える。',
    attackType: 'burst',
    atk: 2,
    atkSpeed: 1300,
    range: 780,
    bulletSpeed: 1000,
  },
  blade: {
    id: 'blade',
    emoji: '🛡️',
    name: 'ブレード型',
    description: '狭い範囲を高威力で斬る。ノックバック付きで、クールタイムは長い。',
    attackType: 'slash',
    atk: 14,
    atkSpeed: 4200,
    range: 450,
    bulletSpeed: 0,
  },
  field: {
    id: 'field',
    emoji: '🧪',
    name: 'フィールド型',
    description: '着弾地点にダメージ床を作る制圧型。初期火力は控えめ。',
    attackType: 'field',
    atk: 4,
    atkSpeed: 5200,
    range: 820,
    bulletSpeed: 550,
  },
}

export const CHAR_ATK_MAX = 20
export const CHAR_SPEED_MAX_MS = 5500
export const CHAR_SPEED_MIN_MS = 400
