import type { DomScreen } from './mount'

export interface HomeShellHandle extends DomScreen {
  setActiveTab: (index: number) => void
  setCredits: (credits: number) => void
}

export interface HomeShellOptions {
  activeTab: number
  credits: number
  onSelectTab: (index: number) => void
}

export function mountHomeShell(root: HTMLElement, opts: HomeShellOptions): HomeShellHandle {
  let activeTab = opts.activeTab
  let settingsOpen = false
  const shell = document.createElement('div')
  shell.className = 'md-home-shell'

  const atmosphere = document.createElement('div')
  atmosphere.className = 'md-home-atmosphere'

  const top = document.createElement('div')
  top.className = 'md-top-status'

  const status = document.createElement('div')
  status.className = 'md-top-status__left'

  const face = document.createElement('div')
  face.className = 'md-top-face'
  const faceImg = document.createElement('img')
  faceImg.className = 'md-top-face__image'
  faceImg.src = '/machine-defense/assets/home-portrait.png'
  faceImg.alt = ''
  faceImg.draggable = false
  face.append(faceImg)

  const credits = document.createElement('div')
  credits.className = 'md-top-credits'
  const coin = document.createElement('span')
  coin.className = 'md-top-credits__coin'
  const creditText = document.createElement('span')
  creditText.className = 'md-top-credits__value'
  creditText.textContent = `${opts.credits}`
  credits.append(coin, creditText)
  status.append(face, credits)

  const settings = document.createElement('button')
  settings.className = 'md-top-settings'
  settings.type = 'button'
  settings.setAttribute('aria-label', '設定')
  settings.innerHTML = settingsIcon
  settings.addEventListener('click', () => {
    settingsOpen = !settingsOpen
    renderSettings()
  })

  top.append(status, settings)

  const nav = document.createElement('nav')
  nav.className = 'md-bottom-nav'

  const buttons = tabs.map((tab, index) => {
    const button = document.createElement('button')
    button.className = 'md-bottom-nav__tab'
    button.type = 'button'
    button.style.setProperty('--md-tab-accent', tab.accent)
    button.setAttribute('aria-label', tab.label)
    button.addEventListener('click', () => opts.onSelectTab(index))

    const icon = document.createElement('span')
    icon.className = 'md-bottom-nav__icon'
    icon.innerHTML = tab.icon

    const label = document.createElement('span')
    label.className = 'md-bottom-nav__label'
    label.textContent = tab.label

    button.append(icon, label)
    nav.append(button)
    return button
  })

  shell.append(atmosphere, top, nav)
  root.append(shell)

  const renderSettings = () => {
    shell.querySelector('.md-settings-overlay')?.remove()
    if (!settingsOpen) return
    const overlay = document.createElement('div')
    overlay.className = 'md-settings-overlay'

    const veil = document.createElement('button')
    veil.className = 'md-settings-veil'
    veil.type = 'button'
    veil.setAttribute('aria-label', '設定を閉じる')
    veil.addEventListener('click', () => {
      settingsOpen = false
      renderSettings()
    })

    const menu = document.createElement('div')
    menu.className = 'md-settings-menu'
    menu.append(
      settingsButton({
        icon: isCanvasDebugVisible() ? '●' : '○',
        title: 'デバッグ表示',
        desc: isCanvasDebugVisible() ? 'ON  Canvas/GPU情報を表示中' : 'OFF  Canvas/GPU情報を表示する',
        onClick: () => {
          ;(window as any).__setCanvasDebugVisible?.(!isCanvasDebugVisible())
          renderSettings()
        },
      }),
      settingsButton({
        icon: '<',
        title: '閉じる',
        desc: '設定メニューを閉じる',
        onClick: () => {
          settingsOpen = false
          renderSettings()
        },
      }),
    )

    overlay.append(veil, menu)
    shell.append(overlay)
  }

  const applyActive = () => {
    buttons.forEach((button, index) => {
      const selected = index === activeTab
      button.classList.toggle('is-active', selected)
      button.setAttribute('aria-current', selected ? 'page' : 'false')
    })
  }
  applyActive()

  return {
    setActiveTab: index => {
      activeTab = index
      applyActive()
    },
    setCredits: nextCredits => {
      creditText.textContent = `${nextCredits}`
    },
    destroy: () => shell.remove(),
  }
}

