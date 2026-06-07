import Phaser from 'phaser'
import { GAME_W, GAME_H, RENDER_SCALE } from './constants'
import { BootScene } from './scenes/BootScene'
import { HomeScene } from './scenes/HomeScene'
import { BattleScene } from './scenes/BattleScene'
import { BattleUIScene } from './scenes/BattleUIScene'
import { ResultScene } from './scenes/ResultScene'
import { installUiRootSync } from './ui/dom/mount'

const urlParams = new URLSearchParams(window.location.search)
const TEXT_VISUAL_OFFSET_Y = 2
const TEXT_PADDING_TOP = 4
const TEXT_PADDING_BOTTOM = 2
const DEBUG_CANVAS_STORAGE_KEY = 'md_debug_canvas'
const requestedFpsLimit = Number(urlParams.get('fpsLimit') ?? 0)
const fpsLimit = Number.isFinite(requestedFpsLimit)
  ? Phaser.Math.Clamp(Math.round(requestedFpsLimit), 0, 60)
  : 0
const keepAwake = !urlParams.has('sleepOnBlur')
const rendererParam = urlParams.get('renderer')
const softwareRendererPattern = /swiftshader|basic render driver|software/i
const probeWebGLRenderer = () => {
  const canvas = document.createElement('canvas')
  const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl')
  const debugInfo = gl?.getExtension('WEBGL_debug_renderer_info')
  if (!gl || !debugInfo) return null
  return String(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL))
}
const detectedWebGLRenderer = probeWebGLRenderer()
const detectedSoftwareRenderer = detectedWebGLRenderer
  ? softwareRendererPattern.test(detectedWebGLRenderer)
  : false
const rendererMode = rendererParam === 'canvas'
  ? Phaser.CANVAS
  : rendererParam === 'webgl'
    ? Phaser.WEBGL
    : detectedSoftwareRenderer
      ? Phaser.CANVAS
      : Phaser.AUTO

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
  type: rendererMode,
  width: GAME_W * RENDER_SCALE,
  height: GAME_H * RENDER_SCALE,
  backgroundColor: '#111122',
  parent: document.body,
  scene: [BootScene, HomeScene, BattleScene, BattleUIScene, ResultScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  fps: {
    limit: fpsLimit,
  },
  disableVisibilityChange: keepAwake,
}
const game = new Phaser.Game(config as Phaser.Types.Core.GameConfig)
;(window as any).__game = game
installUiRootSync()

