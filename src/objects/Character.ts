import Phaser from 'phaser'
import type { CharacterConfig, AttackResult } from '../types'
import type { Enemy } from './Enemy'
import type { InputManager } from '../systems/InputManager'
import type { TargetingSystem } from '../systems/TargetingSystem'

export class Character extends Phaser.GameObjects.Container {
  config: CharacterConfig
  atkMult = 1
  atkSpeedMult = 1
  rangeMult = 1
  areaMult = 1
  critChance = 0
  actionCount = 1
  stunBlast = false
  piercing = false
  burstCount = 1

  private label: Phaser.GameObjects.Text
  private lastFired = 0
  private cooldownBar: Phaser.GameObjects.Rectangle

  constructor(scene: Phaser.Scene, x: number, y: number, cfg: CharacterConfig) {
    super(scene, x, y)
    this.config = cfg
    this.critChance = cfg.baseCritChance ?? 0
    this.burstCount = cfg.baseBurstCount ?? 1

    this.label = scene.add.text(0, 0, cfg.emoji, { fontSize: '36px' }).setOrigin(0.5)

    const cdBg = scene.add.rectangle(0, 26, 36, 4, 0x222233)
    this.cooldownBar = scene.add.rectangle(-18, 26, 36, 4, 0xff8844).setOrigin(0, 0.5)

    this.add([this.label, cdBg, this.cooldownBar])
    this.setDepth(5)
  }

  get effectiveAtk()      { return this.config.atk * this.atkMult }
  get effectiveAtkSpeed() { return this.config.atkSpeed * this.atkSpeedMult }
  get effectiveRange()    { return this.config.range * this.rangeMult }

  updateCooldown(now: number) {
    const elapsed = now - this.lastFired
    const total = this.effectiveAtkSpeed
    const remaining = Math.max(0, 1 - elapsed / total)
    this.cooldownBar.scaleX = remaining
  }

  tryShoot(
    now: number,
    enemies: Enemy[],
    input: InputManager,
    targeting: TargetingSystem,
  ): AttackResult | null {
    if (now - this.lastFired < this.effectiveAtkSpeed) return null

    const type = this.config.attackType

    let tx: number
    let ty: number
    if (input.isPointerDown) {
      tx = input.pointerX
      ty = input.pointerY
    } else {
      const target = targeting.findFrontmostEnemy(enemies, this.effectiveRange, this.x, this.y)
      if (!target) return null
      tx = target.x
      ty = target.y
    }

    this.lastFired = now
    this.animateShoot()

    if (type === 'burst')    return { kind: 'burst', tx, ty }
    if (type === 'slash')    return { kind: 'slash', tx, ty }
    if (type === 'field')    return { kind: 'field_bolt', tx, ty }
    if (type === 'beam')     return { kind: 'beam', tx, ty }
    if (type === 'orb')      return { kind: 'orb', tx, ty }
    if (type === 'stun')     return { kind: 'stun_shot', tx, ty }
    return { kind: 'bullet', tx, ty }
  }

  private animateShoot() {
    this.scene.tweens.add({
      targets: this.label,
      scaleX: 1.15, scaleY: 0.85,
      duration: 60, yoyo: true,
    })
  }
}
