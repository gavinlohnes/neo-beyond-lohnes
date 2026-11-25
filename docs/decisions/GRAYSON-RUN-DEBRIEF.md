# GRAYSON-RUN-DEBRIEF — two-tap debrief when a work run ends (owner go, 2026-11-24)

Gavin's merge of the [brief](../agent/GRAYSON-RUN-DEBRIEF-001.md)'s PR (#647) approves these; the build PR records them.

- **Where:** inside TODAY's RUN OVER section, between the post-run report and the recovery contract, under that
  section's hiding rules. Once per run, keyed by the run's last work day (`PostRunReport.to`). No post-run report, no card.
- **Tap 1:** **How did the run go?** Rough / OK / Good (`SHIFT_FELT`). One tap writes one Decision Journal entry,
  title **Run debrief**, context **Run Nov 18 to Nov 21, 4 shifts**, decision **Run felt rough**. A new log, so it's quiet.
- **Tap 2 (optional):** **One thing for next run (optional)**, 200 characters, SAVE or DONE. SAVE puts "Next run: …" in
  the same entry's expectation.
- **Fix:** the card then reads **Run felt rough · CHANGE**. CHANGE re-picks the word or edits the line on the same entry
  (`modifyDecisionJournalEntry`), with the shared 8 s Undo (`FIX_UNDO_MS`). Adding a first line from CHANGE is a new
  log and stays quiet. A saved line can be changed but not blanked (the journal can't clear a field).
- **Skip:** NOT NOW hides it for that run (`beyond:runDebriefSkipped:<runEnd>` in localStorage; no record). The next
  run asks again.
- **No nag:** not `SHIFT_DEBRIEF_TITLE`, so follow-ups never ask about it. No score, streak, chart or alert; nothing
  feeds the Engine. Never asks about calls, patients or people at work.
