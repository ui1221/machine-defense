# UI Design Rules

この文書は Machine Defense のUI実装ルールです。
新しいUIを追加・修正するときは、まずこの文書と `src/ui/theme.ts` を確認します。

## 1. 画面基準

- 内部解像度は `480 x 854` を維持する。
- Phaser の表示は端末DPRに応じた高解像度 Canvas とカメラズームで行う。
- `RENDER_SCALE` は `1.25〜2.5` の動的値。PCのDPR1環境では負荷を抑え、スマホ高DPR環境では鮮明さを優先する。
- `canvas.width / canvas.clientWidth` が 1 を下回る状態は禁止。UIが全体的に滲む原因になる。
- レイアウトは縦画面スマホを基準にする。
- 内部解像度を本番向けに大きく変更しない。素材だけ高解像度で用意し、表示サイズを調整する。

## 2. UIレイヤー

- 上部バー: プレイヤー状態、クレジット、設定などを置く。
- 下部バー: グローバルナビを置く。
- メイン領域: 現在タブの内容を置く。
- 立ち絵領域: ロビー、キャラ、ショップなどで共通の配置基準を使う。
- 帯ダイアログ: 確認、重要選択、レベルアップなどに使う。

### 2.1 立ち絵領域

- ロビー、キャラ、ショップ担当者などの非戦闘立ち絵は `src/ui/dom/standee.ts` の共通部品を使う。
- 画面ごとに立ち絵の座標・サイズを直書きしない。
- 配置基準は `src/ui/dom/styles.css` の `--md-standee-*` 変数で管理する。
- 立ち絵は各タブのスクロール領域やパネル領域の内側に入れない。必ず画面全体基準のDOMレイヤー直下に置く。
- 影・残像は本体画像の複製ではなく、同一シルエットを単色で塗った別レイヤーとして扱う。
- 影の形や位置には表現上の意味があるため、消したり通常画像と同じ色で重ねたりしない。
- 本体立ち絵は画面ごとに透明度を変えない。必要な奥行き表現は背面の帯や影で調整する。
- 基本位置は、つま先が画面下端からわずかに画面外へ出る程度を基準にする。

## 3. 幅と余白

- 「帯」は画面横幅を使い切る。`x = 0`, `width = GAME_W` を基準にする。
- 帯の中身には内側余白を取ってよい。
- ボタンやカードの外側余白は、意味のある配置理由がある場合だけ使う。
- 画面端に不要なデッドスペースを作らない。

## 4. 文字サイズ

原則として、スマホ実機で読めるサイズを優先する。

- 大見出し: `24px`
- セクション見出し: `20px`
- ボタン主文: `20px`
- 本文: `16px`
- 補足: `14px`
- メタ情報: `13px`
- `13px` 未満の文字は原則禁止。

例外的に小さい文字を使う場合は、装飾ではなく読まなくても成立する情報に限る。

## 5. 枠線

- 通常枠: `1px`
- 選択・押下枠: `2px`
- 重要・レア枠: `2px`
- `3px` 以上の枠線は原則使わない。
- 枠線の色、太さ、透明度は `src/ui/theme.ts` の定数を優先する。

## 6. 色

基本色は `src/ui/theme.ts` に集約する。

- 背景UI面: 暗い青黒
- 通常アクセント: 緑
- 選択・押下: 黄色
- 危険・売却・解除: 赤
- 無効: グレー
- レア: 黄色
- アイテムカテゴリ色は、アイテムカードや装備枠に限定して使う。

## 7. 共通部品

新しいUIを直書きしない。可能な限り既存の共通部品を使う。

- 標準ボタン: `createEdgeButton`
- 標準カード: `createInfoCard`
- 標準リスト行: `createListRow`
- 標準選択パネル: `createSelectionPanel`
- 標準確認ダイアログ: `showConfirmDialog`
- UI定数: `src/ui/theme.ts`

共通部品で表現できない場合は、先に共通部品の拡張を検討する。

## 7.1 上部バー

上部バーは全タブ共通の状態表示領域として扱う。

- 背景は上端から下へ消える黒グラデーションを使う。
- 枠やカードを重ねない。
- 左端に顔アイコン、中央寄りにクレジット、右端に設定ボタンを置く。
- 顔アイコンの丸サイズは下部ナビのアイコン丸と揃える。
- クレジットはアイコンと数値を同一ベースラインで横並びにする。
- 設定ボタンはゲーム内操作ではなくメタ操作なので、強い丸枠を付けない。
- タブごとのタイトルは原則置かない。必要な見出しはメイン領域側に置く。

