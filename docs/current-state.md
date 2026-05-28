# Current State Handoff

Last updated: 2026-05-28

This document is for continuing work in a new Codex thread without relying on the full chat history.

## Project

- Workspace: `C:\Users\youie\.gemini\antigravity\scratch\towerdefense`
- App: Phaser 3 + TypeScript + Vite
- Local preview: `http://127.0.0.1:5173/machine-defense/`
- Public preview: `https://ui1221.github.io/machine-defense/`

## Current Product Direction

The game is a vertical defense roguelite shooter:

- Enemies enter from the top and move downward toward the barricade.
- Allies stand near the bottom behind the barricade.
- Combat is automatic, with tap/hold aim override.
- Killing enemies gives immediate EXP.
- Level-up pauses combat and offers 3 upgrade cards.
- Base UI contains stage, character, lobby, shop, and file areas.
- Long-term direction is a polished mobile-first game with anime/mecha girl allies, enemy graphics, base UI, shop/research, equipment, and 30 stages.

## Important Design Direction

The user strongly dislikes:

- Box-in-box UI.
- Arbitrary borders with inconsistent thickness.
- Text or icons that are vertically misaligned.
- Tiny unreadable text on phone.
- Emoji/icon glyphs causing layout jitter.
- Decorative additions without a clear reason.
- UI elements overlapping because layout was not standardized.

Use `docs/ui-design-rules.md` as the source of truth for UI rules.

Current preferred style:

- Full-width translucent dark sheets/bands instead of small framed boxes.
- Standard edge buttons for major actions.
- Standard list rows for item/enemy/stage/selectable lists.
- Strong alignment rules: center rows visually, keep labels/numbers on defined baselines.
- For selection panels, prioritize both tap comfort and list density.
- Header/back controls must stay above scroll content to avoid click-through.

## Recent Technical Context

### DOM UI Migration

The project is migrating menu/list-heavy UI away from Phaser objects and into a DOM overlay.

Implemented:

- `#ui-root` overlay aligned to the Phaser canvas.
- Shared DOM components:
  - edge buttons
  - list rows
  - empty states
  - drag-scroll list containers
  - portrait standees with a separate colored shadow layer
- File tab DOM UI:
  - menu first
  - Items and Enemies lists after selection
- Stage tab DOM UI:
  - stage list
  - last-played highlight
  - when opened, the last-played stage scrolls into view automatically
  - click starts `BattleScene`
- Shop tab DOM UI:
  - menu
  - buy list
  - sell list
  - research list
  - DOM confirmation dialog for shop actions
- Character/equipment tab DOM UI:
  - character selector
  - character detail stats
  - character upgrade confirmation
  - equipment slots
  - equipment selection list
  - unequip action
- Lobby standee DOM UI:
  - shared portrait standee
  - yellow shadow is rendered as a separate masked layer, not as a duplicated normal portrait
  - lobby message window is DOM-based and mounted with the lobby standee screen
  - shared portrait standee is currently scaled to about 1.2x of the previous DOM size through `--md-standee-w` / `--md-standee-h`
  - current portrait composition is the baseline: UI elements surround/overlap the portrait, the face remains readable, feet sit slightly below the bottom edge, and right-side cropping is handled by DOM overflow clipping
  - future shop staff portraits should use the same surrounding-UI composition rather than a separate portrait card
- Bottom navigation DOM UI:
  - dark glass style bar
  - Stage / Character / Lobby / Shop / File tab buttons
  - old Phaser bottom navigation code has been removed from `HomeScene`
- Top status DOM UI:
  - face icon is a temporary crop from `home-portrait.png`
  - credits display
  - settings button and settings menu are implemented in DOM
  - settings icon was revised from a sun/brightness-like symbol to a gear-like symbol
  - old Phaser top status and settings panel code has been removed from `HomeScene`
- Home shell atmosphere:
  - subtle full-screen horizontal scanlines are applied behind home UI controls
  - top/bottom bars keep stronger scanlines; the middle of the screen is intentionally much weaker
