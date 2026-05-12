import Phaser from 'phaser'

export class BootScene extends Phaser.Scene {
  constructor() { super('BootScene') }

  preload() {
    this.load.spritesheet('mass_robot', '/machine-defense/assets/mass-robot-spritesheet.webp', {
      frameWidth: 192,
      frameHeight: 208,
    })
  }

  create() {
    this.anims.create({
      key: 'mass_robot_front_walk',
      frames: this.anims.generateFrameNumbers('mass_robot', { start: 56, end: 61 }),
      frameRate: 7,
      repeat: -1,
    })
    this.scene.start('HomeScene')
  }
}
