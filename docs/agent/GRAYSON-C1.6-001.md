# GRAYSON-C1.6-001 — Delta's voice: Mentor by default, Delta and Droid switchable

- **Owner authorization:** Gavin, 2026-11-20. Asked for Delta's written voice ("I want to hear Bruce Wayne or delta"),
  then: "I'd like it to either feel like Delta from Red vs Blue, Bruce Wayne talking to Terry McGinnis. Or ... HK-47
  ... That's kind of a funny idea." On the proposal of all three with a switch: "Bruce → Terry by default, with Delta
  and Droid as switchable voices." Earlier ruling kept: "worth deliberate attention".
- **Lane:** PROTECTED for this PR as a whole (it ships with the review follow-ups to C1.2/C1.3 on TODAY's composition);
  the voice itself is a copy change (the plan's Feature lane). Independent exact-head review, green CI, Gavin's merge.
- **Starting commit:** `e51671b99759e9383f0f3c523097762ad9d675ee` (master after #599). **Builder:** Claude Code,
  handed to Codex by Gavin for review follow-ups. **Branch:** `ccr-380c4225-1es42i`.
  **Active PR:** [#600](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/600).
- **Operator benefit:** Orientation's Delta line sounds like a partner in his ear, not app text, in the voice he picks.
- **Rules:** one copy library (`application/deltaVoice.ts`) holds every Delta sentence in PLAIN (the calm house voice,
  unchanged wording), MENTOR (Bruce → Terry; the on-screen default), DELTA (precise AI) and DROID ("Observation: /
  Query: / Statement:" rhythm). A voice changes words only: same facts, same Engine advice, nothing added, certainty
  never above the evidence. **Hard days drop the act:** Minimum Day, the Engine's STABILIZE and the sustained-mood
  sentence are PLAIN in every voice. The relationships are creative references (vision doc), so no names or signature
  lines are copied. The choice is a device-local preference (`voiceStore.ts`), not a record.
- **Doctrine language check (tested):** no scores, streaks, cheerleading, exclamation marks or borrowed insults in any
  voice; every line exists in every voice; character voices differ except on hard-day lines.
- **REUSE:** C1.1–C1.2's `deltaLine` decisions (unchanged logic), Orientation's DELTA panel, device-local preference
  pattern. **OWN:** the copy library and the switch. **BUILD FROM SCRATCH:** none.
- **Exclusions:** no change to what Delta decides to say, to recommendations, schema, events or the Engine; the close
  card and runway keep their plain wording; no spoken audio; no runtime rename.
- **Acceptance:** voice library tests (coverage, language, approved samples, words-only, hard-day plainness);
  existing PLAIN tests unchanged; browser test switching MENTOR → DELTA → DROID on the real screen with the choice
  kept; screenshots `docs/screenshots/grayson-c1.6/`; full suite; Gavin picks a voice on his phone.
