import type { GameSave } from '../types'

export type LobbyLineTrigger = 'idle' | 'tap' | 'return'

export interface LobbyLineContext {
  save: GameSave
  canUpgradeCharacter: boolean
  hasAnyResearch: boolean
}

export interface LobbyLine {
  id: string
  text: string
  trigger?: LobbyLineTrigger
  weight?: number
  condition?: (context: LobbyLineContext) => boolean
}

export const LOBBY_LINES: LobbyLine[] = [
  {
    id: 'idle_ready',
    trigger: 'idle',
    text: '準備はできています。出撃先を選んでください。',
    weight: 3,
  },
  {
    id: 'idle_check_equipment',
    trigger: 'idle',
    text: '（出る前に、装備の噛み合わせを見ておこうかな。）',
    weight: 2,
  },
  {
    id: 'idle_body_tune',
    trigger: 'idle',
    text: '（技師に躯体の調節をしてもらおうかな。）',
    weight: 2,
  },
  {
    id: 'idle_research',
    trigger: 'idle',
    text: '研究を進めれば、部隊全体の戦闘効率が上がります。',
    weight: 2,
    condition: ({ hasAnyResearch }) => !hasAnyResearch,
  },
  {
    id: 'idle_credits',
    trigger: 'idle',
    text: 'クレジットが貯まっています。ショップで補給できます。',
    weight: 3,
    condition: ({ save }) => save.credits >= 1000,
  },
  {
    id: 'idle_upgrade_available',
    trigger: 'idle',
    text: '（今なら、躯体強化を進められそう。）',
    weight: 3,
    condition: ({ canUpgradeCharacter }) => canUpgradeCharacter,
  },
  {
    id: 'tap_default',
    trigger: 'tap',
    text: 'いつでも出られます。必要なら、先に拠点で整備しましょう。',
    weight: 3,
  },
  {
    id: 'tap_self_check',
    trigger: 'tap',
    text: '（反応系に少し違和感……次の整備で見てもらおう。）',
    weight: 2,
  },
  {
    id: 'tap_shop',
    trigger: 'tap',
    text: 'クレジットがあれば、補給や研究を進められます。',
    weight: 2,
    condition: ({ save }) => save.credits >= 500,
  },
  {
    id: 'return_default',
    trigger: 'return',
    text: '帰還しました。装備と研究を確認して、次の出撃に備えましょう。',
    weight: 3,
  },
  {
    id: 'return_monologue',
    trigger: 'return',
    text: '（次はもう少し、楽に押し返せるようにしておきたいな。）',
    weight: 2,
  },
  {
    id: 'return_credits',
    trigger: 'return',
    text: 'クレジットを獲得しました。ショップで使い道を確認できます。',
    weight: 2,
    condition: ({ save }) => save.credits >= 500,
  },
]
