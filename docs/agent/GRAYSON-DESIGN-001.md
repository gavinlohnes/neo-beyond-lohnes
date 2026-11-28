# GRAYSON-DESIGN-001 — Design 1: make GRAYSON look and feel professionally designed and tested

- **Authorization:** Gavin, 2026-11-27, 21:40 CT, after the look-and-layout tour
  (`/mnt/project-files/grayson/UX-TOUR.md`) and a proposal for TODAY · FUEL · LOG · TRAIN · YOU, one name and a
  night mode: **"Hang on. We can start working on it now. I don't think it necessarily needs to be done for the 1.0
  launch. The app it's self feels smart and capable. It dosent feel like a professionally designed and tested app //
  life os. I guess that's what I'm trying to say. I think we are close to have a good launch version of the work out
  and nutrition stuff."** His standing rule: **"I should be able to edit and tweak or correct everything in this
  app."** Merging this brief approves the defaults below and amends NAV-001 (slice D).
- **Not in Launch 1.0.** Design 1 is its own track after 1.0. Launch 1.0 and its Fri Dec 4 checkpoint are unchanged.
- **Builder: none yet.** Gavin picks the builder and the start. Builders take turns, one PR open at a time, so no
  slice opens while a 1.0 PR is open.
- **Lane: PROTECTED** for slices B, D and F (new palette tokens under BRAND-MARK-003, a Protected IA change to
  NAV-001). Every slice: green CI and a fresh-context reviewer's exact-head PASS posted on the PR; Gavin merges.
- **Starting commit:** latest `origin/master` after Launch 1.0. Written against `0a6ec50d`.

## Objective and benefit
GRAYSON already does a lot. What's missing is the layer that makes software feel made by one team: one set of rules
for how everything looks, moves and reads, and proof that every screen follows them. The tour and a count of the code
at `0a6ec50d` show where it comes apart:

- **Many looks.** About 80 CSS files use 62 different font sizes, 88 different hex colours and 115 different
  padding, margin and gap values. Styles come from `ui/styles/tokens.css` plus three layers on top
  (`ui/cc/skin.css` and `shell.css`, `ui/foundation/`, `ui/vision/vision.css`) and per-screen CSS. The shared
  primitives in `ui/foundation/primitives.tsx` (Panel, Meter, Sparkline, CommandBar) are used by 10 files out of
  about 200 screen files.
- **Food has no home.** Launch 1.0 is FUEL and TRAIN, but only TRAIN has a tab; food is one card inside DATA.
- **Two deep drawers.** DATA is one scroll of about 2,000 px at 360 px with eight sub-tabs (THE CAVE) inside it, and
  MORE has 29 views (`ui/screens/more/MoreScreen.tsx:172`).
- **Two names.** Buttons and the header say "Alfred"; cards say "DELTA".
- **No night mode** for 3 AM on shift.

After Design 1, every screen is built from the same tokens and components, the app has one name and a home for each
of its main jobs, and a test suite shows it: same look, AA contrast and the tap counts below, on every screen.

## Slices, in order
Each is one PR unless it says otherwise. Each keeps the same words, order, data and behaviour except where it says.

### A. Audit and baseline (tests and docs only, no screen changes)
1. An inventory of every screen and sheet, with a screenshot at 360 px, in `docs/design/AUDIT-1.md` and
   `docs/agent/screenshots/GRAYSON-DESIGN-001/before/`.
2. A consistency report per screen: font sizes, colours, spacing values and which shared components it uses, made by
   a script so it can be run again (`scripts/design-audit`).
3. Accessibility on every screen and sheet: axe at 320, 360 and 412 px, plus touch targets of at least 44 px and
   readable text at the phone's largest font size. Problems are listed, not fixed, in this slice.
4. The jobs-by-taps counts as tests, so they're measured, not guessed: log a meal, fix a meal, see today's food
   totals, start a workout, log a set, see the weight trend, ask Delta, open any MORE view.

### B. One design system (tokens and components)
5. **Tokens** in `ui/styles/tokens.css`, the one source: colour roles (background, two surfaces, two text levels,
   lines, red action, red signal, yellow accent, success and warning), a type scale of at most 7 sizes in the two
   existing fonts, a spacing scale (4, 8, 12, 16, 24, 32, 48 px), the HUD frame (cut corner, bracket, 1 px line) and
   motion (durations and easing from the Visual system motion rules, `docs/UX_DECISIONS.md:2244`, with reduced-motion
   respected). The three layers read these tokens instead of their own values.
6. **Shared components** in `ui/foundation/`: screen header, section, card, list row, stat (number and label),
   buttons (one filled red action, secondary, quiet), empty state, sheet, toast and confirm. Each with its states
   (default, pressed, disabled, loading, error) and tests.
