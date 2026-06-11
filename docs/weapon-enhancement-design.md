# Weapon Enhancement Design

Last updated: 2026-06-04

Status: implemented in the first pass.

## Scope

- Implement enhancement for weapons first.
- Do not enhance cores, sensors, or modules in the first pass.
- Enhancement should be a long-term equipment growth system, not a large immediate combat power spike.

## Display

- Show enhancement value at the end of the equipment name.
- Example: `Ion Rifle +3`
- Do not prefix the name with the enhancement value.

## Save Data

- Store enhancement level on `OwnedWeapon`.
- Existing owned weapons should default to enhancement level `0`.
- Junk parts should be stored as a new save currency.

## Enhancement Limits

Rarity changes the maximum enhancement level, not the per-level enhancement value.

| Rarity | Max |
| --- | ---: |
| N | +3 |
| R | +5 |
| SR | +7 |
| SSR | +10 |

## Enhancement Cost

Cost is paid in junk parts. The number is the cost for the next enhancement level.

| Target Level | Cost |
| --- | ---: |
| +1 | 1 |
| +2 | 2 |
| +3 | 4 |
| +4 | 7 |
| +5 | 10 |
| +6 | 13 |
| +7 | 16 |
| +8 | 19 |
| +9 | 22 |
| +10 | 26 |

Total cost by rarity cap:

| Rarity | Total To Cap |
| --- | ---: |
| N | 7 |
| R | 24 |
| SR | 53 |
| SSR | 120 |

## Junk Parts

- Junk parts are obtained through selling equipment.
- Do not add a separate dismantle action in the first pass.
- Selling equipment should grant both the existing credit reward and junk parts.

| Rarity | Junk Parts From Sale |
| --- | ---: |
| N | 1 |
| R | 2 |
| SR | 3 |
| SSR | 5 |

## Enhancement Effect

- Enhancement value per level should be shared across all rarities.
- Rarity differentiation should come from the enhancement cap.
- Initial proposed effect: each enhancement level increases the weapon bonus portion by 10%.
- Apply the effect to the weapon's bonus portion, not as a flat multiplier to final character power.

Example:

- A weapon with `atkMult: 1.40` has a bonus portion of `0.40`.
- At `+3`, the bonus portion becomes `0.40 * 1.3 = 0.52`.
- The enhanced attack multiplier becomes `1.52`.

## Implementation Notes

- Keep cost and cap tables centralized so later balance changes are easy.
- Keep name formatting centralized so all inventory, equipment, shop, and result UI use the same display.
- Keep effect description formatting centralized so displayed values follow the current enhancement level.
- Existing sale behavior should remain recognizable; junk parts are an additional reward, not a replacement for credits.

## First Implementation Notes

- Enhancement logic is centralized in `src/systems/EquipmentEnhancement.ts`.
- `OwnedWeapon.level` is used as the enhancement level.
- `GameSave.junkParts` stores the new currency and defaults to `0` for old saves.
- The shop upgrade screen only lists equipment whose slot is `weapon`.
- Enhancement effects apply only to the bonus portion of weapon-slot equipment.
- Equipment effect descriptions are generated from stat fields and current enhancement level instead of using fixed master-data description strings.
- Core, sensor, and module levels are not upgraded in the first pass.
- Selling equipment grants credits plus rarity-based junk parts.
- Selling upgraded weapons does not refund spent enhancement cost.