{
  let debugCanvasVisible = urlParams.has('debugCanvas') || localStorage.getItem(DEBUG_CANVAS_STORAGE_KEY) === '1'
  const panel = document.createElement('pre')
  const copyButton = document.createElement('button')
  panel.style.position = 'fixed'
  panel.style.left = '8px'
  panel.style.top = '8px'
  panel.style.zIndex = '9999'
  panel.style.maxWidth = 'calc(100vw - 72px)'
  panel.style.padding = '8px 10px'
  panel.style.background = 'rgba(0, 0, 0, 0.82)'
  panel.style.color = '#fff'
  panel.style.font = '12px/1.45 monospace'
  panel.style.whiteSpace = 'pre-wrap'
  panel.style.pointerEvents = 'none'
  panel.style.display = debugCanvasVisible ? 'block' : 'none'
  document.body.appendChild(panel)

  copyButton.textContent = 'copy debug'
  copyButton.style.position = 'fixed'
  copyButton.style.right = '8px'
  copyButton.style.bottom = '88px'
  copyButton.style.zIndex = '10000'
  copyButton.style.padding = '6px 10px'
  copyButton.style.border = '1px solid rgba(255,255,255,0.4)'
  copyButton.style.background = 'rgba(0,0,0,0.78)'
  copyButton.style.color = '#fff'
  copyButton.style.font = '12px monospace'
  copyButton.style.cursor = 'pointer'
  copyButton.style.display = debugCanvasVisible ? 'block' : 'none'
  copyButton.addEventListener('click', async () => {
    await navigator.clipboard?.writeText(panel.textContent ?? '')
    copyButton.textContent = 'copied'
    window.setTimeout(() => { copyButton.textContent = 'copy debug' }, 900)
  })
  document.body.appendChild(copyButton)

  const updateCanvasDebug = () => {
    if (!debugCanvasVisible) return
    const canvas = document.querySelector('canvas')
    if (!canvas) {
      panel.textContent = 'canvas: not found'
      return
    }
    const rect = canvas.getBoundingClientRect()
    const gl = game.renderer?.type === Phaser.WEBGL
      ? (game.renderer as Phaser.Renderer.WebGL.WebGLRenderer).gl
      : null
    const debugInfo = gl?.getExtension('WEBGL_debug_renderer_info')
    const webglVendor = gl && debugInfo
      ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL)
      : 'unavailable'
    const webglRenderer = gl && debugInfo
      ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
      : 'unavailable'
    const webglRendererText = String(webglRenderer)
    const softwareRenderer = softwareRendererPattern.test(webglRendererText)
    const loop = game.loop
    const visualViewport = window.visualViewport
    const canvasCssMegapixels = (rect.width * rect.height) / 1_000_000
    const canvasAttrMegapixels = (canvas.width * canvas.height) / 1_000_000
    const rendererType = game.renderer?.type === Phaser.WEBGL
      ? 'WEBGL'
      : game.renderer?.type === Phaser.CANVAS
        ? 'CANVAS'
        : String(game.renderer?.type ?? 'unknown')
    panel.textContent = [
      `dpr: ${window.devicePixelRatio.toFixed(3)}`,
      `renderScale: ${RENDER_SCALE.toFixed(2)}`,
      `renderer request: ${rendererParam ?? 'auto'}`,
      `renderer fallback: ${!rendererParam && detectedSoftwareRenderer ? 'canvas' : 'none'}`,
      `detected webgl: ${detectedWebGLRenderer ?? 'unavailable'}`,
      `renderer: ${rendererType}`,
      `webgl vendor: ${webglVendor}`,
      `webgl renderer: ${webglRenderer}`,
      `software renderer: ${softwareRenderer ? 'yes' : 'no'}`,
      `loop fps: ${loop?.actualFps?.toFixed(1) ?? 'n/a'}`,
      `fps limit: ${fpsLimit || 'none'}`,
      `visible/focused: ${document.visibilityState} / ${document.hasFocus() ? 'yes' : 'no'}`,
      `keepAwake: ${keepAwake ? 'yes' : 'no'}`,
      `inner: ${window.innerWidth} x ${window.innerHeight}`,
      `visualViewport: ${visualViewport ? `${visualViewport.width.toFixed(2)} x ${visualViewport.height.toFixed(2)} / scale ${visualViewport.scale.toFixed(3)}` : 'unavailable'}`,
      `canvas attr: ${canvas.width} x ${canvas.height}`,
      `canvas css: ${canvas.clientWidth} x ${canvas.clientHeight}`,
      `canvas rect: ${rect.width.toFixed(2)} x ${rect.height.toFixed(2)}`,
      `canvas MP css/attr: ${canvasCssMegapixels.toFixed(3)} / ${canvasAttrMegapixels.toFixed(3)}`,
      `ratio attr/css: ${(canvas.width / canvas.clientWidth).toFixed(3)} x ${(canvas.height / canvas.clientHeight).toFixed(3)}`,
      `ratio attr/rect: ${(canvas.width / rect.width).toFixed(3)} x ${(canvas.height / rect.height).toFixed(3)}`,
    ].join('\n')
  }

  updateCanvasDebug()
  window.addEventListener('resize', updateCanvasDebug)
  setInterval(updateCanvasDebug, 1000)
  ;(window as any).__setCanvasDebugVisible = (visible: boolean) => {
    debugCanvasVisible = visible
    localStorage.setItem(DEBUG_CANVAS_STORAGE_KEY, visible ? '1' : '0')
    panel.style.display = visible ? 'block' : 'none'
    copyButton.style.display = visible ? 'block' : 'none'
    if (visible) updateCanvasDebug()
  }
  ;(window as any).__isCanvasDebugVisible = () => debugCanvasVisible
}

// プレビュー環境でフォーカスなしでも動作させる
if (keepAwake) {
  // Codex preview troubleshooting only. Normal browsers should be allowed to throttle hidden tabs.
  document.addEventListener('visibilitychange', () => {
    if (game.loop) game.loop.wake()
  })
  game.events.on('blur', () => { game.loop.wake() })
}
