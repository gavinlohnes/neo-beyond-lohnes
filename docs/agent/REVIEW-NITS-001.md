# REVIEW-NITS-001 — the small notes from #362's review

- **Authority:** Gavin, 2026-11-01: "4 is a go". **Lane:** Routine. Stacked on LIFE-HUB-001 (#362).
- **Dates show the year when it isn't this year** on Alfred's cards ("Tue, Jan 5, 2027").
- **LIFE tabs follow the WAI-ARIA tabs pattern:** one Tab stop; arrows, Home and End move between tabs.
- **No shared ids between copies of a screen.** Plans/Intent, Routines, Projects and Alfred's memory list
  use `useId` prefixes, so a copy in LIFE and one in MORE never point a label at the hidden one.
- **One disclosure style:** TODAY's routine row uses BEYOND's existing `.disclosure-row` caret (motion
  tokens, global reduced-motion), and the separate `.beyond-disclosure` CSS is removed.

REUSE: `.disclosure-row`, React `useId`, the WAI-ARIA tabs pattern. OWN: none. BUILD FROM SCRATCH: none.
