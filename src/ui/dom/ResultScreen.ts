import { CHARACTERS } from '../../data/characters'
import { RARITY_COLORS, WEAPONS } from '../../data/weapons'
import type { CharacterDamageStat } from '../../types'
import type { DomScreen } from './mount'
import { portraitStandee } from './standee'

export interface ResultScreenOptions {
  victory: boolean
  stageName: string
  creditReward: number
  killCount: number
  level: number
  droppedWeapons: string[]
  damageStats: CharacterDamageStat[]
  onRetry: () => void
  onHome: () => void
}

export function mountResultScreen(root: HTMLElement, opts: ResultScreenOptions): DomScreen {
  const screen = document.createElement('div')
  screen.className = 'md-ui-screen md-result-screen'

  screen.append(portraitStandee({
    className: opts.victory ? 'md-result-standee' : 'md-result-standee is-failed',
    shadowColor: '#ffee00',
    shadowAlpha: 0.34,
  }))

  const sheet = document.createElement('section')
  sheet.className = 'md-result-sheet'
  sheet.append(
    titleBlock(opts.victory, opts.stageName),
    rewardBlock(opts),
    damageBlock(opts.damageStats),
  )
  screen.append(sheet)

  const buttons = document.createElement('div')
  buttons.className = 'md-result-buttons'
  if (!opts.victory) {
    buttons.append(resultButton({
      className: 'is-danger',
      title: '再挑戦',
      desc: '同じ区画にもう一度出撃する',
      onClick: opts.onRetry,
    }))
  }
  buttons.append(resultButton({
    className: 'is-safe',
    title: '拠点に戻る',
    desc: '報酬を確認して拠点へ戻る',
    onClick: opts.onHome,
  }))
  screen.append(buttons)

  root.append(screen)
  return {
    destroy: () => screen.remove(),
  }
}

function titleBlock(victory: boolean, stageName: string) {
  const block = document.createElement('div')
  block.className = 'md-result-title'
  const title = document.createElement('div')
  title.className = victory ? 'md-result-title__main is-clear' : 'md-result-title__main is-failed'
  title.textContent = victory ? 'STAGE CLEAR' : 'MISSION FAILED'
  const stage = document.createElement('div')
  stage.className = 'md-result-title__stage'
  stage.textContent = stageName
  block.append(title, stage)
  return block
}

function rewardBlock(opts: ResultScreenOptions) {
  const block = document.createElement('section')
  block.className = 'md-result-reward'
  const heading = document.createElement('h2')
  heading.className = 'md-result-section-title'
  heading.textContent = '獲得報酬'
  block.append(heading)

  block.append(
    resultPair('CREDIT', `${opts.creditReward}`, 'is-credit'),
    resultStats(opts.killCount, opts.level),
    rewardItem(opts.droppedWeapons),
  )
  return block
}

function resultPair(labelText: string, valueText: string, valueClass = '') {
  const row = document.createElement('div')
  row.className = 'md-result-pair'
  const label = document.createElement('span')
  label.className = 'md-result-label'
  label.textContent = labelText
  const value = document.createElement('span')
  value.className = `md-result-value ${valueClass}`.trim()
  value.textContent = valueText
  row.append(label, value)
  return row
}

function resultStats(killCount: number, level: number) {
  const row = document.createElement('div')
  row.className = 'md-result-stats'
  row.append(
    statText('撃破数', `${killCount}`),
    statText('到達Lv', `${level}`),
  )
  return row
}

function statText(labelText: string, valueText: string) {
  const group = document.createElement('div')
  group.className = 'md-result-stat'
  const label = document.createElement('span')
  label.className = 'md-result-label'
  label.textContent = labelText
  const value = document.createElement('span')
  value.className = 'md-result-value'
  value.textContent = valueText
  group.append(label, value)
  return group
}

function rewardItem(droppedWeapons: string[]) {
  const row = document.createElement('div')
  row.className = 'md-result-item'
  const label = document.createElement('span')
  label.className = 'md-result-label'
  label.textContent = '入手装備'
  row.append(label)

  const firstWeapon = WEAPONS[droppedWeapons[0]]
  if (!firstWeapon) {
    const none = document.createElement('span')
    none.className = 'md-result-item__none'
    none.textContent = 'なし'
    row.append(none)
    return row
  }

  const icon = document.createElement('span')
  icon.className = 'md-result-item__icon'
  icon.textContent = firstWeapon.emoji
  const name = document.createElement('span')
  name.className = 'md-result-item__name'
  name.textContent = firstWeapon.name
  const rarity = document.createElement('span')
  rarity.className = 'md-result-item__rarity'
  rarity.style.color = rarityColor(firstWeapon.rarity)
  rarity.textContent = firstWeapon.rarity
  row.append(icon, name, rarity)

  const extraCount = Math.max(0, droppedWeapons.length - 1)
  if (extraCount > 0) {
    const extra = document.createElement('span')
    extra.className = 'md-result-item__extra'
    extra.textContent = `ほか${extraCount}件`
    row.append(extra)
  }
  return row
}

function damageBlock(damageStats: CharacterDamageStat[]) {
  const block = document.createElement('section')
  block.className = 'md-result-damage'
  const heading = document.createElement('h2')
  heading.className = 'md-result-section-title'
  heading.textContent = '総ダメージ'
  block.append(heading)

  if (damageStats.length === 0) {
    const empty = document.createElement('div')
    empty.className = 'md-result-empty'
    empty.textContent = '記録なし'
    block.append(empty)
    return block
  }

  const maxDamage = Math.max(1, ...damageStats.map(stat => stat.damage))
  const rows = document.createElement('div')
  rows.className = 'md-result-damage__rows'
  damageStats.slice(0, 5).forEach(stat => {
    const ch = CHARACTERS[stat.characterId]
    if (!ch) return
    const row = document.createElement('div')
    row.className = 'md-result-damage-row'
    const icon = document.createElement('span')
    icon.className = 'md-result-damage-row__icon'
    icon.textContent = ch.emoji
    const name = document.createElement('span')
    name.className = 'md-result-damage-row__name'
    name.textContent = ch.name
    const bar = document.createElement('span')
    bar.className = 'md-result-damage-row__bar'
    const fill = document.createElement('span')
    fill.style.width = `${Math.max(5, (stat.damage / maxDamage) * 100)}%`
    bar.append(fill)
    const value = document.createElement('span')
    value.className = 'md-result-damage-row__value'
    value.textContent = `${stat.damage}`
    row.append(icon, name, bar, value)
    rows.append(row)
  })
  block.append(rows)
  return block
}

function resultButton(opts: { className: string; title: string; desc: string; onClick: () => void }) {
  const button = document.createElement('button')
  button.className = `md-result-button ${opts.className}`
  button.type = 'button'
  button.addEventListener('click', opts.onClick)
  const icon = document.createElement('span')
  icon.className = 'md-result-button__icon'
  icon.textContent = '>'
  const title = document.createElement('span')
  title.className = 'md-result-button__title'
  title.textContent = opts.title
  const desc = document.createElement('span')
  desc.className = 'md-result-button__desc'
  desc.textContent = opts.desc
  button.append(icon, title, desc)
  return button
}

function rarityColor(rarity: keyof typeof RARITY_COLORS) {
  return '#' + RARITY_COLORS[rarity].toString(16).padStart(6, '0')
}
