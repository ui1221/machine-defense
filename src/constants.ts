export const GAME_W = 480
export const GAME_H = 854

// バリケード位置
export const BARRICADE_Y = GAME_H - 140
export const BARRICADE_H = 12
export const DEFAULT_BARRICADE_HP = 100

// キャラクター配置ライン（バリケードの内側・下）
export const CHAR_LINE_Y = BARRICADE_Y + 60
export const MAX_CHARACTERS = 5

// 経験値。Lv0-2はLevelUpManager側で早期成長テーブルを使う。
export const BASE_EXP = 70
export const EXP_PER_LEVEL = 25

// 弾
export const DEFAULT_BULLET_SPEED = 400

// 敵スポーン
export const SPAWN_Y = -40
export const SPAWN_MARGIN_X = 40

// フィールド
export const FIELD_LEFT = 20
export const FIELD_RIGHT = GAME_W - 20

// 中央から左右へ広がる固定スロット位置。
export const CHAR_SLOTS: number[] = [
  GAME_W / 2,
  GAME_W / 2 - 74,
  GAME_W / 2 + 74,
  GAME_W / 2 - 148,
  GAME_W / 2 + 148,
]
