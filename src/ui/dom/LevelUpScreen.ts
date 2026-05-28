import type { UpgradeOption } from '../../types'
import type { DomScreen } from './mount'

export interface LevelUpScreenOptions {
  choices: UpgradeOption[]
  onSelect: (id: string) => void
}

export function mountLevelUpScreen(root: HTMLElement, opts: LevelUpScreenOptions): DomScreen {
  const screen = document.createElement('div')
  screen.className = 'md-ui-screen md-levelup-screen'

  const sheet = document.createElement('section')
  sheet.className = 'md-levelup-sheet'

  const header = document.createElement('header')
  header.className = 'md-levelup-header'
  const title = document.createElement('h1')
  title.className = 'md-levelup-title'
  title.textContent = 'LEVEL UP'
  const sub = document.createElement('p')
  sub.className = 'md-levelup-sub'
  sub.textContent = '強化を選択'
  header.append(title, sub)

  const list = document.createElement('div')
  list.className = 'md-levelup-list'
  opts.choices.forEach(choice => {
    list.append(levelUpButton(choice, opts.onSelect))
  })

  sheet.append(header, list)
  screen.append(sheet)
  root.append(screen)

  return {
    destroy: () => screen.remove(),
  }
}

function levelUpButton(choice: UpgradeOption, onSelect: (id: string) => void) {
  const isRare = choice.id.startsWith('rare_')
  const button = document.createElement('button')
  button.className = isRare ? 'md-levelup-choice is-rare' : 'md-levelup-choice'
  button.type = 'button'
  button.addEventListener('click', () => onSelect(choice.id))

  const icon = document.createElement('span')
  icon.className = 'md-levelup-choice__icon'
  icon.textContent = choice.emoji

  const body = document.createElement('span')
  body.className = 'md-levelup-choice__body'
  const name = document.createElement('span')
  name.className = 'md-levelup-choice__name'
  name.textContent = choice.name
  const desc = document.createElement('span')
  desc.className = 'md-levelup-choice__desc'
  desc.textContent = choice.description
  body.append(name, desc)

  button.append(icon, body)
  return button
}
