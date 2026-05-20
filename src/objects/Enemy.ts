import Phaser from 'phaser'
import type { EnemyConfig } from '../types'
import { BARRICADE_Y, SPAWN_Y } from '../constants'

const ATTACK_DELAY = 1600
const ATTACK_COOLDOWN = 3600
const ATTACK_INTERRUPT_DELAY = ATTACK_DELAY
const HEAL_INTERVAL = 2400
const HEAL_RADIUS = 92
const HEAL_AMOUNT = 5

export class Enemy extends Phaser.GameObjects.Container {
  hp: number
  maxHp: number
  speed: number
  damage: number
  expReward: number
  size: number
  config: EnemyConfig

  atBarricade = false
  speedMult = 1   // 1.0 = normal, < 1 = slowed
  lastDamageTaken = 0
  stunnedUntil = 0
  slowedUntil = 0
  private persistentSlowFactor = 1
  private nextAttackReadyTime = 0
  private attackWarningShown = false
  private charged = false
  private lastHealTime = 0

  private label: Phaser.GameObjects.Text | Phaser.GameObjects.Sprite
  private hpBg: Phaser.GameObjects.Rectangle
  private hpBar: Phaser.GameObjects.Rectangle
  private bodyCircle: Phaser.GameObjects.Arc

  constructor(scene: Phaser.Scene, x: number, y: number, cfg: EnemyConfig) {
    super(scene, x, y)

    this.config = cfg
    this.hp = cfg.hp
    this.maxHp = cfg.hp
    this.speed = cfg.speed
    this.damage = cfg.damage
    this.expReward = cfg.expReward
    this.size = cfg.size

    const isBoss = this.hasAbility('boss')
    const hpBarWidth = isBoss ? 92 : 32
    const hpBarY = isBoss ? -48 : -24
    const fontSize = isBoss ? '52px' : '30px'

    this.bodyCircle = scene.add.circle(0, 2, cfg.size + (isBoss ? 10 : 4), cfg.color ?? 0x667788, isBoss ? 0.52 : 0.35)
    if (cfg.id === 'basic') {
      const sprite = scene.add.sprite(0, 10, 'mass_robot', 56).setOrigin(0.5).setScale(0.34)
      sprite.play('mass_robot_front_walk')
      this.label = sprite
    } else {
      this.label = scene.add.text(0, 0, cfg.emoji, { fontSize }).setOrigin(0.5)
    }
    this.hpBg = scene.add.rectangle(0, hpBarY, hpBarWidth, isBoss ? 8 : 4, 0x333333).setVisible(false)
    this.hpBar = scene.add.rectangle(0, hpBarY, hpBarWidth, isBoss ? 8 : 4, isBoss ? 0xffaa44 : 0xff4444)
      .setVisible(false)

    this.add([this.bodyCircle, this.label, this.hpBg, this.hpBar])
    this.setDepth(isBoss ? 14 : 10)
  }

  takeDamage(amount: number): boolean {
    const actual = this.modifyIncomingDamage(amount)
    this.lastDamageTaken = actual
    this.hp = Math.max(0, this.hp - actual)
    const ratio = this.hp / this.maxHp
    this.hpBg.setVisible(true)
    this.hpBar.setVisible(true)
    this.hpBar.setScale(ratio, 1)

    this.label.setAlpha(0.5)
    this.scene.time.delayedCall(60, () => {
      if (this.active) this.label.setAlpha(1)
    })

    this.interruptBarricadeAttack()

    return this.hp <= 0
  }

  update(t: number, delta: number) {
    if (this.atBarricade) return
    if (t < this.stunnedUntil) return

    this.updateSpecialMovement()
    if (t < this.slowedUntil) this.speedMult *= this.persistentSlowFactor
    this.y += (this.speed * this.speedMult * delta) / 1000

    if (this.y >= BARRICADE_Y - 20) {
      this.y = BARRICADE_Y - 20
      this.atBarricade = true
      this.nextAttackReadyTime = t + ATTACK_DELAY
      this.attackWarningShown = false
    }
  }

  knockback(dist: number) {
    const resist = Phaser.Math.Clamp(this.config.knockbackResist ?? 0, 0, 1)
    const actualDist = Math.max(0, dist * (1 - resist))
    if (actualDist <= 0.1) return

    this.y = Math.max(SPAWN_Y, this.y - actualDist)
    if (this.atBarricade && this.y < BARRICADE_Y - 21) {
      this.atBarricade = false
      this.nextAttackReadyTime = 0
      this.attackWarningShown = false
    }
  }

  tryAttackBarricade(now: number): boolean {
    if (!this.atBarricade) return false
    if (this.hasAbility('warning_attack') && !this.attackWarningShown && now >= this.nextAttackReadyTime - 350) {
      this.attackWarningShown = true
      this.showAttackWarning()
    }
    if (now < this.nextAttackReadyTime) return false

    this.nextAttackReadyTime = now + ATTACK_COOLDOWN
    this.attackWarningShown = false

    // 攻撃アニメーション
    this.scene.tweens.add({
      targets: this,
      y: this.y + 6,
      duration: 80,
      yoyo: true,
    })

    return true
  }

