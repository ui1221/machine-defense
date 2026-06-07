# UI Design Rules

Last updated: 2026-06-04

This document is the current UI rule source for Machine Defense.

The project is now mostly DOM-based for fixed/menu UI. Phaser should remain responsible for moving gameplay objects, battle effects, bullets, enemies, enemy HP bars, and damage numbers unless there is a specific reason to change that.

## Core Screen Baseline

- The internal game size is `480 x 854`.
- Design for a vertical mobile screen first.
- Keep important controls inside the screen edge.
- Avoid one-off positional tweaks when a shared layout rule or CSS variable can express the relationship.
- Stable layout is more important than decorative novelty.
- Text must never overlap other UI or spill outside its container.

## Current UI Direction

The preferred visual language is:

- full-width dark translucent sheets and bands
- standard list rows for repeated data
- standard edge buttons for major commands
- DOM panels for menu, shop, file, stage, character, settings, result, level-up, and fixed battle HUD
- Phaser visuals for the battlefield and moving combat objects
- restrained decoration with clear purpose

Avoid:

- box-in-box UI
- arbitrary nested cards
- inconsistent border thickness
- tiny unreadable phone text
- emoji/icon glyphs that change layout size or alignment
- decorative elements that do not communicate state, hierarchy, or affordance
- cover plates used to hide broken clipping or layout

## DOM / Phaser Boundary

Use DOM for:

- home shell
- top status
- bottom navigation
- settings
- file tab
- stage tab
- shop tab
- character/equipment tab
- lobby message and non-combat standees
- result screen
- battle level-up choices
- fixed battle HUD
- fixed timed notices such as phase changes and boss arrival

Use Phaser for:

- enemies
- characters in battle
- bullets
- damage numbers
- enemy-following HP bars
- attack effects
- battlefield background and moving effects
- collision and gameplay simulation

Do not mix DOM and Phaser for the same fixed UI element unless the old element is being actively migrated.

## Shared DOM Components

Prefer existing shared helpers before creating new UI structure:

- `edgeButton` for large menu actions
- `listRow` for repeated selectable or informational rows
- `emptyState` for empty lists
- `scrollList` for scrollable DOM lists
- shared standee helpers for lobby, character, result, and future staff portraits
- DOM confirmation dialogs for shop/settings style actions

If a shared component cannot express a needed UI, extend the shared pattern or create a clearly named variant. Do not create a visually unrelated one-off.

## Typography

Phone readability is mandatory.

Recommended minimums:

- main title: `24px`
- section title: `20px`
- button title: `20px`
- ordinary body text: `16px`
- secondary text: `14px` to `15px`
- metadata: `13px` minimum

Rules:

- Do not use text below `13px` for meaningful information.
- Do not scale font size with viewport width.
- Use `letter-spacing: 0` unless a local style already requires otherwise.
- Long text must wrap, clamp, or ellipsize intentionally.
- Rows with mixed font sizes must align by row center, not by text top.

## Borders And Sheets

- Standard border thickness is `1px`.
- Selected or pressed emphasis can use `2px`.
- Avoid `3px` or thicker borders unless the user explicitly asks for a strong warning frame.
- Do not nest framed panels inside framed panels.
- Prefer one connected content sheet when several separate boxes would imply false separation.
- Standard dark content sheet background is `#06101d` at about `0.88` alpha.
- Subtle sheet dividers should be low contrast, around `rgba(138, 160, 187, 0.18)`.

## Lists

Use list rows for stages, enemies, items, equipment, buy/sell lists, and selection lists.

List rules:

- Row height should generally stay at least `64px`.
- Keep icon, title, detail, and meta columns aligned consistently.
- Put meta information on the right and align it visually with the row center.
- Do not make row height change based on selection state.
- Disabled rows should look disabled and should not receive taps.
- Selected rows may use border, background, or underline emphasis, but must not shift position.
- Prefer dense but readable lists over oversized cards.

Scrollable lists:

- Use real DOM scrolling where possible.
- Keep headers and back controls above scroll content.
- Prevent click-through from header/back controls into list rows.
- Use fade bands only when they communicate scroll boundaries; do not use opaque plates to hide layout bugs.

