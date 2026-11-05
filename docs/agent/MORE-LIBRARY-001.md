# MORE-LIBRARY-001 — make BEYOND understandable without prior knowledge

## Authorization and risk

Gavin approved the researched Home + Library direction on 2026-11-04 and explicitly approved
MORE instead of COMMAND. **PROTECTED**: this changes primary information architecture and amends a
locked navigation ruling. Builder: Codex. Branch: `codex/more-ia-001`. Starting commit:
`cf0847c35fdcccf26048bf38c9a261b1303bc287`. PR: pending.

## Outcome

A person opening BEYOND cold can browse and recognize its capabilities without knowing internal
names. The fourth primary destination is visibly **MORE** and acts as the dependable complete
library: search first, then Favorites, Recent and plain-language groups with consistent icons,
descriptions and honest connection/empty states. Existing destinations and writes remain canonical.

## Scope

- Reconcile the locked COMMAND label with the already-shipped MORE presentation and preserve
  internal route keys where compatibility benefits from them.
- Give library destinations consistent recognizable icons and organize them by operator job.
- Add device-local Favorites and Recent destinations as navigation conveniences; they are never
  records, recommendation inputs or evidence.
- Preserve search, drafts, focus return, backup access, phone layout, accessibility and every
  existing destination.
- Add focused browser coverage at 360 px and desktop for browse, search, favorite/recent behavior,
  keyboard/focus, axe and overflow.

## Exclusions

No TODAY card redesign, universal `+`, calendar/day spine, Engine/schema/event/backup/provider
change, new dependency, new feature destination, automatic recommendation, or removal of a user
capability. Those are later independently reviewable slices of the approved direction.

## Acceptance evidence

- The bottom tab and root heading say MORE; no user-facing primary destination says COMMAND.
- A new user can browse every visible library destination by understandable group, icon, name and
  one-line purpose; search remains complete even when a destination is not in the browse list.
- Favorites and Recent survive reload on that device, never leave the device, and cannot trigger a
  write merely by navigation.
- Existing COMMAND/MORE navigation regressions, focused new Chromium/axe/360 px tests, TypeScript,
  risk check, production build and full verification pass.
- Independent exact-head review and green required CI precede owner merge approval.

## Leverage disposition

- **REUSE:** existing `SYSTEM_CAPABILITIES`, MORE search/destinations, BEYOND icon grammar,
  navigation focus restoration and the proven Summary/Browse + Favorites/Recents patterns
  researched from Garmin, Apple Health, Oura, Samsung Health and Notion.
- **OWN:** BEYOND's job groups, visual vocabulary, local navigation preferences and mapping to
  canonical destinations.
- **BUILD FROM SCRATCH:** none; this reorganizes and extends the existing library without a new
  navigation framework or dependency.