## 7.2 下部ナビ

下部ナビは全タブ共通のグローバル操作領域として扱う。

- 背景は下端から上へ消える黒グラデーションを使う。
- ナビ項目は中央寄せにし、左右端に過剰に広げない。
- 各アイコンの丸サイズ、線幅、ラベル位置は全項目で統一する。
- 図形や文字アイコンの見た目に引っ張られて丸サイズを変えない。
- 選択状態は黄色アクセント、明度、下線などで示してよいが、非選択項目と基準位置を変えない。
- ラベルは `13px` 以上を守る。

## 7.3 標準アクションボタン

標準ボタンは `createEdgeButton` を使う。

- 高さは `66px` を基本にする。
- 横幅は原則 `318px` 以上、画面端から伸びる配置では `x = -10` を基準にする。
- 主文は `20px`、補足は `15px` を基本にする。
- 背景は十分に不透明にし、背景画像と文字が混ざらないようにする。
- 通常枠は緑系、押下・選択枠は黄色系を使う。
- 角丸、下線、右三角など、意味の薄い装飾は追加しない。
- 左アクセントはカテゴリや操作種別を示す場合だけ使う。

## 7.4 標準選択リスト

標準リストは `createListRow` を使う。

- 行高は `68px` を基本にする。
- 1行は「アイコン / 名称 / 補足 / 右端メタ情報」で構成する。
- 右端メタ情報はアイコンと同じく縦中央に揃える。
- 背景画像の上に置く場合でも読めるよう、標準リストの背景はやや不透明寄りにする。
- 区切り線は全行で同じ色と透明度にする。
- 選択中・前回選択・押下中は黄色枠で示す。
- 無効行は背景と文字を暗くし、タップできないことを示す。
- ステージ、敵、アイテム、装備候補は同じリスト密度を基準にする。

## 8. アイコン

- 絵文字や記号文字はサイズ・重心が揺れやすい。
- 重要なナビ、ボタン、カテゴリ表示では、将来的に Graphics または画像アイコンへ置き換える。
- 文字アイコンを使う場合も、丸枠やボタンサイズが文字によって変わらないようにする。

## 9. 禁止事項

- 意味のない枠の重ねがけをしない。
- 枠の下にさらに枠を置くような構造を避ける。
- 透明すぎて背景と混ざるボタンを作らない。
- タブごとに独自デザインを作らない。
- 小さい文字で情報を詰め込まない。
- UIの位置やサイズをその場の感覚だけで決めない。
- ユーザーが指定していない装飾を追加しない。

## 10. 既存UIの移行順

今後のUI整理は、以下の順で進める。

1. 標準リスト行 `createListRow`
2. 標準カード `createInfoCard`
2. 下部ナビ
3. 上部バー
4. サイドフレーム、補給担当表示
5. 戦闘HUDボタン
6. 敵ファイル、アイテム一覧のアイコン仕様

## 10.1 標準リスト

一覧するだけの情報は、原則としてカードではなくリスト形式にする。

- アイテム一覧、敵ファイルなどは標準リストを優先する。
- 1行の高さは `64px` 以上を基準にする。
- 1行に表示する情報は、アイコン、名前、短い説明または数値に絞る。
- 行ごとの強い枠線は避ける。
- 区切りは薄い水平線、または選択時だけの背景変化を使う。
- 詳細説明が必要な場合は、リスト行に詰め込まず、別の詳細領域に出す。

リストには2種類ある。

- `compact`: 敵ファイル、アイテム一覧など、閲覧中心のリスト。
- `selectable`: 装備変更、売却、購入など、選択操作を伴うリスト。

`selectable` は `compact` と同じ行高を基本にし、背景の濃さ、無効表示、押下状態で操作対象だと示す。
行高を大きくするのは、文字が入らない場合や誤タップが明確に起きる場合に限る。

選択リストでは、タップしやすさだけでなく一覧性も同時に要求される。

