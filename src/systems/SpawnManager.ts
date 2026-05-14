import type { AmbientSpawnConfig, StageConfig, SpawnEntry } from '../types'

export interface SpawnEvent {
  entry: SpawnEntry
  remaining: number
  nextTime: number
  interval: number
}

export class SpawnManager {
  private events: SpawnEvent[]
  private elapsed = 0
  private _allSpawned = false

  constructor(stage: StageConfig) {
    const entries = [
      ...stage.spawnTable,
      ...this.buildAmbientEntries(stage),
    ].sort((a, b) => a.time - b.time)

    this.events = entries.map(entry => {
      const duration = this.resolveDuration(entry)
      const interval = entry.count > 1 && duration > 0 ? duration / (entry.count - 1) : 0
      return {
        entry,
        remaining: entry.count,
        nextTime: entry.time,
        interval,
      }
    })
  }

  update(delta: number): SpawnEntry[] {
    this.elapsed += delta / 1000
    const toFire: SpawnEntry[] = []

    for (const ev of this.events) {
      while (ev.remaining > 0 && this.elapsed >= ev.nextTime) {
        if (ev.interval <= 0) {
          toFire.push({ ...ev.entry, count: ev.remaining })
          ev.remaining = 0
          break
        }

        toFire.push({ ...ev.entry, count: 1 })
        ev.remaining--
        ev.nextTime += ev.interval
      }
    }

    if (!this._allSpawned && this.events.every(e => e.remaining <= 0)) {
      this._allSpawned = true
    }

    return toFire
  }

  get allSpawned() { return this._allSpawned }

  private resolveDuration(entry: SpawnEntry) {
    if (entry.duration !== undefined) return Math.max(0, entry.duration)
    if (entry.count <= 4) return 0
    if (entry.enemyId.includes('boss')) return 0
    return Math.min(24, Math.max(6, entry.count * 0.45))
  }

  private buildAmbientEntries(stage: StageConfig): SpawnEntry[] {
    const stageNo = Number(stage.id.replace('stage_', '')) || 1
    const lastTime = Math.max(...stage.spawnTable.map(entry => entry.time), 240)
    const configs = stage.ambientSpawns ?? this.defaultAmbient(stageNo, lastTime)
    const entries: SpawnEntry[] = []

    for (const cfg of configs) {
      for (let time = cfg.start; time <= cfg.end; time += cfg.interval) {
        entries.push({
          time,
          enemyId: cfg.enemyId,
          count: cfg.count,
          spread: cfg.spread,
          duration: 0,
          hpMult: cfg.hpMult,
        })
      }
    }

    return entries
  }

  private defaultAmbient(stageNo: number, lastTime: number): AmbientSpawnConfig[] {
    const hpMult = 1 + Math.floor((stageNo - 1) / 5) * 0.35
    const interval = Math.max(4.2, 7 - stageNo * 0.08)
    const end = Math.max(60, lastTime - 8)
    const configs: AmbientSpawnConfig[] = [
      {
        start: 10,
        end,
        interval,
        enemyId: stageNo <= 6 ? 'basic' : stageNo <= 14 ? 'dense' : 'core',
        count: stageNo <= 10 ? 1 : 2,
        spread: 360,
        hpMult,
      },
    ]

    if (stageNo >= 3) {
      configs.push({
        start: 75,
        end,
        interval: interval * 1.65,
        enemyId: stageNo <= 12 ? 'light' : 'scout',
        count: 1,
        spread: 420,
        hpMult,
      })
    }

    return configs
  }
}
