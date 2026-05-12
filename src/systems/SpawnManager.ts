import type { StageConfig, SpawnEntry } from '../types'

export interface SpawnEvent {
  entry: SpawnEntry
  fired: boolean
}

export class SpawnManager {
  private events: SpawnEvent[]
  private elapsed = 0
  private _allSpawned = false

  constructor(stage: StageConfig) {
    this.events = stage.spawnTable.map(entry => ({ entry, fired: false }))
  }

  update(delta: number): SpawnEntry[] {
    this.elapsed += delta / 1000
    const toFire: SpawnEntry[] = []

    for (const ev of this.events) {
      if (!ev.fired && this.elapsed >= ev.entry.time) {
        ev.fired = true
        toFire.push(ev.entry)
      }
    }

    if (!this._allSpawned && this.events.every(e => e.fired)) {
      this._allSpawned = true
    }

    return toFire
  }

  get allSpawned() { return this._allSpawned }
}
