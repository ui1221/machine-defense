# Current State Handoff

Last updated: 2026-06-04

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

Use `docs/ui-design-rules.md` as the source of truth for UI rules. It was rewritten on 2026-06-04 after the old file became mojibake, and now reflects the current DOM-heavy UI direction.

Current preferred style:

- Full-width translucent dark sheets/bands instead of small framed boxes.
- Standard edge buttons for major actions.
- Standard list rows for item/enemy/stage/selectable lists.
- Strong alignment rules: center rows visually, keep labels/numbers on defined baselines.
- For selection panels, prioritize both tap comfort and list density.
- Header/back controls must stay above scroll content to avoid click-through.

## Recent Technical Context

### June 2026 Battle / Progression Work

Recent work after the older 2026-05-28 handoff includes:

- Battle balance iteration for late stages, especially stages 25-30.
- A new barricade-pressure enemy role (`latcher`) was added and inserted into later-stage pressure patterns.
- Enemy barricade attacks now support per-enemy first attack delay, cooldown, and jitter.
- Barricade damage can be fractional; the battle HUD rounds displayed HP up to avoid long decimal strings.
- Boss durability and control resistance were increased.
- Boss escort composition was adjusted so slow escorts are replaced with faster vanguard-style enemies near boss timing.
- Late-stage HP pressure now changes by phase:
  - Mid phase from 160s.
  - Late phase from 240s.
  - Boss phase from around 25s before boss spawn onward.
- Victory no longer freezes instantly on the last enemy kill; result transition is delayed while the scene continues briefly.
- Settings now include optional 4x speed and auto level-up.
- Bullet collision uses swept segment checks so higher speed is less likely to tunnel through enemies.
- The app tries to keep the game awake on preview blur by default; `sleepOnBlur` can opt out.

### Battle HUD / Phase UI

The fixed battle HUD is DOM-based.

Recent additions:

- Phase transition notices are DOM-based (`BattleHudScreen.ts`), not Phaser text.
- Boss arrival notices are also DOM-based.
- The red full-screen frame effect is now reserved for barricade damage feedback, not phase indication.
- The phase/boss notice should stay readable on phone:
  - fixed DOM layout
  - no text overflow
  - larger type than the first pass
  - short timed display

### Save / Testing Helpers

Recent settings and save utility work:

- Settings include toggles for:
  - 4x speed
  - auto level-up
- The settings menu has save copy/restore helpers for preserving localStorage state during preview/dev work.

### Weapon Enhancement

Weapon enhancement has been implemented in the first pass.

The spec and implementation notes are in:

- `docs/weapon-enhancement-design.md`

Implemented behavior:

- Weapon enhancement is implemented first; cores, sensors, and modules are later.
- Display enhancement at the end of the name, e.g. `Ion Rifle +3`.
- `GameSave.junkParts` is a new currency.
- Selling equipment grants existing credits plus a small amount of junk parts.
- Rarity affects enhancement cap, not per-level value:
  - `N`: +3
  - `R`: +5
  - `SR`: +7
  - `SSR`: +10
- Each enhancement level increases the weapon bonus portion by 10%.
- Enhancement logic is centralized in `src/systems/EquipmentEnhancement.ts`.
- The top status displays both credits and junk parts.
- The shop upgrade screen marks equipped weapons with `E` in the level subtitle, e.g. `E +2/+5`.

### Asset-Waiting Notes

These are mostly user-side art production tasks, not immediate implementation tasks. Do not rush placeholder-heavy systems unless the user explicitly asks for them.

Known remaining asset needs:

- shop staff portrait
- portraits for all units
- face icons for all units
- assault expression variants
- battle ally graphics for all units
- additional enemy graphics

Future implementation idea once face icons exist:

- replace compact equipment-owner text/marks such as `E` with unit face icons where useful
- show who owns an equipped item in equipment-change and enhancement lists without taking much row space

### Documentation Encoding Concern

Some project files display as mojibake in shell output. This is not always the same issue:

- Some PowerShell output can be misleading because of console encoding.
- The old `docs/ui-design-rules.md` content appeared to contain substantial mojibake in the file itself.
- `docs/ui-design-rules.md` was rewritten on 2026-06-04 and should be treated as current again.
- Other legacy docs may still contain mojibake; check `docs/README.md` before relying on them.

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

