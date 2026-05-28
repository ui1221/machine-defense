import type { DomScreen } from './mount'

export interface BattleHudState {
  level: number
  expRatio: number
  hp: number
  maxHp: number
  elapsedMs: number
  paused: boolean
  speed: number
}

export interface BattleHudScreenHandle extends DomScreen {
  setState: (state: BattleHudState) => void
}

export interface BattleHudScreenOptions {
  onTogglePause: () => void
  onCycleSpeed: () => void
}

export function mountBattleHudScreen(root: HTMLElement, opts: BattleHudScreenOptions): BattleHudScreenHandle {
  const hud = document.createElement('div')
  hud.className = 'md-battle-hud'

  const top = document.createElement('div')
  top.className = 'md-battle-hud__top'

  const level = document.createElement('span')
  level.className = 'md-battle-hud__level'
  const time = document.createElement('span')
  time.className = 'md-battle-hud__time'
  const exp = hudBar('EXP', 'md-hud-bar is-exp')
  top.append(level, time, exp.wrap)

  const controls = document.createElement('div')
  controls.className = 'md-battle-hud__controls'
  const pause = hudButton('II', opts.onTogglePause)
  const speed = hudButton('x1', opts.onCycleSpeed)
  controls.append(pause, speed)

  const hp = hudBar('BARRIER', 'md-hud-bar is-hp')
  hp.wrap.classList.add('md-battle-hud__hp')

  hud.append(top, controls, hp.wrap)
  root.append(hud)

  return {
    setState: state => {
      const expRatio = clamp01(state.expRatio)
      const hpRatio = clamp01(state.maxHp > 0 ? state.hp / state.maxHp : 0)
      level.textContent = `Lv.${state.level}`
      time.textContent = formatTime(state.elapsedMs)
      exp.value.textContent = `${Math.round(expRatio * 100)}%`
      exp.fill.style.width = `${expRatio * 100}%`
      hp.value.textContent = `${state.hp}/${state.maxHp}`
      hp.fill.style.width = `${hpRatio * 100}%`
      hp.wrap.classList.toggle('is-warning', hpRatio <= 0.5 && hpRatio > 0.25)
      hp.wrap.classList.toggle('is-critical', hpRatio <= 0.25)
      pause.textContent = state.paused ? '>' : 'II'
      speed.textContent = `x${state.speed}`
    },
    destroy: () => hud.remove(),
  }
}

function hudBar(labelText: string, className: string) {
  const wrap = document.createElement('div')
  wrap.className = className
  const label = document.createElement('span')
  label.className = 'md-hud-bar__label'
  label.textContent = labelText
  const track = document.createElement('span')
  track.className = 'md-hud-bar__track'
  const fill = document.createElement('span')
  fill.className = 'md-hud-bar__fill'
  track.append(fill)
  const value = document.createElement('span')
  value.className = 'md-hud-bar__value'
  wrap.append(label, track, value)
  return { wrap, fill, value }
}

function hudButton(label: string, onClick: () => void) {
  const button = document.createElement('button')
  button.className = 'md-battle-hud__button'
  button.type = 'button'
  button.textContent = label
  button.addEventListener('click', onClick)
  return button
}

function formatTime(elapsedMs: number) {
  const totalSec = Math.floor(elapsedMs / 1000)
  const min = Math.floor(totalSec / 60).toString().padStart(2, '0')
  const sec = (totalSec % 60).toString().padStart(2, '0')
  return `${min}:${sec}`
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value))
}
