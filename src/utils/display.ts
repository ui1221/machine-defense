import Phaser from 'phaser'
import { RENDER_SCALE } from '../constants'

export function applyRenderScale(scene: Phaser.Scene) {
  scene.cameras.main.setZoom(RENDER_SCALE)
  scene.cameras.main.setScroll(0, 0)
}
