import Phaser from 'phaser'
import { GAME_H, GAME_W, RENDER_SCALE } from '../constants'

export function applyRenderScale(scene: Phaser.Scene) {
  const camera = scene.cameras.main
  camera.setZoom(RENDER_SCALE)
  camera.setScroll(-GAME_W * (RENDER_SCALE - 1) / 2, -GAME_H * (RENDER_SCALE - 1) / 2)
}

export function logicalPointer(pointer: Phaser.Input.Pointer) {
  return {
    x: pointer.x / RENDER_SCALE,
    y: pointer.y / RENDER_SCALE,
  }
}
