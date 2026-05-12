import Phaser from 'phaser'
import { GAME_W, GAME_H } from './constants'
import { HomeScene } from './scenes/HomeScene'
import { BattleScene } from './scenes/BattleScene'
import { BattleUIScene } from './scenes/BattleUIScene'
import { ResultScene } from './scenes/ResultScene'

const config: Phaser.Types.Core.GameConfig & { disableVisibilityChange?: boolean } = {
  type: Phaser.AUTO,
  width: GAME_W,
  height: GAME_H,
  backgroundColor: '#111122',
  parent: document.body,
  scene: [HomeScene, BattleScene, BattleUIScene, ResultScene],
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
