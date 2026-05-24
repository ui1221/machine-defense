import Phaser from 'phaser'
import { applyRenderScale } from '../utils/display'

export class BootScene extends Phaser.Scene {
  constructor() { super('BootScene') }

  preload() {
    this.load.spritesheet('mass_robot', '/machine-defense/assets/mass-robot-spritesheet.webp', {
      frameWidth: 192,
      frameHeight: 208,
    })
    this.load.image('home_portrait', '/machine-defense/assets/home-portrait.png')
    this.load.image('home_base_bg', '/machine-defense/assets/home-base-bg.webp')
    this.load.image('stage_forest_bg', '/machine-defense/assets/stage-forest-bg.webp')
    this.load.image('stage_facility_entrance_bg', '/machine-defense/assets/stage-facility-entrance.png')
    this.load.image('stage_base_day_bg', '/machine-defense/assets/stage-base-day.png')
    this.load.image('stage_base_evening_bg', '/machine-defense/assets/stage-base-evening.png')
    this.load.image('stage_base_night_bg', '/machine-defense/assets/stage-base-night.png')
    this.load.image('barricade_full', '/machine-defense/assets/barricade-full.png')
    this.load.image('barricade_damaged', '/machine-defense/assets/barricade-damaged.png')
  }

  create() {
    applyRenderScale(this)
    this.anims.create({
      key: 'mass_robot_front_walk',
      frames: this.anims.generateFrameNumbers('mass_robot', { start: 56, end: 61 }),
      frameRate: 7,
      repeat: -1,
    })
    this.scene.start('HomeScene')
  }
}
