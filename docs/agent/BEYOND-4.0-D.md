# BEYOND 4.0-d — TODAY briefing preview

**Owner authority:** After the coach card, Gavin selected work-run planning followed by the TODAY briefing preview ("Yes. 3 and 4."), parking recovery coaching and the end-of-run debrief. Work-run planning (#549) and the read-only recovery comparison (#548) are already merged. The checkpoint records "Merge 548. Start next work" and names this preview as the next approved implementation: for Gavin to try on his phone before any replacement. This brief does not authorize a merge. Builder Grok Bot, branch `codex/4d-today-preview`, from fetched master `2fc13488`. No overlapping implementation PR found (#473 remains a parked draft). Protected (decision 3: primary information architecture); full required CI and independent exact-head review; Gavin alone merges.

## This delivery

A phone-trial **preview** of TODAY as a mission briefing, composed from existing read models, without replacing the current TODAY.

- Entry is explicit: PREVIEW BRIEFING on current TODAY, below Engine guidance, never above it. Leaving TODAY closes the preview, so the current TODAY remains the default landing. Nothing is persisted as a new home screen or a hidden-feature default.
- One screen, three labeled sections — **NOW**, **NEXT**, **WHAT BEYOND HANDLED** — using existing command-center typography and tokens. A short "Preview only" line states that current TODAY is unchanged.
- **NOW** reuses the existing TODAY picture (`getTodayPicture` / life state) and, when present, the already-issued Engine recommendation (`getLatestRecommendation`) as read-only GUIDANCE. WHY lists the existing sources. The preview does not accept, decline, skip, check in, or otherwise write.
- **NEXT** reuses the existing ahead reading (next work/off switch and confirmed-change count). OPEN WEEK AHEAD uses the existing Plan Today route.
- **WHAT BEYOND HANDLED** lists only an already-known Garmin last-night sleep import, when `getMeasuredSnapshot()` has one, as something BEYOND already imported (watch-only). REVIEW SLEEP opens the existing BODY sleep surface. When there is none, the section stays honest and quiet. No new handled-event log, schema or store.
- With no lived day started, the preview does not invent a state: it says to start the day on TODAY.

## Boundaries

This is the briefing **preview** only. It does not replace TODAY, change primary navigation, or rebuild TodayScreen. Run debriefs and a year-in-review, named in the 4.0-d release sketch, are not part of this preview; end-of-run debrief and recovery coaching remain parked. See the 2026-11-15 correction in [BEYOND-4.0.md](BEYOND-4.0.md): run debriefs already exist; year-in-review is still new. This preview still includes neither. No notifications, Alfred tools, schema, migration, dependency, provider or Engine change. No silent writes. Recommendation confirmation stays on current TODAY.

## Reuse disposition

- REUSE: `getTodayPicture` (NOW/NEXT life state and ahead), `getLatestRecommendation`, `getMeasuredSnapshot` / last-night Garmin sleep already shown on TODAY, existing Plan Today and BODY sleep routes, TODAY entry and command-center styles, existing start-day path.
- OWN: the opt-in preview shell, the three-section briefing composition, and the conservative HANDLED mapping.
- BUILD FROM SCRATCH: none beyond this BEYOND mapping. No new library, Engine, or persistence.

## Open questions (conservative choices, not invented scope)

- Year-in-review and run debriefs wait for a later, separately approved 4.0-d slice; they are not in this preview.
- HANDLED is only the existing Garmin last-night import until Gavin wants a broader "what BEYOND handled" inventory (backups, saved plan notes, and similar).
- Whether the briefing should later become the default TODAY is a post-trial decision; this PR does not persist that switch.

## Verification

Read-only composition: no day, known work-run NOW/NEXT, Engine guidance under NOW, Garmin handled item, no event writes. Preview entry below guidance, BACK TO TODAY restores current TODAY, destinations open existing surfaces, failed read offers retry, 320px/axe, existing TODAY/App regressions. Architecture, TypeScript and production/PWA build; full required CI and independent exact-head review. Final results live on the PR so a documentation-only head change does not invalidate review.
