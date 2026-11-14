# VISUAL-FOUNDATION-001 — BEYOND's visual foundation (slice 1)

**Authorization:** Gavin, 2026-11-14. After the post-BODY cleanup report he approved the next mission ("I approve
of this direction. Let's continue"): a reusable BEYOND visual foundation based on the approved BODY direction,
including deliberate future use of the bat emblem and the red city skyline.

**Risk lane:** Feature, plus independent review because it sets app-wide design guidance. No Engine, schema,
dependency, command or information-architecture change.

**Builder:** Claude Code. **Starting commit:** `fc008dba`. **Branch:** `ccr-88f5c085-visual-foundation`.

## Scope of slice 1

- **Extracted, unchanged:** BODY-DASH-001's design language now lives in `src/ui/foundation/`:
  - `foundation.css`: the tokens and the shared styles;
  - `primitives.tsx`: `Panel`, `SourceTag`, `Sparkline`, `Meter` and `CommandBar`.
- **BODY uses it:** BODY moves onto the foundation with **zero visual change**.
  - Proof: `BodyDash001`'s screenshots, plus element-only screenshots of the dashboard (`*-panels.png`). These match
    master byte for byte at 320, 360, 412, 768 and 1024 px.
- **No other screen changes.** TRAIN, TODAY, MORE and the cave adopt the foundation in later slices, each with
  Gavin's go.
- **Excluded:** new colours, new components BODY doesn't already have, motion, emblem or skyline placements, and
  BODY-DASH-002.

**Leverage gate:**
- **REUSE:** BODY-DASH-001's shipped CSS and components, the HUD palette tokens (`--p-*`, `tokens.css`) and the
  existing `Emblem` and `ModeCity` components.
- **OWN:** the mapping of BEYOND's provenance rules (your logs vs Garmin's watch) onto shared classes.
- **BUILD FROM SCRATCH:** none. No design-system library: BEYOND's language is a handful of classes, and a dependency
  would add weight without fitting the HUD.

## The design language

### Ground and structure

- **Ground:** black. Panels are near-black (`--bf-s1`), told apart by 1 px lines (`--bf-line`), never by shadows or
  glow.
- **Panels:**
  - **Corners:** two opposite corners are cut (`--bf-cut`, 12 px): top-right and bottom-left. Controls (LOG) use a
    smaller 9 px cut.
  - **Red bracket:** every panel carries one at its top-left. That red is structure.
  - **Primary panels** (the one or two things a screen leads with) also get a red-tinted frame and a faint red wash
    from the top. Use at most two per screen.
- **Grid:** at most two columns inside the phone-width app. Wide panels span both. Columns follow the container's own
  width (container queries), never the window's.

### Colour roles

