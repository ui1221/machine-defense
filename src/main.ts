import Phaser from 'phaser'
import { GAME_W, GAME_H, RENDER_SCALE } from './constants'
import { BootScene } from './scenes/BootScene'
import { HomeScene } from './scenes/HomeScene'
import { BattleScene } from './scenes/BattleScene'
import { BattleUIScene } from './scenes/BattleUIScene'
import { ResultScene } from './scenes/ResultScene'

const TEXT_VISUAL_OFFSET_Y = 2
const TEXT_PADDING_TOP = 4
const TEXT_PADDING_BOTTOM = 2

const originalTextFactory = Phaser.GameObjects.GameObjectFactory.prototype.text
Phaser.GameObjects.GameObjectFactory.prototype.text = function (
  x: number,
  y: number,
  text: string | string[],
  style?: Phaser.Types.GameObjects.Text.TextStyle,
) {
  const normalizedStyle: Phaser.Types.GameObjects.Text.TextStyle = {
    ...(style ?? {}),
    resolution: style?.resolution ?? RENDER_SCALE,
    padding: {
      top: TEXT_PADDING_TOP,
      bottom: TEXT_PADDING_BOTTOM,
      ...(typeof style?.padding === 'object' ? style.padding : {}),
    },
  }
  return originalTextFactory.call(this, x, y + TEXT_VISUAL_OFFSET_Y, text, normalizedStyle)
}

const config: Phaser.Types.Core.GameConfig & { disableVisibilityChange?: boolean; resolution?: number } = {
  type: Phaser.AUTO,
  width: GAME_W * RENDER_SCALE,
  height: GAME_H * RENDER_SCALE,
  backgroundColor: '#111122',
  parent: document.body,
  scene: [BootScene, HomeScene, BattleScene, BattleUIScene, ResultScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  disableVisibilityChange: true,
}
const game = new Phaser.Game(config as Phaser.Types.Core.GameConfig)
;(window as any).__game = game

if (new URLSearchParams(window.location.search).has('debugCanvas')) {
  const panel = document.createElement('pre')
  panel.style.position = 'fixed'
  panel.style.left = '8px'
  panel.style.top = '8px'
  panel.style.zIndex = '9999'
  panel.style.maxWidth = 'calc(100vw - 16px)'
  panel.style.padding = '8px 10px'
  panel.style.background = 'rgba(0, 0, 0, 0.82)'
  panel.style.color = '#fff'
  panel.style.font = '12px/1.45 monospace'
  panel.style.whiteSpace = 'pre-wrap'
  panel.style.pointerEvents = 'none'
  document.body.appendChild(panel)

  const updateCanvasDebug = () => {
    const canvas = document.querySelector('canvas')
    if (!canvas) {
      panel.textContent = 'canvas: not found'
      return
    }
    const rect = canvas.getBoundingClientRect()
    panel.textContent = [
      `dpr: ${window.devicePixelRatio.toFixed(3)}`,
      `inner: ${window.innerWidth} x ${window.innerHeight}`,
      `canvas attr: ${canvas.width} x ${canvas.height}`,
      `canvas css: ${canvas.clientWidth} x ${canvas.clientHeight}`,
      `canvas rect: ${rect.width.toFixed(2)} x ${rect.height.toFixed(2)}`,
      `ratio attr/css: ${(canvas.width / canvas.clientWidth).toFixed(3)} x ${(canvas.height / canvas.clientHeight).toFixed(3)}`,
      `ratio attr/rect: ${(canvas.width / rect.width).toFixed(3)} x ${(canvas.height / rect.height).toFixed(3)}`,
    ].join('\n')
  }

  updateCanvasDebug()
  window.addEventListener('resize', updateCanvasDebug)
  setInterval(updateCanvasDebug, 1000)
}

// プレビュー環境でフォーカスなしでも動作させる
document.addEventListener('visibilitychange', () => {
  if (game.loop) game.loop.wake()
})
game.events.on('blur', () => { game.loop.wake() })