- 候補が多い画面では、余白より一覧性を優先する。
- 行高を広げすぎて大量スクロールを発生させない。
- タップ領域は行全体を押せるようにして確保する。
- 押しやすさは余白ではなく、行全体タップ、押下状態、背景濃度で補う。
- 1画面に表示できる候補数が不自然に減る変更は避ける。
- 余白を増やす場合は、候補数、スクロール量、文字の入り方を確認してから行う。

### 10.1.1 リストの表示境界

リストは、上部バー・下部ナビ・固定ヘッダーなど常に見えているUIを侵食してはいけない。
リスト外へ出た描画を後から濃い板で隠さない。

- リストには、描画してよい `visibleViewport` と、完全に見せてはいけない `blockedArea` を明確に定義する。
- リスト境界を隠すための不透明な覆い板は禁止する。透明な覆い板も、描画制御の責務を持たないため置かない。
- 全画面リストでは、上下の固定UIに近づく手前に `fadeBand` を置く。標準値は `28px`。
- 全画面リストの行が `fadeBand` に入ったら、行全体の透明度を距離に応じて徐々に下げる。
- 全画面リストの行が上部バー・下部ナビの `blockedArea` に入ったら、完全に透明にし、タップ判定も無効にする。
- 選択パネル内リストでは、パネルヘッダーとパネル下部を `blockedArea` とし、フェードは使わない。
- 選択パネル内リストでは、リストより前面にパネル自身の固定ヘッダー面・下部面・枠線を置く。リスト項目はその下を通り、ヘッダーや枠線を途切れさせない。
- 選択パネル内リストの入力は `visibleViewport` 内だけで受ける。ヘッダーやパネル下部に隠れている行はタップできない。
- WebGL と Canvas で見え方の方針が変わらないよう、マスクに頼る場合でも同じ `visibleViewport` / `blockedArea` を使う。
- Canvas で `GeometryMask` が使えない場合は、行またはリスト描画面の透明度制御で対応する。別のUI面を重ねて隠す方法は使わない。

## 10.2 標準選択パネル

装備変更など、背後の情報と重なる場所に一時的な選択肢を出す場合に使う。

- 背後の文字や絵と混ざらないよう、十分に不透明な背景面を持つ。
- 中身は `selectable` の標準リスト行を使う。
- 長い説明や詳細情報を詰め込まない。
- 装備名、主効果、レアリティ、現在装備中かどうかに絞る。
- スクロール可能にする。
- パネル内のリストは、背後のUIではなくパネル自体のレイアウト基準に従う。
- パネルを全画面幅にする場合は、不要な左アクセントや装飾を入れない。
- 閉じる操作や補助操作は、リスト行に混ぜず、パネル上部の操作領域に置く。
- 戻る操作は `<` だけにせず、原則 `< 戻る` と表記する。
- 戻る操作には文字より広い不可視ヒット領域を用意する。
- 戻る、閉じる、外すなどのパネルヘッダー操作は `pointerdown` / `pointerup` で入力伝播を止め、背後や下のリスト行へタップが貫通しないようにする。
- ヘッダー操作はリスト描画後に追加するか、`bringToTop` で必ずリストより前面に置く。
- スクロール後でもヘッダー操作がリスト項目より優先して反応することを確認する。

## 11. 実装前チェック

UIを変更する前に確認する。

- 既存の共通部品で実装できるか。
- `src/ui/theme.ts` の定数で表現できるか。
- 文字サイズが `13px` 未満になっていないか。
- 押下、選択、無効状態が揃っているか。
- スマホでタップしやすい幅と高さがあるか。
- 候補一覧でスクロール量を増やしすぎていないか。
- 背景に埋もれない不透明度になっているか。

## 12. 判断基準

迷った場合は、装飾より可読性と操作性を優先する。
見た目を足すより、まず不要な枠、不要な文字、不要な余白を減らす。

## DOM Standard Buttons Update 2026-05-27

- Standard DOM action buttons must stay inside the screen edge.
- Do not make standard action buttons intentionally overflow past the left screen edge.
- Do not use a left-edge accent strip on standard action buttons.
- Dialog boxes should follow the same reduced-decoration direction: no left-edge accent strip unless explicitly requested.
- Width, spacing, and internal text layout may vary by container, but the outer shape must read as the same button family.

## DOM Standard Content Sheets Update 2026-05-27

