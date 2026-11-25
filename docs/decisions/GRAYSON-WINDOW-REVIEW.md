# GRAYSON-WINDOW-REVIEW — a smart eating window (owner go, 2026-11-24)

Gavin's merge of the [brief](../agent/GRAYSON-WINDOW-REVIEW-001.md)'s PR approves these; the build PR records them.
His words: "I'm trying to be healthy, lose weight but keep muscle", "adjustable and smart", "understand what I'm doing
and why", and "I should be able to edit and tweak or correct everything in this app."

- **Learn from his marks first, meals second, and say which.** A day's actual opening is his first OPENED mark in the
  24 hours centred on the plan's opening (so an after-midnight opening on a work night stays with that night), else
  the first logged meal; closing is his first CLOSED mark after it, else the last logged meal. Any meal-based part
  is labelled "From your meals; may be incomplete." A day with neither is unknown, never "missed".
- **By kind of lived day** (Work, Recovery = the first day off after work, Off), last 14 finished days, medians, with
  the day counts. Below 4 known days of a kind: "Not enough days yet (N of 4)".
- **One offer, on his tap only:** 45 minutes or more off the plan on at least 4 of the last 6 known days of a kind,
  moved to their median rounded to 15 minutes. MOVE saves through the existing settings save; KEEP hides it 14 days.
  Only the opening moves; **GRAYSON never offers a narrower window**. Thresholds live in one constants block.
- **Outcomes over hours, through Try:** CHECK HOW IT'S GOING starts a Try (`Try: Eating window 14:10`, every day,
  14 or 28 days). At the end: weight trend and pace (weeks to goal only when heading there with enough weigh-ins),
  protein days during vs before (training days separately), TRAIN's strength verdict, the Try's sleep and energy
  lines, and last, hours kept. At most two guardrail lines (protein on training days, strength while weight falls,
  lower energy). KEEP / ADJUST / PAUSE / END each close the Try in his journal; PAUSE and END turn the window off and
  keep his settings, in one atomic write.
- **WHY A WINDOW:** bundled plain words from the brief's four listed sources only, each linked, labelled "General
  information, not medical advice."
- Either block can be hidden and shown again (`beyond.windowReview.v1`, travels with backups). No TODAY change, no
  notification, no new table, event or Engine input. Patterns, not proof; never "success", a score or a streak.