| Colour | Token | Means | Never |
| --- | --- | --- | --- |
| Red `#D0141B` | `--bf-red` (`--p-red`) | Structure (brackets, the command bar's edge, the "now" mark, the slashes) and the one action | A data series, a status, decoration beyond the bounded exceptions below |
| White | `--p-t1` | Your own logged values, their lines and bars | Garmin's data |
| Garmin blue `#3987e5` | `--bf-garmin` | Anything Garmin's watch measured: its tag, its numbers' captions, its sparklines (GARMIN-004) | Your own logs; actions |
| Grey | `--p-t2`, `--bf-quiet` | Source tags for your logs, units, captions | Primary numbers |
| Stage blues | `STAGE_COLORS` (MeasuredSheet) | Garmin's sleep stages only | Anything else |

- **Small text:** red is never used for small text, because it fails AA on black. The text stays white and the red
  sits beside it as a stroke.
- **New colours:** any new colour is added as a token first (BRAND-MARK-003), never hardcoded.

### Type and numerals

- **Numbers:** big, condensed, tabular numerals (`.bf-value`, Big Shoulders Display, 30 px). The lead number is
  `.bf-value--xl` (46 px). Units are small, quiet body text beside them (`<small>`).
- **Labels:** mono capitals with wide tracking (`.bf-panel__label`). They break only between words; a narrow panel
  drops its icon and tightens the tracking before a word would break.
- **Missing values:** a missing value says so in plain words (`.bf-none`: "Not logged", "Not measured"). It never shows
  a bare zero (DENSITY-001).
- **Sizes (Accessibility, amended 2026-11-14):** sentences, buttons and inputs are 16 px or larger. Only short
  mono-capital labels, source tags and chart ticks may be smaller, and never under 10 px. TRAIN (VISUAL-FOUNDATION-002)
  follows this. BODY's dashboard predates it: its captions (`.bf-meta`, 12 px), quick adds, chips and LOG are smaller,
  and bringing them up needs Gavin's go.

### Provenance on every number

- **Source tag:** every value carries a `SourceTag`:
  - **LOGGED** (grey) for your own records;
  - **GARMIN** (blue) for watch measurements, with **GARMIN · OLD** once stale.
- **Targets:** a `Meter` shows a track only against a target you set. No target, no track: BEYOND invents no goal.

### The command bar

- **Layout:** one per screen, under the app header. It shows red slashes and the screen's eyebrow (`BODY // HEALTH`),
  the context line (the lived day, the shift) and at most one action.
- **No duplicate titles:** it never repeats the app header's title.

### Motion and accessibility

- **Motion:** none beyond the app's own. Under reduced motion there are no transitions.
- **Buttons:** at least 32 px, and 44 px for a screen's main action. Focus shows a white 2 px outline.
- **Pictures:** charts are decorative (`aria-hidden`); the text beside them carries the same facts.
- **Contrast:** AA in every palette, including the dimmed "no day" palette.

## The bat emblem and the red skyline

They are identity, not signals. They never change with data, never pulse, and never animate under reduced motion.

- **Bat emblem** (`Emblem`, BRAND-MARK-003 / SUIT-ALIVE-001):
  - **Locked places:** the app header, the cave heading, the boot screen and the shift moments.
  - **Locked form:** geometry and colours are fixed: yellow plate, black bat, red inner.
  - **Never:** an oval or circle container, a character name, a catchphrase or sound.
  - **Future use:** one deliberate mark per surface, at a moment of arrival (a screen's identity, a completed
    shift). It is not a bullet, divider or button icon.
- **Red skyline** (`ModeCity`, COMMAND-CENTER-001's bounded exception):
  - **Locked places:** today it stands behind TODAY's mode header.
  - **Locked behaviour:** its crimson sky follows real lived-day time, never the pin.
  - **Future use:** as a horizon at the top edge of a screen's first view. Gavin, 2026-11-14, on the BODY
    direction: "the red from the city Scape to the top of the screen… a nice Gotham night sky." It stays dark, low and behind content, and it never
    carries data or competes with the one red action.
- **Adding a place for either:**
  - **The rule:** adding the emblem or skyline anywhere else amends a locked decision.
  - **The process:** each new placement needs Gavin's approval in the slice that proposes it, and an amendment to
    the entry above that locks it.
  - **This slice adds none.**

## How to use it

```tsx
import { CommandBar, Panel, SourceTag, Sparkline, Meter } from "../../foundation/primitives";

<section className="bf my-screen">              {/* .bf gives the tokens */}
  <CommandBar eyebrow="TRAIN // BLOCK" context={<p className="bf-bar__day">…</p>} action={{ text: "LOG", label: "Log a workout", onClick }} />
  <Panel headingId="tr-load" primary wide icon={<Dumbbell size={18} />} label="LOAD" source={<SourceTag>LOGGED</SourceTag>}>
    <p className="bf-value bf-value--xl">12<small> sets</small></p>
  </Panel>
</section>
```

- **What a screen keeps:** its own layout and its own charts. BODY keeps its grid, water bars, stage bar, quick adds
  and chips in `bodyDashboard.css`.
- **What comes from the foundation:** the shared styles.
- **Promotion rule:** a style becomes foundation only when a second screen needs it.

## Verification

- **Typecheck and checks:** typecheck, the architecture check, the node and browser suites and the build.
- **`VisualFoundation001`:** the primitives render on their own, are named, reachable and touch-sized, and pass axe.
- **Pixel proof:** `BodyDash001`'s element-only dashboard shots match master byte for byte.
- **Not used as proof:** full-page shots that include the app header and nav. Their own entry transitions vary from
  run to run on master too.
- **One exception to byte for byte:** the order of two habits created in the same millisecond could vary between runs,
  on master too. VISUAL-FOUNDATION-002 fixes it: habits with the same creation time now sort by name.

## Next slices (each needs Gavin's go)

1. TRAIN's first view on the foundation.
2. TODAY's panels on the foundation, with the skyline as the shared horizon.
3. MORE and the cave's headers on the command bar.
