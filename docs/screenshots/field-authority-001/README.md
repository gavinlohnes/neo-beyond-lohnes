# FIELD-AUTHORITY-001 — 360px FIELD evidence

Built production PWA, Chromium, America/Chicago, reduced motion, synthetic data only.
Reproduce: `npm run build && node scripts/shoot-field-authority-001.mjs`
(set `BEYOND_BROWSER_EXECUTABLE` for a different Chromium).

- `360-a-fresh.png` — state A: one red START DAY, no check-in block.
- `360-c-day-on-not-checked-in.png` — state C: log row first, "Log when you want.", one quiet CHECK IN, no red.
- `360-after-check-in.png` — state D: "Nothing needs you." with a neutral GOT IT, no red.
- `360-b-real-recommendation.png` — state B: NEXT leads with the one red; log row directly under it.
- `360-train-not-checked-in.png` / `360-train.png` — TRAIN gate as one line; START WORKOUT the only red.
- `360-command.png` — search plus eight job rows.

Physical phones, Safari and screen readers are not claimed.