- Standard dark content sheets use `#06101d` at `0.88` alpha. In DOM CSS, use `--md-sheet-bg`.
- Subtle sheet dividers use `rgba(138, 160, 187, 0.18)`. In DOM CSS, use `--md-sheet-line`.
- Do not create several separate dark boxes when one connected content sheet better preserves the screen structure.
- For the result screen DOM migration, the connected content sheet starts at the mission-clear/title area and ends after the total-damage section.
- The result screen connected content sheet must not extend behind the bottom result buttons.
- Result screen content is one continuous information design, not separate cards. The title, reward text, and total-damage text share one dark sheet; borders should not imply separate panels unless a new rule explicitly calls for them.
- Result screen portrait shadow color belongs to the portrait/character presentation, not to success/failure state. Do not recolor the character shadow for mission failure.
- Result screen layout must be driven by named CSS variables, not one-off nudges:
  - `--md-result-x`: shared left content inset.
  - `--md-result-label-w`: reward label column width.
  - `--md-result-row-h`: reward row height.
  - `--md-result-title-top`, `--md-result-reward-title-top`, and `--md-result-damage-title-top`: vertical anchors for the continuous information sheet.
  - `--md-result-section-title-h`: heading line box height.
  - `--md-result-section-title-gap`: gap from heading to the first row/list.
  - `--md-result-damage-row-h` and `--md-result-damage-row-gap`: total-damage list rhythm.
- Rows with different font sizes must align by row center, not by text top.

## DOM Battle Level-Up Selection Update 2026-05-27

- Level-up selection is a modal decision surface and should use DOM, not Phaser-drawn cards.
- Use the full screen width for level-up choices.
- Choice buttons must be large enough for long upgrade descriptions; the current minimum height is `104px`.
- Keep each choice as one tap target with icon, name, and description inside the same button.
- Enemy-following combat UI such as enemy HP bars should remain Phaser-side because it belongs to moving game objects.

## DOM Fixed Battle HUD Update 2026-05-27

- Fixed battle HUD belongs in DOM; moving battle objects and their attached indicators stay Phaser-side.
- Fixed battle HUD must be unmounted before showing the result screen; the current result screen is an independent result view, not a battle-overlay result.
- EXP and barricade HP use the same bar family: same height, same rounded track, same label/value columns.
- The standard HUD bar height is `16px`.
- HUD bar fills may use a subtle highlight/gradient so the bars do not look flat, but must keep the readable value text outside the fill.
- HUD bar tracks and fills should stay semi-transparent enough that enemy movement and bullets remain visible behind them.
- Barricade HP may change fill color by health ratio; EXP should keep the blue/cyan fill.

## DOM Portrait Standee Update 2026-05-27

- Lobby, unit tab, and result portraits share the same DOM standee size variables.
- Current common portrait size is `--md-standee-w: 468px` and `--md-standee-h: 950px`, about 1.2x of the previous DOM size.
- Current common portrait position is `--md-standee-top: 250px` and `--md-standee-right: -125px`.
- The portrait may be positioned partly outside the screen to create an edge-cropped composition, but the DOM UI root/layers must clip overflow so offscreen parts are not drawn.
- When changing portrait size, adjust the shared top/right variables together so the feet sit slightly below the bottom edge and the character's right side can be cropped by the screen edge without covering key status text.
- This is the baseline composition for character-focused non-combat screens: the character is the central visual subject, and UI elements should surround or overlap the portrait without hiding the face or destroying readability.
- The unit tab is the reference implementation for this composition.
- Future shop staff portraits should follow the same idea: place the person as part of the screen composition, allow controlled edge cropping, and arrange shop controls around the portrait rather than treating the portrait as a separate decorative card.

## DOM Home Atmosphere Update 2026-05-28

- The home shell may use a very subtle full-screen horizontal scanline atmosphere.
- Top and bottom bars keep the strongest scanline treatment; the full-screen atmosphere must fade toward the center and stay much weaker there.
- The atmosphere belongs behind home UI controls and should not be applied to battle or result screens by default.
- Do not make the full-screen scanline strong enough to fight with text, portrait details, list rows, or the top/bottom bars.

## DOM Bottom Navigation Update 2026-05-28

- Bottom navigation icons and labels should read as one compact unit.
- Keep the tap area large, but avoid large dead space between the icon and label.
- The current bottom navigation uses a `43px / 20px` grid, with the icon shifted slightly downward and the label aligned to the top of its row.
