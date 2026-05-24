import Phaser from 'phaser'
import { GAME_H, GAME_W, RENDER_SCALE } from '../constants'

export function applyRenderScale(scene: Phaser.Scene) {
  const camera = scene.cameras.main
  camera.setZoom(RENDER_SCALE)
  camera.setScroll(-GAME_W, -GAME_H)
}