- DOM standard action buttons:
  - standard buttons stay inside the screen edge
  - left-edge accent strips are no longer part of the standard style
  - shop/file/settings buttons and DOM confirm dialogs follow this reduced-decoration direction
- Phaser UI reduced-decoration pass:
  - battle level-up dialog and upgrade cards no longer draw left-edge accent strips
- Result screen DOM UI:
  - implemented in `src/ui/dom/ResultScreen.ts`
  - preserve the current text/value/icon/bar position relationships where practical
  - use one connected dark content sheet from the mission-clear/title area through the total-damage section
  - treat the result content as one continuous information design, not separate cards
  - do not extend that sheet behind the bottom result buttons
  - standardized sheet background is `#06101d` at `0.88` alpha; DOM variable is `--md-sheet-bg`
  - avoid subsection dividers unless a specific information hierarchy requires them; spacing and shared alignment should carry the layout first
  - portrait shadow color is part of the shared portrait presentation and must not change for mission failure
  - result buttons and result standee are DOM-based
  - layout is controlled by named CSS variables such as `--md-result-x`, `--md-result-label-w`, `--md-result-row-h`, and result title anchors; avoid one-off positional tweaks
- Battle level-up selection DOM UI:
  - implemented in `src/ui/dom/LevelUpScreen.ts`
  - level-up choices are mounted through the DOM overlay
  - choices use full-width large buttons so longer upgrade descriptions have enough space
- Fixed battle HUD DOM UI:
  - implemented in `src/ui/dom/BattleHudScreen.ts`
  - `BattleUIScene` mounts the combat HUD through the DOM shell and keeps Phaser gameplay visuals separate
  - result screens unmount the battle HUD; the current result screen is independent rather than a battle-overlay result
  - EXP and barricade HP use the same DOM bar structure and thickness
  - pause/speed buttons, level, and time display are DOM-based
  - the old Phaser barricade HP bar has been removed from `Barricade`
- Recent polish:
  - home background has subtle scanlines that are strongest near top/bottom and weaker in the center
  - bottom nav icon/label spacing was tightened
  - bottom nav extra horizontal divider line was removed
  - lobby message text area uses the full available inner width
  - assault description was shortened to keep the unit detail layout consistent

Still Phaser UI:

- battle field object UI:
  - enemy-following HP bars, damage numbers, effects, and other moving-object visuals should stay Phaser unless a specific reason appears

Next planned DOM migration tasks:

1. Replace the temporary top-left face crop with a dedicated face asset when available.
2. Add future shop staff portrait using the saved surrounding-UI portrait composition.
3. Continue game/content work; major Phaser-to-DOM UI migration is complete except moving-object battle visuals that should stay Phaser.

Important implementation files:

- `src/ui/dom/mount.ts`
- `src/ui/dom/components.ts`
- `src/ui/dom/scroll.ts`
- `src/ui/dom/FileScreen.ts`
- `src/ui/dom/StageScreen.ts`
- `src/ui/dom/ShopScreen.ts`
- `src/ui/dom/CharacterScreen.ts`
- `src/ui/dom/LobbyStandeeScreen.ts`
- `src/ui/dom/standee.ts`
- `src/ui/dom/styles.css`
- `src/scenes/HomeScene.ts`

### Renderer / Brave CPU Issue

Brave on the user's PC was using:

- `ANGLE (Microsoft, Microsoft Basic Render Driver...)`
- WebGL path caused high CPU usage.

Fix implemented in `src/main.ts`:

- Preflight WebGL renderer detection.
- If software/basic renderer is detected and no explicit renderer param is set, fallback to `Phaser.CANVAS`.
- Debug overlay can show renderer diagnostics.
- URL params:
  - `debugCanvas=1`
  - `renderer=canvas`
  - `renderer=webgl`

Observed result:

- CPU dropped significantly in Brave after Canvas fallback.
- GPU usage rose, which was considered acceptable.

