import { enableDragScroll } from './scroll'

export interface EdgeButtonOptions {
  icon: string
  title: string
  desc: string
  disabled?: boolean
  onClick: () => void
}

export interface ListRowOptions {
  icon: string
  iconColor: string
  title: string
  detail: string
  subTitle?: string
  meta?: string
  selected?: boolean
  disabled?: boolean
  onClick?: () => void
}

export function edgeButton(opts: EdgeButtonOptions) {
  const button = document.createElement('button')
  button.className = 'md-edge-button'
  button.type = 'button'
  button.disabled = opts.disabled === true
  button.addEventListener('click', () => {
    if (!button.disabled) opts.onClick()
  })

  const icon = document.createElement('span')
  icon.className = 'md-edge-button__icon'
  icon.textContent = opts.icon

  const title = document.createElement('span')
  title.className = 'md-edge-button__title'
  title.textContent = opts.title

  const desc = document.createElement('span')
  desc.className = 'md-edge-button__desc'
  desc.textContent = opts.desc

  button.append(icon, title, desc)
  return button
}

export function listRow(opts: ListRowOptions) {
  const row = document.createElement(opts.onClick ? 'button' : 'div')
  row.className = `md-list-row${opts.selected ? ' is-selected' : ''}`
  if (row instanceof HTMLButtonElement) {
    row.type = 'button'
    row.disabled = opts.disabled === true
    row.addEventListener('click', () => {
      if (!row.disabled) opts.onClick?.()
    })
  }

  const icon = document.createElement('div')
  icon.className = 'md-list-row__icon'
  icon.style.color = opts.iconColor
  icon.textContent = opts.icon

  const title = document.createElement('div')
  title.className = 'md-list-row__title'
  title.textContent = opts.title
  if (opts.subTitle) {
    const subTitle = document.createElement('span')
    subTitle.className = 'md-list-row__subtitle'
    subTitle.textContent = opts.subTitle
    title.append(subTitle)
  }

  const detail = document.createElement('div')
  detail.className = 'md-list-row__detail'
  detail.textContent = opts.detail

  row.append(icon, title, detail)

  if (opts.meta) {
    const meta = document.createElement('div')
    meta.className = 'md-list-row__meta'
    meta.textContent = opts.meta
    row.append(meta)
  }

  return row
}

export function emptyState(text: string) {
  const el = document.createElement('div')
  el.className = 'md-empty'
  el.textContent = text
  return el
}

export function scrollList(extraClass?: string) {
  const list = document.createElement('div')
  list.className = extraClass ? `md-list-scroll ${extraClass}` : 'md-list-scroll'
  enableDragScroll(list)
  return list
}
