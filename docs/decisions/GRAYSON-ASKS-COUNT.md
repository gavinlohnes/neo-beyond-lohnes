# GRAYSON-ASKS-COUNT — count the questions GRAYSON asks, by area (owner go, 2026-11-24)

Gavin's merge of the [brief](../agent/GRAYSON-ASKS-COUNT-001.md) approves these.

- **Counted when shown, not answered:** an ask he ignores still cost him attention.
- **Once per key per lived day:** a re-render or a reload isn't a second question. Lived days run 16:30 to 16:30,
  so a 06:10 ask belongs to the night before.
- **In the monthly review, as "Delta's monthly page":** there's no separate Delta monthly page yet, and the monthly
  review is where four-week numbers already live. The panel sits under BODY COMPOSITION, so it never pushes that
  down.
- **No total and no colours:** a single number would read as a score, which the Vision rules out. Each area shows the
  last 4 weeks against the 4 before, in words ("10 fewer"), plus the three keys asked most.
- **A Dexie table, not a preference:** counts are records that should survive a reinstall through the backup.
  `askCounts` is Dexie v28. It's additive, rides in the native backup, and is pruned after 400 days. An older backup
  restores with none.
- **Never an input:** only the panel reads `askCounts`. Not the Engine, recommendations, Delta, the morning read or
  any nudge.
- **His to change:** counting on or off, clearing (with a confirm and UNDO for 10 seconds), and hiding the panel. All
  three are stored in `beyond.askCounts.settings.v1` and travel with his settings.