  private interruptBarricadeAttack() {
    if (!this.atBarricade) return
    const now = (this.scene as { elapsedMs?: number }).elapsedMs ?? this.scene.time.now
    this.nextAttackReadyTime = Math.max(this.nextAttackReadyTime, now + ATTACK_INTERRUPT_DELAY)
    this.attackWarningShown = false
  }

  tryHealNearby(now: number, allies: Enemy[]): boolean {
    if (!this.hasAbility('heal_aura')) return false
    if (now - this.lastHealTime < HEAL_INTERVAL) return false

    const targets = allies.filter((enemy) => {
      if (!enemy.active || enemy === this || enemy.hp >= enemy.maxHp) return false
      const dx = enemy.x - this.x
      const dy = enemy.y - this.y
      return dx * dx + dy * dy <= HEAL_RADIUS * HEAL_RADIUS
    })
    if (targets.length === 0) return false

    this.lastHealTime = now
    for (const target of targets.slice(0, 3)) {
      target.heal(HEAL_AMOUNT)
    }
    this.showHealPulse()
    return true
  }

  heal(amount: number) {
    this.hp = Math.min(this.maxHp, this.hp + amount)
    const ratio = this.hp / this.maxHp
    this.hpBg.setVisible(ratio < 1)
    this.hpBar.setVisible(ratio < 1)
    this.hpBar.setScale(ratio, 1)
    const txt = this.scene.add.text(this.x, this.y - 28, `+${amount}`, {
      fontSize: '12px',
      color: '#88ffbb',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(28)
    this.scene.tweens.add({
      targets: txt,
      y: txt.y - 24,
      alpha: 0,
      duration: 520,
      onComplete: () => txt.destroy(),
    })
  }

  stun(until: number) {
    if (this.hasAbility('boss')) return
    this.stunnedUntil = Math.max(this.stunnedUntil, until)
    this.bodyCircle.setFillStyle(0x99ddff, 0.55)
    this.scene.time.delayedCall(Math.max(0, until - ((this.scene as { elapsedMs?: number }).elapsedMs ?? 0)), () => {
      if (this.active) this.bodyCircle.setFillStyle(this.config.color ?? 0x667788, this.hasAbility('boss') ? 0.52 : 0.35)
    })
  }

  slow(until: number, factor: number) {
    if (this.hasAbility('boss')) {
      const now = (this.scene as { elapsedMs?: number }).elapsedMs ?? this.scene.time.now
      until = now + Math.max(0, until - now) * 0.35
      factor = Math.max(factor, 0.88)
    }
    this.slowedUntil = Math.max(this.slowedUntil, until)
    this.persistentSlowFactor = Math.min(this.persistentSlowFactor, factor)
    this.bodyCircle.setStrokeStyle(2, 0x66ddff, 0.8)
    this.scene.time.delayedCall(Math.max(0, until - ((this.scene as { elapsedMs?: number }).elapsedMs ?? 0)), () => {
      if (!this.active) return
      if (((this.scene as { elapsedMs?: number }).elapsedMs ?? this.scene.time.now) < this.slowedUntil) return
      this.persistentSlowFactor = 1
      this.bodyCircle.setStrokeStyle()
    })
  }

  hasAbility(id: string) {
    return this.config.abilities?.includes(id as never) ?? false
  }

  private modifyIncomingDamage(amount: number) {
    let mult = 1
    if (this.hasAbility('armor')) mult *= 0.65
    if (this.hasAbility('elite')) mult *= 0.8
    return Math.max(1, Math.round(amount * mult))
  }

  private updateSpecialMovement() {
    const chargeLine = BARRICADE_Y - 360
    if (this.hasAbility('charge') && this.y >= chargeLine) {
      this.speedMult *= 1.55
      if (!this.charged) {
        this.charged = true
        this.bodyCircle.setAlpha(0.55)
        this.scene.tweens.add({
          targets: this.label,
          scaleX: 1.25,
          scaleY: 1.25,
          duration: 120,
          yoyo: true,
        })
      }
    }
    if (this.hasAbility('elite') && this.hp <= this.maxHp * 0.5) {
      this.speedMult *= 1.25
      this.bodyCircle.setAlpha(0.55)
    }
  }

  private showAttackWarning() {
    const warn = this.scene.add.text(this.x, this.y - 42, '!', {
      fontSize: '28px',
      color: '#ff3333',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(30)
    this.scene.tweens.add({
      targets: warn,
      y: warn.y - 18,
      alpha: 0,
      duration: 520,
      onComplete: () => warn.destroy(),
    })
  }

  private showHealPulse() {
    const ring = this.scene.add.circle(this.x, this.y, HEAL_RADIUS * 0.65, 0x55ff99, 0.08)
      .setStrokeStyle(2, 0x88ffbb, 0.8)
      .setDepth(8)
    this.scene.tweens.add({
      targets: ring,
      scaleX: 1.45,
      scaleY: 1.45,
      alpha: 0,
      duration: 520,
      onComplete: () => ring.destroy(),
    })
  }
}
