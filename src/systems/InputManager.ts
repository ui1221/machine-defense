import Phaser from 'phaser'

export class InputManager {
  isPointerDown = false
  pointerX = 0
  pointerY = 0
  private paused = false

  constructor(scene: Phaser.Scene) {
    scene.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      if (this.paused) return
      this.isPointerDown = true
      this.pointerX = ptr.x
      this.pointerY = ptr.y
    })
    scene.input.on('pointermove', (ptr: Phaser.Input.Pointer) => {
      if (!this.isPointerDown || this.paused) return
      this.pointerX = ptr.x
      this.pointerY = ptr.y
    })
    scene.input.on('pointerup', () => {
      this.isPointerDown = false
    })
  }

  pause() { this.paused = true; this.isPointerDown = false }
  resume() { this.paused = false }
}