### Canvas Mask Problem

Canvas renderer did not handle Phaser `GeometryMask` safely in list views. It caused white screen / rendering issues in some tabs.

Fix direction:

- WebGL keeps `GeometryMask`.
- Canvas avoids `GeometryMask`.
- Canvas uses row-level visibility clipping through `HomeScene.updateListClip()`.

Known tradeoff:

- Canvas cannot partially clip a row with this approach.
- Rows may disappear when partly outside the viewport.
- This is preferred over rows bleeding outside panels.

Relevant code:

- `src/scenes/HomeScene.ts`
  - `supportsGeometryMask()`
  - `updateListClip()`
  - list construction in stage, character equipment, item inventory, buy shop, sell shop, enemy file.

## Recent Uncommitted Changes

At the time this handoff was written, `git status --short` showed:

- Modified:
  - `src/data/enemies.ts`
  - `src/main.ts`
  - `src/objects/Enemy.ts`
  - `src/scenes/BootScene.ts`
  - `src/scenes/HomeScene.ts`
  - `src/types/index.ts`
- New assets:
  - `public/assets/enemy-blue-creature.png`
  - `public/assets/enemy-green-creature.png`
  - `public/assets/enemy-purple-creature.png`
  - `public/assets/enemy-red-creature.png`
  - `public/assets/enemy-white-creature.png`

These changes should be reviewed before any push.

## Recent Enemy Graphic Work

Five 128px PNG creature images were added and loaded through `BootScene`.

Enemy image mapping:

- `light` -> `enemy_white_creature`
- `fast` -> `enemy_red_creature`
- `guard` -> `enemy_blue_creature`
- `medic` -> `enemy_green_creature`
- `boss_siege` -> `enemy_purple_creature`

`EnemyConfig` has optional `imageKey`.

`Enemy.ts` renders image enemies with sprites when `imageKey` exists. Existing robot sprite remains for the basic enemy.

## Current Open Issues

1. DOM character/equipment and lobby standee changes should be checked visually by the user.
   - Build passes.
   - Browser automation was kept short; full manual visual checking is still recommended.

2. Debug overlay should be available through settings, not always visible.
   - It currently exists and can be toggled by settings.
   - If URL has `debugCanvas=1`, it starts visible.

3. UI standardization is still incomplete.
   - DOM standard list, edge button, empty state, drag scroll, shop dialog, result screen, portrait standee, level-up selection, and fixed battle HUD now exist.
   - Moving battle visuals still use Phaser by design.
   - Remaining visual work is mostly polish, not migration.

4. Mobile visual sharpness is not fully solved.
   - `resolution` and renderer changes did not fully solve blur.
   - Brave fallback solved CPU more than sharpness.
   - Root causes may include Phaser canvas scaling, browser viewport sizing, and rendering backend.

5. Long Codex tool hangs have occurred repeatedly.
   - Some commands finish quickly but the Codex app appears stuck.
   - Avoid long browser automation.
   - Prefer small file reads, small patches, and immediate build polling.

## Recommended Next Thread Workflow

1. Read this file first.
2. Run:
   - `git status --short`
   - `npm.cmd run build`
3. Do not start with browser automation.
4. If continuing the current bug, inspect:
   - `src/scenes/HomeScene.ts`
   - `supportsGeometryMask()`
   - `updateListClip()`
   - relevant list builder methods.
5. Keep edits small.
6. Let the user do visual checks unless browser testing is explicitly needed.

## User Communication Preference

The user is technical, detail-oriented, and currently sensitive to wasted time/tokens.

Be direct:

- Say what is known.
- Say what is uncertain.
- Do not overpromise.
- Do not reinterpret a precise UI instruction into a different design.
- When a visual instruction is ambiguous, restate the exact interpretation before editing.

Avoid:

- Long generic explanations.
- “It should be fine” without evidence.
- Adding decorative UI elements not requested.
- Repeating proposals the user already gave as if they are new.
