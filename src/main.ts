import Phaser from 'phaser'
import { GAME_W, GAME_H } from './constants'
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
  width: GAME_W,
  height: GAME_H,
  resolution: Math.min(window.devicePixelRatio || 1, 2),
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

// プレビュー環境でフォーカスなしでも動作させる
document.addEventListener('visibilitychange', () => {
  if (game.loop) game.loop.wake()
})
game.events.on('blur', () => { game.loop.wake() })