At the time this handoff was originally written, `git status --short` showed older enemy graphic work.

As of 2026-06-04, current uncommitted work also includes later battle balance, DOM battle HUD notices, settings helpers, docs cleanup, and first-pass weapon enhancement. A recent `git status --short` showed:

- Modified:
  - `docs/current-state.md`
  - `docs/ui-design-rules.md`
  - `src/data/enemies.ts`
  - `src/data/stages.ts`
  - `src/main.ts`
  - `src/objects/Bullet.ts`
  - `src/objects/Enemy.ts`
  - `src/scenes/BattleScene.ts`
  - `src/scenes/BattleUIScene.ts`
  - `src/scenes/HomeScene.ts`
  - `src/systems/SaveData.ts`
  - `src/types/index.ts`
  - `src/ui/dom/BattleHudScreen.ts`
  - `src/ui/dom/CharacterScreen.ts`
  - `src/ui/dom/FileScreen.ts`
  - `src/ui/dom/HomeShell.ts`
  - `src/ui/dom/ShopScreen.ts`
  - `src/ui/dom/styles.css`
- New docs:
  - `docs/README.md`
  - `docs/legacy/plan.md`
  - `docs/legacy/enemy-variation-plan.md`
  - `docs/weapon-enhancement-design.md`
- New code:
  - `src/systems/EquipmentEnhancement.ts`
- Moved to legacy:
  - `plan.md`
  - `enemy-variation-plan.md`

These changes should be reviewed before any push.

Latest verification:

- `npm.cmd run build` passed after the first-pass weapon enhancement implementation and the equipped-item `E` marker change.
- In-app browser automation could not be verified from Codex because the Node browser bridge repeatedly exited with `windows sandbox failed: spawn setup refresh`.

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

1. `docs/stage-balance-design.md` should be restored or rewritten if it becomes important again.
   - It still contains substantial mojibake.
   - Current stage tuning should rely on code, recent playtest notes, and this file first.

2. DOM character/equipment and lobby standee changes should be checked visually by the user when touched.
   - Browser automation should stay short; full manual visual checking is often better for this project.

3. Debug overlay should be available through settings, not always visible.
   - It currently exists and can be toggled by settings.
   - If URL has `debugCanvas=1`, it starts visible.

4. UI standardization is still incomplete.
   - DOM standard list, edge button, empty state, drag scroll, shop dialog, result screen, portrait standee, level-up selection, and fixed battle HUD now exist.
   - Moving battle visuals still use Phaser by design.
   - Remaining visual work is mostly polish, not migration.

5. Mobile visual sharpness is not fully solved.
   - `resolution` and renderer changes did not fully solve blur.
   - Brave fallback solved CPU more than sharpness.
   - Root causes may include Phaser canvas scaling, browser viewport sizing, and rendering backend.

6. Long Codex tool hangs have occurred repeatedly.
   - Some commands finish quickly but the Codex app appears stuck.
   - Avoid long browser automation.
   - Prefer small file reads, small patches, and immediate build polling.

7. Battle balance is still in active iteration.
   - Stage 30 around boss appearance is currently close to the desired challenge for character levels around 20.
   - Enemy count, barricade DPS, stun/beam/blade behavior, and late-phase pressure still need careful incremental tuning.
   - Avoid large balance rewrites without user confirmation.

## Recommended Next Thread Workflow

1. Read this file first.
2. Read `docs/README.md` if you need to know which docs are current, legacy, or unreliable.
3. If changing weapon enhancement, read `docs/weapon-enhancement-design.md`.
4. Run:
   - `git status --short`
   - `npm.cmd run build`
5. Do not start with browser automation.
6. If continuing a UI task, inspect existing DOM implementation before editing.
7. If continuing the older Canvas/list bug, inspect:
   - `src/scenes/HomeScene.ts`
   - `supportsGeometryMask()`
   - `updateListClip()`
   - relevant list builder methods.
8. Keep edits small.
9. Let the user do visual checks unless browser testing is explicitly needed.

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
- "It should be fine" without evidence.
- Adding decorative UI elements not requested.
- Repeating proposals the user already gave as if they are new.
- Implementing brainstormed ideas before the user clearly asks for implementation.
