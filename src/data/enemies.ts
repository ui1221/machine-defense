import type { EnemyConfig } from '../types'

export const ENEMIES: Record<string, EnemyConfig> = {
  basic: {
    id: 'basic', name: '基本型', emoji: '⚙️',
    description: '標準的な性能の敵。',
    hp: 15, speed: 9, damage: 5, expReward: 5, size: 18, color: 0x7c8aa0,
  },
  light: {
    id: 'light', name: '軽量型', emoji: '◇',
    description: 'やや速く、耐久は低い。',
    hp: 9, speed: 14, damage: 3, expReward: 4, size: 15, color: 0x8fc7ff,
  },
  fast: {
    id: 'fast', name: '高速型', emoji: '🔺',
    description: '速度が高いが、HPは低め。',
    hp: 10, speed: 17, damage: 3, expReward: 4, size: 16, color: 0xffaa55,
  },
  runner: {
    id: 'runner', name: '突進型', emoji: '◆',
    description: '非常に速いが、HPはかなり低い。',
    hp: 5, speed: 40, damage: 4, expReward: 3, size: 14, color: 0xff6655,
  },
  brute: {
    id: 'brute', name: '重装型', emoji: '⬢',
    description: '遅いが高HP。',
    hp: 60, speed: 6, damage: 15, expReward: 15, size: 24, color: 0xb090ff,
    knockbackResist: 0.45,
  },
  guard: {
    id: 'guard', name: '防盾型', emoji: '▣',
    description: '高めのHPで前線に残りやすい。',
    hp: 42, speed: 7, damage: 8, expReward: 10, size: 22, color: 0x55aaff,
    knockbackResist: 0.35,
  },
  swarm: {
    id: 'swarm', name: '群体型', emoji: '·',
    description: '低HPの大量出現枠。',
    hp: 4, speed: 16, damage: 1, expReward: 1, size: 10, color: 0xaaffaa,
  },
  dense: {
    id: 'dense', name: '密集型', emoji: '●',
    description: '基本型より少し硬い。',
    hp: 20, speed: 8, damage: 6, expReward: 6, size: 17, color: 0x99ddff,
  },
  charger: {
    id: 'charger', name: '加速型', emoji: '▶',
    description: '中盤以降で加速する。',
    hp: 18, speed: 22, damage: 6, expReward: 6, size: 17, color: 0xffcc44,
    abilities: ['charge'],
  },
  armored: {
    id: 'armored', name: '装甲型', emoji: '■',
    description: '受けるダメージを軽減する。',
    hp: 85, speed: 5, damage: 18, expReward: 18, size: 25, color: 0x999999,
    abilities: ['armor'],
    knockbackResist: 0.55,
  },
  fragile: {
    id: 'fragile', name: '脆弱型', emoji: '△',
    description: '速いが、ほぼ一撃で倒せる。',
    hp: 3, speed: 28, damage: 2, expReward: 2, size: 12, color: 0xffdddd,
  },
  striker: {
    id: 'striker', name: '打撃型', emoji: '✦',
    description: 'バリケードへの攻撃力が高め。',
    hp: 24, speed: 10, damage: 12, expReward: 8, size: 18, color: 0xff7799,
  },
  carrier: {
    id: 'carrier', name: '搬送型', emoji: '⬡',
    description: '撃破時に小型敵を放出する。',
    hp: 36, speed: 8, damage: 6, expReward: 11, size: 21, color: 0xddbb66,
    abilities: ['split'],
  },
  needle: {
    id: 'needle', name: '細身型', emoji: '▴',
    description: '速度が高く、当たり判定が小さい。',
    hp: 7, speed: 24, damage: 3, expReward: 3, size: 11, color: 0xee88ff,
  },
  crawler: {
    id: 'crawler', name: '低速型', emoji: '▾',
    description: '非常に遅いが、HPと攻撃力が高め。',
    hp: 30, speed: 4, damage: 10, expReward: 8, size: 20, color: 0x77cc88,
    knockbackResist: 0.4,
  },
  core: {
    id: 'core', name: '中核型', emoji: '◎',
    description: '高めのHPと報酬を持つ中型敵。',
    hp: 50, speed: 9, damage: 10, expReward: 14, size: 23, color: 0xff88dd,
  },
  breaker: {
    id: 'breaker', name: '破砕型', emoji: '✖',
    description: '攻撃前に警告を出し、バリケードへ大きなダメージを与える。',
    hp: 45, speed: 8, damage: 20, expReward: 13, size: 22, color: 0xff5555,
    abilities: ['warning_attack'],
  },
  scout: {
    id: 'scout', name: '索敵型', emoji: '◌',
    description: '軽く速い撹乱役。',
    hp: 8, speed: 20, damage: 2, expReward: 3, size: 13, color: 0x66ffee,
  },
  medic: {
    id: 'medic', name: '修復型', emoji: '✚',
    description: '本人は脆いが、近くの敵を少しずつ修復する。',
    hp: 12, speed: 10, damage: 2, expReward: 7, size: 16, color: 0x77ffaa,
    abilities: ['heal_aura'],
  },
  mass: {
    id: 'mass', name: '質量型', emoji: '⬛',
    description: '超低速、高HP、高攻撃力。',
    hp: 110, speed: 3, damage: 25, expReward: 24, size: 28, color: 0x666677,
    knockbackResist: 0.7,
  },
  elite: {
    id: 'elite', name: '精鋭型', emoji: '✹',
    description: '軽い装甲を持ち、HPが減ると加速する。',
    hp: 70, speed: 12, damage: 16, expReward: 22, size: 24, color: 0xffdd66,
    abilities: ['elite'],
  },
  boss_siege: {
    id: 'boss_siege', name: '大型制圧型', emoji: '⬣',
    description: '区画を制圧するための大型機。遅いが、非常に高い耐久と強い攻撃を持つ。',
    hp: 650, speed: 6, damage: 30, expReward: 80, size: 42, color: 0xff8844,
    abilities: ['warning_attack', 'boss'],
    knockbackResist: 0.95,
  },
}
