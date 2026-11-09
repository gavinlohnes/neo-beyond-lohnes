# DATA-HOME-001 — DATA opens like YOUR LIFE and MORE

- **Authorization:** Gavin, 2026-11-09, directly to the Builder: **"Next is data. Make it fall in line with our new
  screens."** **Lane: Protected** (DATA's primary information architecture), approved. Builder: Claude Code.
- **What:** above DATA's existing content there is now a guided top:
  - The date, a big **YOUR NUMBERS.**, and two actions: **Log weight** (the existing LOG WEIGHT handler) and **Sleep**
    (opens the existing sleep page).
  - One-tap shortcuts: Weight, Training records, Photos, Measurements, Whole picture, Your rotation and History.
    Each calls the handler DATA's own buttons already use.
- **Kept, unchanged:** the cave tabs, TODAY's numbers, Progress, More progress, History, and every route and button.
  Nothing is removed.
- **Rules:** the same visual language as MORE-HOME-001 (`systemsHome.css`), the 16 px floor, and it fits 360 px.
  It writes nothing.

**Leverage gate.**
- **REUSE:** MORE-HOME-001's hero and shortcut styles, and DATA's existing handlers.
- **OWN:** the composition.
- **BUILD FROM SCRATCH:** none.

**Evidence.**
- `tests/browser/DataHome.test.tsx`: the hero, the shortcuts, a shortcut opening Whole picture, the 16 px floor,
  fitting 360 px, and nothing written.
- All 45 DATA-related browser files pass locally (502 tests).
