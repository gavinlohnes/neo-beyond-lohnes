# GRAYSON-ONE-MEMORY — one place Delta remembers (owner go, 2026-11-25)

Gavin's go ("Both are good to go", 2026-11-25) on the [brief](../agent/GRAYSON-ONE-MEMORY-001.md), plus his merge of
the implementing PR, approve these.

- **Where it came from:** new `MEMORY_RECORDED` payloads carry an optional `via` (`DELTA`, `HOME`, `PEOPLE`, `MEMORY`,
  `GUIDED`, `OLD_ENTRY`), set by the command that saved the fact and copied forward on every revision. Facts saved
  before this show "Saved in BEYOND" and a date, never a guessed source.
- **One list:** MORE · Memory is the only memory list. The separate old-entry list and the Delta sheet's own list are
  gone; the sheet's **Memory** link opens MORE · Memory, and a saved "remember" card reads "Remembered." with **OPEN**.
- **Old entries are reviewed by his tap:** KEEP (as written), FIX (his words), DON'T KEEP (converted and stopped in one
  write, restorable from Stopped, never deleted). FIX and DON'T KEEP can be undone. KEEP THE REST AS WRITTEN appears
  only once he has reached the end of the list, skips entries over 280 characters, and asks once.
- **Nothing changes before he taps:** unreviewed entries keep reaching Delta exactly as before. A kept entry keeps the
  date he first said it, so Delta reads the same topic, words and date after a keep-all review.
- **Evidence stays:** the old table is kept; no row is deleted; no Dexie version changes.
- **Long entries:** an entry over 280 characters can't be kept as written; FIX never cuts it for him. DON'T KEEP on one
  stores a shortened stopped fact (279 characters and "…"); the full words stay in the fact's origin and the old table.
- **Compatibility:** backups made by this build carry `via`; a build older than this one rejects those memory events
  (strict schema), the same "new exports need this build or newer" rule personal facts already have.
