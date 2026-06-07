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
  showPhaseNotice: (phase: BattlePhase) => void
  showBossNotice: (name: string) => void
}

export type BattlePhase = 'mid' | 'late' | 'boss'

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

  const phaseNotice = document.createElement('div')
  phaseNotice.className = 'md-phase-notice'
  const phaseTitle = document.createElement('div')
  phaseTitle.className = 'md-phase-notice__title'
  const phaseSub = document.createElement('div')
  phaseSub.className = 'md-phase-notice__sub'
  phaseNotice.append(phaseTitle, phaseSub)

  hud.append(top, controls, hp.wrap, phaseNotice)
  root.append(hud)

  let phaseTimer: number | undefined

  return {
    setState: state => {
      const expRatio = clamp01(state.expRatio)
      const hpRatio = clamp01(state.maxHp > 0 ? state.hp / state.maxHp : 0)
      level.textContent = `Lv.${state.level}`
      time.textContent = formatTime(state.elapsedMs)
      exp.value.textContent = `${Math.round(expRatio * 100)}%`
      exp.fill.style.width = `${expRatio * 100}%`
      hp.value.textContent = `${Math.ceil(state.hp)}/${Math.round(state.maxHp)}`
      hp.fill.style.width = `${hpRatio * 100}%`
      hp.wrap.classList.toggle('is-warning', hpRatio <= 0.5 && hpRatio > 0.25)
      hp.wrap.classList.toggle('is-critical', hpRatio <= 0.25)
      pause.textContent = state.paused ? '>' : 'II'
      speed.textContent = `x${state.speed}`
    },
    showPhaseNotice: phase => {
      const meta = phaseNoticeMeta[phase]
      showNotice(`is-${phase}`, meta.title, meta.sub, 1400)
    },
    showBossNotice: name => {
      showNotice('is-boss-arrival', 'BOSS APPROACH', name, 1900)
    },
    destroy: () => {
      if (phaseTimer) window.clearTimeout(phaseTimer)
      hud.remove()
    },
  }

  function showNotice(className: string, title: string, sub: string, duration: number) {
    if (phaseTimer) window.clearTimeout(phaseTimer)
    phaseNotice.className = `md-phase-notice ${className} is-visible`
    phaseTitle.textContent = title
    phaseSub.textContent = sub
    phaseTimer = window.setTimeout(() => {
      phaseNotice.classList.remove('is-visible')
      phaseTimer = undefined
    }, duration)
  }
}

const phaseNoticeMeta: Record<BattlePhase, { title: string; sub: string }> = {
  mid: { title: 'RESISTANCE RISING', sub: '\u6575\u306e\u62b5\u6297\u304c\u5897\u3057\u3066\u304d\u305f' },
  late: { title: 'PRESSURE ESCALATING', sub: '\u6575\u52e2\u529b\u304c\u653b\u52e2\u3092\u5f37\u3081\u3066\u3044\u308b' },
  boss: { title: 'FINAL PRESSURE', sub: '\u5236\u5727\u500b\u4f53\u304c\u6226\u5834\u3092\u62bc\u3057\u8fbc\u3093\u3067\u3044\u308b' },
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
