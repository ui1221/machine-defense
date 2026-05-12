# AGENTS.md — AI Development Agent Guide

このファイルはAI開発エージェント・IDEプラグイン向けのコードベース理解ガイドです。
人間向けの概要は `README.md` を参照してください。

---

## 1. プロジェクト構造の要点

```
src/
├── main.ts          # Phaser.Game インスタンス生成のみ。編集不要なことが多い
├── constants.ts     # 座標・サイズ系の定数。ハードコード禁止。必ずここから参照
├── types/index.ts   # 全型定義の一元管理。新しい型はここに追加
├── data/            # マスターデータ（純粋オブジェクト）。ロジックを持たない
├── objects/         # Phaser.GameObjects を継承したクラス群
├── systems/         # ゲームロジックを担うシステムクラス（Scene非依存）
└── scenes/          # Phaser.Scene を継承したシーン群
```

---

## 2. アーキテクチャ & データフロー

### シーン遷移

```
BootScene
  └─→ HomeScene  ←──────────────────────────────┐
        └─→ BattleScene ──→ ResultScene ──────────┘
              ↕ (parallel launch)
          BattleUIScene
```

- `BattleScene` は起動時に `BattleUIScene` を **parallel launch** する
  (`this.scene.launch('BattleUIScene', { battle: this })`)
- `BattleUIScene` は `BattleScene` への参照を `this.battle` として保持し、
  イベントバスで通信する（直接メソッド呼び出しは避ける）

### BattleScene 内の update ループ（毎フレーム）

```
update(delta)
  ├─ SpawnManager.update(delta)     → SpawnEntry[] を返す → Enemy を生成
  ├─ DamageZone ループ              → 炎床の tick ダメージ・鈍足適用
  ├─ Character.tryShoot()           → AttackResult | null を返す
  │    └─ AttackResult の kind で分岐
  │         ├─ 'slash'    → doSlash()（即時範囲判定）
  │         ├─ 'burst'    → 複数 Bullet 生成（扇状）
  │         └─ 'bullet'/'mage_bolt' → Bullet 生成
  ├─ Bullet.checkHit(enemies)       → 命中した Enemy | null
  │    └─ isMageBolt なら createDamageZone()、そうでなければ takeDamage()
  ├─ Enemy.tryAttackBarricade()     → Barricade.takeDamage()
  └─ 全滅チェック → endGame()
```

### レベルアップフロー

```
onEnemyKilled()
  └─ LevelUpManager.addExp(expReward)
       └─ leveledUp === true のとき onLevelUp()
            ├─ this.scene.pause()          ← BattleScene を停止
            ├─ buildBattleState()          ← BattleState インターフェース生成
            ├─ LevelUpManager.pickChoices(state) ← 重み付きランダム3択
            └─ events.emit('levelUp', choices) → BattleUIScene がUIを表示

BattleUIScene でカード選択
  └─ BattleScene.applyUpgrade(id)
       ├─ UpgradeOption.apply(state)      ← 強化を適用
       ├─ LevelUpManager.recordChoice(id)
       └─ this.scene.resume()             ← BattleScene を再開
```

---

## 3. 重要な型・インターフェース

### `BattleState` — 強化システムの核心

`src/types/index.ts` に定義。`UpgradeOption.apply()` が受け取る唯一の引数。

```typescript
interface BattleState {
  characterCount: number
  level: number
  acquiredUpgrades: Map<string, number>  // id → 取得回数
  // ミューテーション用メソッド（BattleScene側で実装）
  addCharacter:       (id: string) => void
  hasCharacter:       (id: string) => boolean
  boostCharAtk:       (charId: string, mult: number) => void
  boostCharAtkSpeed:  (charId: string, mult: number) => void
  addCharBurst:       (charId: string) => void
  enableCharPiercing: (charId: string) => void
}
```

> **重要**: `UpgradeOption` はシーンを直接参照しない。必ず `BattleState` 経由で
> キャラクターを操作する。新しい強化効果が必要な場合は `BattleState` にメソッドを追加する。

