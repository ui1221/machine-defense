import Phaser from 'phaser'
import type { EnemyConfig } from '../types'
import { BARRICADE_Y } from '../constants'

const ATTACK_DELAY = 800   // バリケード到達から最初の攻撃まで(ms)
const ATTACK_COOLDOWN = 1200  // 攻撃間のクールタイム(ms)
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
  private lastAttackTime = 0
  private arrivedTime = 0
  private attackWarningShown = false
  private charged = false
  private lastHealTime = 0

  private label: Phaser.GameObjects.Text | Phaser.GameObjects.Sprite
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
    const hpBg = scene.add.rectangle(0, hpBarY, hpBarWidth, isBoss ? 8 : 4, 0x333333)
    this.hpBar = scene.add.rectangle(0, hpBarY, hpBarWidth, isBoss ? 8 : 4, isBoss ? 0xffaa44 : 0xff4444)

    this.add([this.bodyCircle, this.label, hpBg, this.hpBar])
    this.setDepth(isBoss ? 14 : 10)
  }

  takeDamage(amount: number): boolean {
    const actual = this.modifyIncomingDamage(amount)
    this.lastDamageTaken = actual
    this.hp = Math.max(0, this.hp - actual)
    const ratio = this.hp / this.maxHp
    this.hpBar.setScale(ratio, 1)

    this.label.setAlpha(0.5)
    this.scene.time.delayedCall(60, () => {
      if (this.active) this.label.setAlpha(1)
    })

    return this.hp <= 0
  }

  update(t: number, delta: number) {
    if (this.atBarricade) return

    this.updateSpecialMovement()
    this.y += (this.speed * this.speedMult * delta) / 1000

    if (this.y >= BARRICADE_Y - 20) {
      this.y = BARRICADE_Y - 20
      this.atBarricade = true
      this.arrivedTime = t
      this.lastAttackTime = 0
    }
  }

  knockback(dist: number) {
    this.y = Math.max(BARRICADE_Y - 600, this.y - dist)
    if (this.atBarricade) {
      this.atBarricade = false
      this.lastAttackTime = 0
    }
  }

  tryAttackBarricade(now: number): boolean {
    if (!this.atBarricade) return false
    if (this.hasAbility('warning_attack') && !this.attackWarningShown && now - this.arrivedTime >= ATTACK_DELAY - 350) {
      this.attackWarningShown = true
      this.showAttackWarning()
    }
    if (now - this.arrivedTime < ATTACK_DELAY && this.lastAttackTime === 0) return false
    if (this.lastAttackTime > 0 && now - this.lastAttackTime < ATTACK_COOLDOWN) return false

    this.lastAttackTime = now

    // 攻撃アニメーション
    this.scene.tweens.add({
      targets: this,
      y: this.y + 6,
      duration: 80,
      yoyo: true,
    })

    return true
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
    this.hpBar.setScale(this.hp / this.maxHp, 1)
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
