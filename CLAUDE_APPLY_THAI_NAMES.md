# Claude Code Task — Apply Thai Naming Pass v1

Use `SPEC.md` section 17 and `THAI_NAMING_CATALOG.md` as the source of truth.

## Goal

Replace player-visible Thai names for all cards, equipment, horses, armor and general skills with the approved Naming Pass v1.

This is a localization/data migration only. Do not change game mechanics.

## Mandatory constraints

- Do not rename `cardId`, `typeKey`, `skillId`, `generalId`, trigger names, event names or socket events.
- Do not change deck composition, suit, rank, card count, range, targeting, effects, HP or skill behavior.
- Do not move rule validation to the Client.
- Do not hard-code Thai names inside Engine rules.
- Use the localization/data layer.
- Keep Chinese reference names only in documentation/data fields if already present.
- Do not invent additional names. Report missing entries instead.

## Process

1. Inspect the repository and list every file containing player-visible card, equipment or skill names.
2. Identify the current localization/data architecture.
3. Load `thai-naming-map.json`.
4. Map existing stable IDs to the new Thai names.
5. Add or normalize `name`, `summary`, and where applicable `description`.
6. Update all UI surfaces:
   - hand cards
   - card previews
   - draw/discard/latest-card areas
   - equipment slots
   - player detail
   - General selection
   - skill descriptions
   - game history
   - death/result dialogs
7. Keep Engine events and logs ID-based. Resolve localized names at presentation boundaries.
8. Search the repository for every old name and classify remaining matches.
9. Update only text/snapshot tests that assert display copy.
10. Run tests, typecheck and lint.

## Acceptance criteria

- All 15 card names match the catalog.
- All 17 equipment names match the catalog.
- All 40 skill names match the catalog.
- No internal ID changes.
- No behavior changes.
- All relevant tests pass.
- The application works when artwork is missing.
- The response includes:
  - Root cause/current architecture
  - Files changed
  - Old-to-new coverage
  - Remaining old-name matches and why they remain
  - Tests run and results
  - Regression risks
  - Git diff summary

## Stop conditions

Stop and ask instead of guessing when:

- A repository name cannot be mapped to a catalog item.
- One stable ID is used for multiple distinct mechanics.
- Thai strings are embedded in artwork or generated server-side in an unexpected way.
- Applying a name would require changing a game rule.