### `AttackType` と `AttackResult`

```typescript
type AttackType = 'bullet' | 'burst' | 'mage' | 'slash'

type AttackResult =
  | { kind: 'bullet';    tx: number; ty: number }
  | { kind: 'burst';     tx: number; ty: number }
  | { kind: 'mage_bolt'; tx: number; ty: number }
  | { kind: 'slash';     tx: number; ty: number }
```

`Character.tryShoot()` がこれを返し、`BattleScene.update()` が `kind` でスイッチして
それぞれの攻撃処理へ分岐する。新しい攻撃タイプを追加する場合は union に追加し、
`update()` の分岐も追加する。

### `GameSave` — localStorage スキーマ

```typescript
interface GameSave {
  clearedStages: string[]    // StageConfig.id の配列
  ownedWeapons: OwnedWeapon[]
}

interface OwnedWeapon {
  uid: string                // Date.now().toString(36) + random で生成
  weaponId: string           // WEAPONS のキー
  equippedCharId: string | null
}
```

`SAVE_KEY = 'td_save'` で `localStorage` に保存。`HomeScene` / `BattleScene` /
`ResultScene` のそれぞれが `loadSave()` / `saveClear()` / `saveDroppedWeapons()` を
**個別に**実装している（共有モジュール化されていない）。

---

## 4. マスターデータの構造と追加方法

すべてのマスターデータは `src/data/` 以下の純粋オブジェクトとして管理される。
ロジックを持たない。

### キャラクターを追加する

1. `src/data/characters.ts` の `CHARACTERS` に `CharacterConfig` を追加
2. `src/data/upgrades.ts` に対応する強化カードを `UPGRADE_POOL` へ追加
3. 新しい `AttackType` が必要なら `src/types/index.ts` → `AttackResult` → `BattleScene.update()` を更新
4. `AGENTS.md` の「キャラクター」セクションを更新（任意）

### 敵を追加する

1. `src/data/enemies.ts` の `ENEMIES` に `EnemyConfig` を追加
2. `src/data/stages.ts` のスポーンテーブルで `enemyId` として参照する

### ステージを追加する

1. `src/data/stages.ts` の `STAGES` 配列に `StageConfig` を追加するだけ
2. `HomeScene` はこの配列を自動的にリスト表示する（追加コード不要）

### 強化カードを追加する

1. `src/data/upgrades.ts` の `UPGRADE_POOL` に `UpgradeOption` を追加
2. `BattleState` に存在しない操作が必要なら `src/types/index.ts` → `BattleScene.buildBattleState()` にも追加

### 武器を追加する

1. `src/data/weapons.ts` の `WEAPONS` に `WeaponConfig` を追加するだけ
2. `WEAPON_IDS` は `Object.keys(WEAPONS)` で自動生成されるので変更不要

---

## 5. キャラクタークラスの主要プロパティ

`src/objects/Character.ts` が持つランタイムステータス（強化で変化するもの）：

| プロパティ | 型 | 初期値 | 変更タイミング |
|-----------|----|---------|----|
| `atkMult` | `number` | `1.0` | 武器装備時・強化選択時 |
| `atkSpeedMult` | `number` | `1.0` | 武器装備時・強化選択時 |
| `rangeMult` | `number` | `1.0` | 武器装備時・強化選択時 |
| `burstCount` | `number` | `1` | `addCharBurst()` で +1 |
| `piercing` | `boolean` | `false` | `enableCharPiercing()` で true |
| `speedMult` | `number` | `1` | 炎床（DamageZone）が毎フレームリセット&再適用 |

`effectiveAtk` は `config.atk * atkMult` を返す getter。

---

## 6. システムクラスの責務

| クラス | 場所 | 責務 |
|--------|------|------|
| `SpawnManager` | `systems/` | スポーンテーブルを時間軸で管理。`update(delta)` が`SpawnEntry[]` を返す |
| `InputManager` | `systems/` | タップ/クリック座標を保持。`pause()` / `resume()` でレベルアップ中の入力を無効化 |
| `TargetingSystem` | `systems/` | キャラクターに最も近い敵を返す |
| `LevelUpManager` | `systems/` | EXP・レベル・選択済み強化を管理。`pickChoices(state)` で重み付き抽選 |