## Buttons

Use standard action buttons for clear commands.

Rules:

- Keep standard buttons inside the screen edge.
- Do not use left-edge accent strips on standard action buttons.
- Button height should generally be large enough for comfortable phone taps.
- Button title text should usually be around `20px`.
- Secondary text should usually be `15px` or larger.
- Pressed, selected, and disabled states must be visually distinct.
- Do not use a text button where an established icon-only control is clearer, and do not use an obscure icon without a label or obvious context.

## Top And Bottom Bars

Top status and bottom navigation are global DOM UI.

Top status:

- Holds player state such as face icon, credits, and settings.
- Avoid extra borders or nested cards.
- Keep values and icons on a shared baseline.

Bottom navigation:

- Keep tab icon and label visually connected.
- Maintain a large tap target while avoiding dead vertical space.
- Do not let labels or icons resize the navigation item.
- Selection state should be clear without moving the item.

## Portrait Standees

Lobby, character/equipment, result, and future staff portraits should use the shared DOM standee pattern.

Rules:

- The character is part of the screen composition, not a separate portrait card.
- UI may surround or overlap the portrait, but must not hide the face or destroy readability.
- Edge cropping is allowed through DOM clipping.
- Feet may sit slightly below the bottom edge when the composition calls for it.
- Shadows should be separate colored silhouette layers, not duplicated full normal portraits.
- Do not change shared standee size/position for one screen unless the shared composition itself is being revised.

Current baseline is managed through CSS variables such as:

- `--md-standee-w`
- `--md-standee-h`
- `--md-standee-top`
- `--md-standee-right`

## Result Screen

The result screen is DOM-based.

Rules:

- Treat result content as one continuous information design.
- Use one connected dark sheet from the mission title/reward area through total damage where practical.
- Do not extend that sheet behind bottom result buttons.
- Preserve text/value/icon/bar relationships when adjusting layout.
- Use named CSS variables for result layout anchors instead of one-off nudges.
- Portrait shadow color belongs to the portrait presentation, not success/failure state.

## Battle Fixed HUD

The fixed battle HUD is DOM-based.

Rules:

- EXP and barricade HP use the same bar family.
- Standard HUD bar height is `16px`.
- Bar values should remain readable outside or above the fill.
- Barricade HP may change fill color by health ratio.
- Fixed notices such as phase changes and boss arrival should be DOM-based.
- Timed notices must be readable on phone, must not overflow, and should disappear quickly.
- Barricade damage frame feedback can remain Phaser because it is a battle atmosphere effect.

## Level-Up Selection

Level-up choice UI is DOM-based.

Rules:

- Use full screen width for choices.
- Each choice should be one large tap target.
- Keep icon, name, and description inside the same button.
- Current minimum choice height is about `104px`.
- Long descriptions need enough room; do not solve text overflow by shrinking text below readable size.

## Dialogs And Settings

Confirmation and settings UI should use DOM.

Rules:

- Dialogs should follow the reduced-decoration button family.
- Do not add left-edge accent strips unless explicitly requested.
- Copy/restore save dialogs must allow text selection and safe paste/restore flows.
- Settings toggles should be clear binary controls, not hidden commands.

## Color And Visual Effects

- Use existing CSS variables and established colors before adding new ones.
- Avoid one-note palettes dominated by one hue unless the screen's existing style requires it.
- Use accent colors to communicate category, rarity, selection, warning, or damage state.
- Home atmosphere scanlines should stay subtle and should not fight text or portraits.
- Top and bottom bars may carry stronger atmosphere than the center of the screen.

## Implementation Checklist

Before finishing UI work:

- Does it use an existing DOM component or established pattern?
- Is all meaningful text at least `13px`?
- Does text fit on phone without overlap?
- Are selected, pressed, and disabled states present?
- Does the layout avoid nested cards and arbitrary borders?
- Are top/back controls above scroll content?
- Does the UI stay within the 480 x 854 design baseline?
- Did you keep browser automation short unless the user explicitly asked for visual testing?
- If the change affects a shared pattern, did you check nearby screens that use it?
