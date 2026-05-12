export const GAME_W = 480
export const GAME_H = 854

// バリケード位置
export const BARRICADE_Y = GAME_H - 140
export const BARRICADE_H = 12

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

// キャラクター固定スロット位置（左から順に5枠）
const _slotSpacing = (FIELD_RIGHT - FIELD_LEFT) / (MAX_CHARACTERS + 1)
export const CHAR_SLOTS: number[] = Array.from({ length: MAX_CHARACTERS }, (_, i) =>
  FIELD_LEFT + _slotSpacing * (i + 1)
)
