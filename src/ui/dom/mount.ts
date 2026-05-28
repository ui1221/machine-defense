import { GAME_H, GAME_W } from '../../constants'
import './styles.css'

export type DomScreen = {
  destroy: () => void
}

let activeScreen: DomScreen | null = null
let activeShell: DomScreen | null = null

export function mountDomScreen(build: (root: HTMLElement) => DomScreen) {
  unmountDomScreen()
  const root = getScreenLayer()
  root.classList.add('md-ui-root')
  syncUiRoot()
  activeScreen = build(root)
  return activeScreen
}

export function unmountDomScreen() {
  activeScreen?.destroy()
  activeScreen = null
  getScreenLayer().replaceChildren()
}

export function mountDomShell(build: (root: HTMLElement) => DomScreen) {
  unmountDomShell()
  const root = getShellLayer()
  root.classList.add('md-ui-root')
  syncUiRoot()
  activeShell = build(root)
  return activeShell
}

export function unmountDomShell() {
  activeShell?.destroy()
  activeShell = null
  getShellLayer().replaceChildren()
}

export function syncUiRoot() {
  const root = getUiRoot()
  const canvas = document.querySelector('canvas')
  if (!canvas) return
  const rect = canvas.getBoundingClientRect()
  root.style.left = `${rect.left}px`
  root.style.top = `${rect.top}px`
  root.style.width = `${rect.width}px`
  root.style.height = `${rect.height}px`
  root.style.transformOrigin = '0 0'
  root.style.transform = `scale(${rect.width / GAME_W}, ${rect.height / GAME_H})`
  root.style.width = `${GAME_W}px`
  root.style.height = `${GAME_H}px`
}

export function installUiRootSync() {
  syncUiRoot()
  window.addEventListener('resize', syncUiRoot)
  window.visualViewport?.addEventListener('resize', syncUiRoot)
}

function getUiRoot() {
  let root = document.getElementById('ui-root')
  if (!root) {
    root = document.createElement('div')
    root.id = 'ui-root'
    document.body.appendChild(root)
  }
  root.classList.add('md-ui-root')
  return root
}

function getScreenLayer() {
  return getLayer('ui-screen-root', 'md-ui-layer md-ui-screen-root')
}

function getShellLayer() {
  return getLayer('ui-shell-root', 'md-ui-layer md-ui-shell-root')
}

function getLayer(id: string, className: string) {
  const root = getUiRoot()
  let layer = document.getElementById(id)
  if (!layer) {
    layer = document.createElement('div')
    layer.id = id
    layer.className = className
    root.appendChild(layer)
  }
  return layer
}
