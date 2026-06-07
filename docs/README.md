# Documentation Index

Last updated: 2026-06-04

This directory is the working memory for future development sessions.

## Read First

1. `docs/current-state.md`
   - Primary handoff document.
   - Use this first when resuming work.
   - Contains current implementation state, known risks, workflow preferences, and links to more specific docs.

2. `AGENTS.md`
   - Root-level agent guide.
   - Keep it at the repository root because tools automatically discover it there.
   - Use it for architecture, code ownership, and common implementation paths.

3. `README.md`
   - Root-level human-facing overview.
   - Keep it at the repository root.

## Current Planning Docs

- `docs/weapon-enhancement-design.md`
  - Spec and implementation notes for the first-pass weapon enhancement system.
  - Implemented in the first pass.
  - Read before changing equipment save data, shop selling, or weapon stat calculation.

- `docs/dom-ui-migration-plan.md`
  - Mostly historical, but still useful for DOM/Phaser responsibility boundaries.
  - The migration is largely complete.
  - Its phase list is historical; use `docs/current-state.md` for current status.

- `docs/ui-design-rules.md`
  - Current UI rule source of truth.
  - Rewritten on 2026-06-04 after the old file became mojibake.
  - Reflects the current DOM-heavy UI architecture.

## Use With Caution

- `docs/stage-balance-design.md`
  - Contains stage balance ideas, but much of the text is mojibake and parts are older than the current stage 25-30 balance work.
  - Use current code and `docs/current-state.md` first.

## Legacy / Archived Notes

- `docs/legacy/plan.md`
- `docs/legacy/enemy-variation-plan.md`

These were originally root-level planning notes. They are archived because:

- They are not good entry points for current work.
- They contain substantial mojibake.
- Their content appears older than the current implementation and later balance discussions.

Do not rely on them for implementation decisions unless they are manually restored and revalidated.

## Maintenance Rule

When a feature plan becomes concrete enough to implement, either:

- add a focused doc under `docs/`, or
- update `docs/current-state.md` with a short link and status.

Do not leave new planning docs at the repository root unless they are meant to be root-level entry documents like `README.md` or `AGENTS.md`.
