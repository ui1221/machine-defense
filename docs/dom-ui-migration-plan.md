# DOM UI Migration Plan

Last updated: 2026-05-28

This project is moving non-combat UI from Phaser-drawn objects to HTML/CSS overlay UI.

## Core Direction

- Keep Phaser responsible for gameplay visuals, battle field objects, effects, and backgrounds.
- Move non-combat standees to shared DOM standee components when they appear in menu/result style screens.
- Move menu/list-heavy UI to DOM: file, stage, shop, character/equipment, settings, and result UI.
- Do not migrate everything at once.
- Do not mix Phaser UI and DOM UI for the same screen.
- Use small phases, verify each phase, and keep rollback practical.

## Phase Order

1. DOM overlay foundation.
2. File tab DOM migration.
3. Stage tab DOM migration.
4. Shop DOM migration.
5. Character/equipment DOM migration.
6. Home shell/top/bottom/settings DOM migration.
7. Result DOM migration.
8. Battle UI review last.

## Current Phase

Phases 1-7 are implemented:

- `#ui-root` is aligned to the Phaser canvas.
- DOM screens mount/unmount explicitly from Phaser scenes.
- File tab is DOM-based: menu first, then Items/Enemies lists.
- Stage tab is DOM-based and starts battle through the existing scene transition.
- Shop tab is DOM-based for menu, buy, sell, research, and confirmation dialogs.
- Character/equipment tab is DOM-based for character selector, detail stats, upgrade, equipment slots, equipment selection, and unequip.
- Lobby and character-tab portrait standees use a shared DOM standee component with a separate colored shadow layer.
- The unit tab portrait layout is the baseline for future character/shop-staff composition: UI surrounds the portrait, the face remains readable, and edge cropping is allowed through DOM clipping.
- Lobby message window is DOM-based and mounted with the lobby standee screen.
- Result screen is DOM-based for title, reward content, damage content, buttons, and shared portrait standee.
- Battle level-up selection is DOM-based with full-width large choice buttons.
- Fixed battle HUD is DOM-based for EXP, barricade HP, level/time, pause, and speed.
- Shared DOM components exist for edge buttons, list rows, empty states, scroll lists, and portrait standees.
- DOM standard action buttons are now in-screen rectangles without left-edge accent strips.

## Remaining DOM Migration Tasks

Major Phaser-to-DOM UI migration is complete.

- Home shell, top status, bottom navigation, settings, lobby message, stage, file, shop, character/equipment, result, level-up selection, and fixed battle HUD are DOM-based.
- The top-left face icon is still a temporary crop from `home-portrait.png`; replace it with a dedicated face asset when available.
- Future shop staff portraits should use the unit-tab portrait composition rule.
- Enemy-following UI such as enemy HP bars, damage numbers, bullets, attacks, and effects should stay Phaser unless there is a specific reason to synchronize DOM every frame.

## Safety Rules

- No long browser automation.
- One screen per implementation slice.
- Read `docs/ui-design-rules.md` before changing UI.
- Keep full-screen lists and panel lists as separate patterns.
- Do not use opaque/transparent cover plates to hide broken list rendering.
- Prefer CSS scrolling, sticky headers, and normal DOM layout for lists.
- Keep standard action buttons inside the screen edge; do not rely on off-screen overflow as decoration.
- Do not add left-edge accent strips to standard action buttons or DOM confirm dialogs unless the user explicitly requests that decoration.
- BattleScene is out of scope until all base UI phases are stable.