7. **Empty states:** every list and card that can be empty says what goes there in one line and offers the one
   action that fills it, in the same component.
8. A check in CI that fails a changed file which adds a raw colour, font size or spacing value outside the tokens.
9. A short `docs/design/SYSTEM.md` with each token and component and when to use it.

### C. Every screen onto the system (one PR per tab: TODAY, TRAIN, LOG sheet, DATA, MORE)
10. Presentation only: each screen swaps its own styles for the tokens and components, with the same words, order,
    taps and data. The per-screen CSS it no longer needs is removed.

### D. Five tabs: TODAY · FUEL · LOG (+) · TRAIN · YOU
11. **FUEL is the food home.** It opens on today: calories and protein against the day's target, the FITS-NOW line,
    the protein heads-up when it shows, today's meals with fix and remove, then water. Below: saved meals, the eating
    window, the meal plan, food sources and nutrition targets. The food components move from DATA as they are.
12. **YOU holds the rest of DATA and MORE.** DATA's body cards, VIEWS and THE CAVE first; then MORE's views in five
    groups (Body and health, Work and days, Plans, Notes and memory, System), with search at the top. Exercise library
    and routines link to TRAIN.
13. **Nothing is deleted or lost.** Internal keys (`BODY`, `COMMAND`, `MoreView` values) stay, so history, back,
    pins, recents, `?go=` shortcuts and shared-file entry still land; old pins map to new labels.
14. **CLASSIC TABS** in settings puts back today's bar exactly, off by default.
15. NAV-002 in `docs/UX_DECISIONS.md` amends NAV-001's tab list; two taps by visible label still holds.

### E. One name
16. Every visible "Alfred" becomes "Delta": buttons, header, aria-labels, sheets, settings, toasts and Delta's own
    replies that name itself. Code names, events and stored data stay. A test checks no rendered screen says "Alfred".
    Delta's voice modes (Mentor, Delta, Droid) keep their names.

### F. Night mode
17. A night palette as tokens (BRAND-MARK-003), all on black. Starting values: main text `#E06666` (6.3 to 1), second
    text `#E04848` (5.2 to 1), surfaces `#0A0303` and `#120505`, frame lines `#5A1A1A`. Today's red `#D0141B` is 3.8
    to 1 on black, so it stays for filled actions and never becomes night-mode text.
18. **Automatic** by default (during a worked shift from his schedule, and from 1 hour before his usual sleep until
    he wakes), plus **On** and **Off**, one tap in the header and in settings. Gym Mode and the live workout follow it.
    The one filled red action on TODAY (FIELD-AUTHORITY-001) stays the brightest thing on screen.

### G. After pass
19. Run slice A's audit again and add `docs/design/AUDIT-1.md`'s "after" column, with screenshots in
    `.../after/`. Gavin phone-checks across one worked shift.

## Targets (before → after, checked in slice G)
| Measure | Before (`0a6ec50d`) | After |
|---|---|---|
| Font sizes in CSS | 62 | 7 or fewer, all tokens |
| Hex colours in CSS and TSX | 88 | tokens only |
| Spacing values | 115 | the 7-step scale |
| Screens on the shared components | 10 files | every screen |
| Axe serious or critical, 320 to 412 px | measured in A | 0, in both modes |
| Log a meal | 2 to 4 taps | 2 |
| See today's food totals | 1 to 2, by scrolling DATA | 1 (FUEL) |
| Open any MORE view | measured in A | 2 by label, or search |
| Start a workout, log a set, ask Delta | 1 to 2, 1, 1 | the same or fewer |
| Visible "Alfred" | 7 or more strings | 0 |

## Everything is his to change
An APPEARANCE card in settings with **RESET**: tab set (new or CLASSIC TABS), FUEL's section order and which show,
YOU's group order and pinned views, night mode Automatic, On or Off, its automatic window, and its brightness (three
steps, each passing AA).

## Design principles check
It follows the Operator Interface Doctrine: black-dominant, typography-led, sharp red direction, no gradients, glass
or card walls, WCAG AA first, FIELD stays glance, act, resume. It adds no data, no questions, no scores or streaks,
and nothing changes without his tap except automatic night mode, which he can switch off.

## Excluded
A light theme, new features on any screen, a TODAY redesign by time of day, changes to stored data, events or Dexie,
and Health Bridge.

## Stop and ask Gavin if
- A screen can't move onto the system without changing its words, order or taps.
- Any of MORE's 29 views doesn't fit one of YOU's five groups.
- A token value can't pass AA without changing the red of the filled action.
- A test would have to be deleted or weakened rather than relabelled.

## Risks
- **It touches every screen.** Slice A comes first so each later slice is measured against it, and slices C go one
  tab at a time.
- **Slice D changes where things are mid-block** if it lands during a training block. CLASSIC TABS is the fallback.