function settingsButton(opts: { icon: string; title: string; desc: string; onClick: () => void }) {
  const button = document.createElement('button')
  button.className = 'md-settings-button'
  button.type = 'button'
  button.addEventListener('click', opts.onClick)

  const icon = document.createElement('span')
  icon.className = 'md-settings-button__icon'
  icon.textContent = opts.icon
  const title = document.createElement('span')
  title.className = 'md-settings-button__title'
  title.textContent = opts.title
  const desc = document.createElement('span')
  desc.className = 'md-settings-button__desc'
  desc.textContent = opts.desc
  button.append(icon, title, desc)
  return button
}

function isCanvasDebugVisible() {
  return Boolean((window as any).__isCanvasDebugVisible?.())
}

const iconAttrs = 'viewBox="0 0 32 32" aria-hidden="true" focusable="false"'

const stageIcon = `
<svg ${iconAttrs}>
  <path d="M16 3.5 28.5 16 16 28.5 3.5 16 16 3.5Z"/>
  <path d="M16 10.5 21.5 16 16 21.5 10.5 16 16 10.5Z"/>
  <path d="M16 14.2v3.6"/>
  <path d="M14.2 16h3.6"/>
</svg>`

const characterIcon = `
<svg ${iconAttrs}>
  <path d="M16 13.7a5.7 5.7 0 1 0 0-11.4 5.7 5.7 0 0 0 0 11.4Z"/>
  <path d="M6 28c1.5-6.2 5.2-9.7 10-9.7S24.5 21.8 26 28"/>
  <path d="M10.5 23.5h11"/>
</svg>`

const lobbyIcon = `
<svg ${iconAttrs}>
  <path d="M5 16 16 6l11 10"/>
  <path d="M8.5 14v13h15V14"/>
  <path d="M13 27v-7h6v7"/>
  <path d="M12 14h8"/>
</svg>`

const shopIcon = `
<svg ${iconAttrs}>
  <path d="M7 10h18v17H7z"/>
  <path d="M10 10V6h12v4"/>
  <path d="M7 15h18"/>
  <path d="M12 21h8"/>
  <path d="M22 18v6"/>
</svg>`

const fileIcon = `
<svg ${iconAttrs}>
  <path d="M8 4.5h12l4 4V28H8z"/>
  <path d="M20 4.5v5h4"/>
  <path d="M12 14h8"/>
  <path d="M12 19h8"/>
  <path d="M12 24h5"/>
</svg>`

const settingsIcon = `
<svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
  <path d="M14 3.5h4l.7 3.2c.8.2 1.6.6 2.3 1l2.8-1.6 2.8 2.8-1.6 2.8c.4.7.8 1.5 1 2.3l3.2.7v4l-3.2.7c-.2.8-.6 1.6-1 2.3l1.6 2.8-2.8 2.8-2.8-1.6c-.7.4-1.5.8-2.3 1l-.7 3.2h-4l-.7-3.2c-.8-.2-1.6-.6-2.3-1l-2.8 1.6-2.8-2.8 1.6-2.8c-.4-.7-.8-1.5-1-2.3l-3.2-.7v-4l3.2-.7c.2-.8.6-1.6 1-2.3L5.4 8.9l2.8-2.8L11 7.7c.7-.4 1.5-.8 2.3-1l.7-3.2Z"/>
  <circle cx="16" cy="16" r="4.8"/>
</svg>`

const tabs = [
  { label: 'ステージ', icon: stageIcon, accent: '#61d7ff' },
  { label: 'ユニット', icon: characterIcon, accent: '#ffcc66' },
  { label: 'ロビー', icon: lobbyIcon, accent: '#9bdcff' },
  { label: 'ショップ', icon: shopIcon, accent: '#78f0b2' },
  { label: 'ファイル', icon: fileIcon, accent: '#d9e2ff' },
]