---

## 7. イベントバス（BattleScene ↔ BattleUIScene）

`BattleScene` と `BattleUIScene` は Phaser のイベントバスで疎結合している。

| イベント名 | 発火元 | 受信先 | ペイロード |
|-----------|--------|--------|-----------|
| `battleUpdate` | `BattleScene.update()` 末尾 | `BattleUIScene` | なし |
| `expChanged` | `onEnemyKilled()` | `BattleUIScene` | なし |
| `levelUp` | `onLevelUp()` | `BattleUIScene` | `UpgradeOption[]` |
| `levelUpDone` | `applyUpgrade()` | `BattleUIScene` | なし |

> 新しいUI要素を `BattleUIScene` に追加する場合、`battle.events.on()` で
> 購読し、`shutdown()` で `battle.events.off()` を忘れずに追加する。

---

## 8. 定数の使い方（ハードコード禁止）

`src/constants.ts` を必ず参照。座標・サイズを直接数値で書かない。

```typescript
// ❌ 悪い例
const y = 714   // BARRICADE_Y のつもり

// ✅ 良い例
import { BARRICADE_Y } from '../constants'
const y = BARRICADE_Y
```

| 定数 | 値 | 用途 |
|------|----|------|
| `GAME_W` / `GAME_H` | 480 / 854 | 画面サイズ |
| `BARRICADE_Y` | `GAME_H - 140` | バリケードのY座標 |
| `CHAR_LINE_Y` | `BARRICADE_Y + 60` | キャラクター配置ライン |
| `CHAR_SLOTS` | `number[5]` | キャラ5枠のX座標配列 |
| `MAX_CHARACTERS` | `5` | 同時配置可能な最大人数 |
| `SPAWN_Y` | `-40` | 敵スポーンのY座標（画面外上） |

---

## 9. 未実装・既知の制約

- **`ExpOrb.ts` が存在するが未使用**: 経験値オーブが視覚的にドロップする演出は実装されていない。現在は `onEnemyKilled()` で直接 `LevelUpManager.addExp()` を呼んでいる。
- **武器ドロップ率が固定**: `WEAPON_DROP_RATE = 0.001`（0.1%）。難易度別の調整機能はない。
- **BootScene は空**: アセット読み込み等の処理は未実装。現状は即 HomeScene へ遷移。
- **セーブ共有モジュールがない**: `loadSave()` が HomeScene / BattleScene / ResultScene に重複している。リファクタリング対象。
- **ステージは3つのみ**: `stages.ts` に追加するだけでスケール可能。
- **BGM・SE なし**: Phaser の Sound システムは未使用。

---

## 10. よくある変更タスクと対応ファイル

| やりたいこと | 主な変更対象ファイル |
|------------|-------------------|
| 新キャラ追加 | `data/characters.ts`, `data/upgrades.ts`, `types/index.ts`（必要なら） |
| 新敵追加 | `data/enemies.ts`, `data/stages.ts` |
| 新ステージ追加 | `data/stages.ts` のみ |
| 新強化カード追加 | `data/upgrades.ts`（BattleStateに新操作が必要なら `types/index.ts` + `BattleScene.ts`） |
| 新武器追加 | `data/weapons.ts` のみ |
| UIレイアウト変更 | `scenes/HomeScene.ts` / `scenes/BattleUIScene.ts` / `scenes/ResultScene.ts` |
| ゲームバランス調整 | `data/` 以下の各マスターデータ、`constants.ts` |
| 攻撃エフェクト変更 | `scenes/BattleScene.ts`（doSlash / createDamageZone）、`objects/Bullet.ts` |
| セーブ構造の変更 | `types/index.ts` の `GameSave`、全シーンの `loadSave()` / save処理 |
