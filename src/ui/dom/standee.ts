export interface PortraitStandeeOptions {
  className?: string
  shadowColor?: string
  shadowAlpha?: number
  shadowOffsetX?: number
  shadowOffsetY?: number
  onClick?: () => void
}

const PORTRAIT_SRC = '/machine-defense/assets/home-portrait.png'

export function portraitStandee(opts: PortraitStandeeOptions = {}) {
  const wrap = document.createElement(opts.onClick ? 'button' : 'div')
  wrap.className = `md-portrait-standee${opts.className ? ` ${opts.className}` : ''}`
  if (wrap instanceof HTMLButtonElement) {
    wrap.type = 'button'
    wrap.addEventListener('click', opts.onClick ?? (() => undefined))
  }
  wrap.style.setProperty('--md-standee-shadow', opts.shadowColor ?? '#ffee00')
  wrap.style.setProperty('--md-standee-shadow-alpha', `${opts.shadowAlpha ?? 0.42}`)
  wrap.style.setProperty('--md-standee-shadow-x', `${opts.shadowOffsetX ?? 14}px`)
  wrap.style.setProperty('--md-standee-shadow-y', `${opts.shadowOffsetY ?? 10}px`)

  const shadow = document.createElement('div')
  shadow.className = 'md-portrait-standee__shadow'

  const img = document.createElement('img')
  img.className = 'md-portrait-standee__image'
  img.src = PORTRAIT_SRC
  img.alt = ''
  img.draggable = false

  wrap.append(shadow, img)
  return wrap
}
