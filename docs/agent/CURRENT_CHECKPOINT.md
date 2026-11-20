# Current objective — C4.2a DELTA-suggested, editable caffeine cut-off (2026-11-20)

- **Owner authorization:** Gavin, 2026-11-20 04:40 UTC: "Start it", answering the proposed first build of DELTA
  suggestions (editable cut-off from today's 6 h with where it comes from; DELTA offers a better value from his
  nights; changes only on his tap; undo). Protected: amends locked SHIFT-SLEEP-PLAN-001, adds a stored setting,
  widens what DELTA may propose. Builder Claude Code; branch `claude/project-thread-iopp5i`; starting commit
  `a857f28`; [PR #595](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/595). Plan item C4.2a (tracker row added on his go).
- **Operator benefit:** the cut-off is his number, not a hidden constant, and DELTA can point to his own short
  post-shift sleeps and offer a longer gap he approves or undoes.
- **REUSE:** TARGET-PROPOSAL-001's propose/SAVE/KEEP/UNDO shape; BRIDGE-NOTIFY-001's settings-on-the-schedule-row
  storage (native backup, no schema change); SLEEP-RHYTHM-001's work-day nights. **OWN:** the suggestion rule and
  copy. **BUILD FROM SCRATCH:** none.
- **Exclusions:** no other plan numbers, no automatic change, no score, no caffeine log, no per-drink lines (C4.2),
  no notification, Engine, provider or dependency change.
- **Verification (local):** node suite 2,540 passed; typecheck; architecture; production build. The new browser
  test (`tests/browser/CaffeineCutoff.test.tsx`) could not run here (no Chromium in this container); CI runs it.
  No phone check yet.
- **Next:** green CI and independent exact-head review, then Gavin's merge. After a real night, KEEP / REFINE /
  RETHINK.

---

# Historical — GRAYSON-CAMPAIGN-PLAN-001 (merged as PR #593)

- **Shared plan:** [`docs/GRAYSON_CAMPAIGN_PLAN.md`](../GRAYSON_CAMPAIGN_PLAN.md) is the campaign plan
  toward Project Grayson and its **progress tracker** is the one record of what is done, in progress
  and left. Every Builder names the plan item ID in its PR and updates that row in the same PR.
- **Owner authorization:** Gavin asked for a structured campaign plan (2026-11-20) and for every agent
  to see what is done and what is left. Protected (governance pointers in `AGENTS.md` and this file);
  waits on independent exact-head review and Gavin's merge. Builder Claude Code; branch
  `claude/project-thread-4rj0y9`; [PR #593](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/593).
  Starting commit `211ccf4`.
- **In flight:** Q1 / C3.4 dog care and CO presets ([PR #594](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/594));
  Q3 workouts on the metric page ([PR #584](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/584),
  conflicts on this file). Everything else in the tracker is not started.
- **Exclusions:** no product code, Engine, schema, dependency or concurrent-PR change. The plan
  authorizes no item.
- **Next:** Gavin picks the next item; first big objective proposed is C1.1 Orientation slice 1.

---

# Historical — GRAYSON-RESEARCH-SYNTHESIS-001 (merged as PR #591)

- **Owner authorization:** report only; compare commercial/open-source donor patterns against current
  BEYOND repository truth and canonical scenarios under the Project Grayson baseline and Evolution
  Rule; classify dispositions and licensing/reuse; reconcile PR #589 without modifying it; recommend
  a ranked sequence and one next objective. Brief:
  [`GRAYSON-RESEARCH-SYNTHESIS-001.md`](GRAYSON-RESEARCH-SYNTHESIS-001.md). Starting commit
  `ac858def37523b06b06556b22d9f817b56a36210`; Builder Codex; branch
  `codex/grayson-research-synthesis`; [PR #591](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/591).
- **Finding:** BEYOND already contains most of the suit. Donors mostly improve composition, timing,
  evidence hierarchy, and interaction; they do not justify importing parallel planners, trackers,
  notes stores, home ERPs, or agent platforms.
- **Recommendation:** [`LIVED-DAY-ORIENT-PRODUCTION-001`](../GRAYSON_RESEARCH_SYNTHESIS.md#recommended-next-objective)
  — one bounded Protected implementation of Quiet Command Orientation using existing BEYOND truth,
  actions, visual foundation, and canonical recommendation authority. It is not authorized by this
  report.
- **PR #589:** unchanged. Preserve it as reviewed responsive/state evidence, not production code or
  final visual truth. Its merge/close remains Gavin's separate decision.
- **Concurrent work:** PR #589, PR #584, and draft PR #473 remain separate and untouched.
- **Exclusions:** no implementation, redesign, rename, replacement, product-authority, Engine/
  recommendation, schema/event, provider/dependency, product code, prototype, Google Drive, merge, or
  concurrent-PR change.
- **Verification:** current master/open PRs and representative code/tests inspected; first-party donor
  sources and official repositories used; local Markdown links and diff hygiene pass; risk classifier
  reports the expected Protected governance triggers. Required CI and independent exact-head review
  remain pending.
- **Next:** obtain independent exact-head review and green required CI, then return to Gavin for merge
  approval.

---

# Historical — GRAYSON-EVOLUTION-RULE-001 (merged as PR #590, `ac858def`)

- **Owner authorization:** Protected documentation only; record the GRAYSON Evolution Rule in the
  canonical Project Grayson and product-governance sources, reconcile it with doctrine, Product
  Direction, the Decision Register and builder guidance, open a reviewed PR, and make no product-code,
  runtime, architecture, or Google Drive change. Brief:
  [`GRAYSON-EVOLUTION-RULE-001.md`](GRAYSON-EVOLUTION-RULE-001.md). Starting commit
  `29bc9efad66ff2a86836eb84394ea9be7e073f4c`; Builder Codex; branch
  `codex/grayson-evolution-rule`; [PR #590](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/590).
- **Ruling:** BEYOND is the functioning foundation of GRAYSON; no proposal begins from a blank canvas.
  Establish repository truth and preservation first. External products and open source are research
  donors, not replacement templates. Replacement requires evidence, preservation/migration planning,
  and every applicable owner approval.
- **Reconciliation:** preserve the existing permission to challenge historical choices and propose
  substantial evidence-backed redesign. The rule requires explicit continuity and places the burden
  of proof on replacement; it does not freeze the current interface.
- **Concurrent work:** PR #589 remains the isolated phone-first Orientation prototype; PR #584 remains
  owned by its Builder; draft PR #473 remains separate. This objective changes none of them.
- **Exclusions:** no product code, runtime behavior, UI, identity, navigation, architecture, Engine,
  recommendation, schema/event, provider, dependency, data, test fixture, Google Drive, implementation
  objective, redesign approval, replacement decision, merge, or concurrent-PR change.
- **Verification:** exact-head independent review passed at `fbeb36f7`; required CI was green; risk
  classifier reported the expected Protected governance lane; canonical documentation targets and
  diff hygiene passed.
- **Next at closure:** apply the rule to the approved donor-research synthesis rather than restart from
  a blank canvas.

---

# Historical — LIVED-DAY-ORIENT-REFINE-001 (merged as PR #588, `29bc9efa`)

- **Owner authorization:** Protected documentation/design only; record the reviewed Orientation and
  Delta decisions, open a reviewed PR, and do not implement. Brief:
  [`LIVED-DAY-ORIENT-REFINE-001.md`](LIVED-DAY-ORIENT-REFINE-001.md). Starting commit
  `87d35bca687934d32e31409ddd257ff93d811e39` (merged PR #587); Builder Codex; branch
  `codex/lived-day-orient-refinement`; [PR #588](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/588).
- **Approved refinements:** START DAY opens Orientation; check-in never gates it; hierarchy is
  Situation → You → Delta → one recommendation → at most two supporting actions → Release; Delta uses
  evidence-bounded adaptive analytical command; days off are purpose-first; difficult-day response
  distinguishes one check-in, a sustained pattern, and Gavin's explicit statement.
- **Protected boundary surfaced:** the destination primary recommendation exceeds the merged design's
  presentation-only selection rule. This objective records that decision but does not implement or
  silently redefine Engine/recommendation priority. A future bounded decision must adjudicate it.
- **Concurrent work:** PR #584 remains owned by its Builder; draft PR #473 remains separate.
- **Exclusions:** no code, prototype, production UI, TODAY, Engine/priority, schema/event, provider,
  dependency, AI call, navigation, rename, crisis workflow, Google Drive, or concurrent-PR change.
- **Verification:** PR #588 merged after local Markdown links and diff hygiene passed, required CI was
  green, and independent exact-head review passed.
- **Next at closure:** a phone-first prototype remained a separate proposal and is now open as PR #589.

---

# Historical — LIVED-DAY-ORIENT-001 design (merged as PR #587, `87d35bca`)

- **Owner authorization:** documentation/design only before implementation. Brief:
  [`LIVED-DAY-ORIENT-001.md`](LIVED-DAY-ORIENT-001.md). Starting commit
  `b00fa77687d15b7557b04e3e0326aa511fe0906c` (merged PR #586); Builder Codex; branch
  `codex/lived-day-orient-design`; [PR #587](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/587).
- **Outcome:** research-backed experience contract, workday/day-off/recovery/unknown/sparse variants,
  phone text wireframes, information/attention rules, Engine/Delta boundaries, reuse map, failure and
  accessibility behavior, acceptance scenarios, and a proposed Protected build authorization.
- **Core decision:** explicit START DAY anchors Orientation; an already-started day gets one optional
  invitation. Orientation reads and routes—it does not create another plan or recommendation. It works
  offline without an automatic AI call.
- **Research disposition:** adapt personal-baseline explanation from Oura/WHOOP without a readiness
  score; adapt Sunsama's visible review without automatic plan movement; keep subjective check-in
  explicit and low-burden; treat shift fatigue as context without medical or fitness-for-duty claims.
- **Concurrent work:** PR #584 remains owned by its Builder; draft PR #473 remains separate.
- **Exclusions:** no implementation, production UI, rename, schema/event, Engine/priority, notification,
  provider/dependency, autonomy, navigation, global redesign, evening/Shift Down, Google Drive, or
  concurrent-PR change.
- **Verification:** PR #587 merged at exact head `3cac9c2e` after green required CI and independent
  exact-head PASS.
- **Next at closure:** Gavin chose to review protected experience decisions before any prototype or
  implementation authorization.

---

# Historical — PROJECT-GRAYSON-BASELINE-001 (merged as PR #586, `b00fa776`)

- **Owner authorization:** report-only evaluation against the Project Grayson Vision Blueprint.
  Brief: [`PROJECT-GRAYSON-BASELINE-001.md`](PROJECT-GRAYSON-BASELINE-001.md). Starting commit
  `5f9a9a12d8a363a75eb4bcb364c02dc119d69204` (merged PR #585); Builder Codex; branch
  `codex/project-grayson-baseline`; [PR #586](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/586).
- **Outcome:** current-product baseline, scenario assessment, Preserve/Adapt/Connect/Deepen/Replace
  carefully/Retire/Defer map, navigation assessment, and one first-objective recommendation.
- **Concurrent work:** PR #584 remains owned by its Builder; draft PR #473 remains separate. Neither
  is changed or taken over.
- **Finding:** BEYOND already contains most of the suit. The primary gap is orchestration around lived
  transitions, not missing domain breadth or insufficient AI autonomy.
- **Recommendation:** [`LIVED-DAY-ORIENT-001`](../PROJECT_GRAYSON_BASELINE.md#recommended-first-objective)
  — a Protected, optional, evidence-grounded opening orientation that composes existing sleep,
  schedule, check-in, guidance, commitments, preparation, training, and capture. It is not authorized
  by this report.
- **Exclusions:** no implementation, redesign, rename, deletion, Google Drive, product-authority, or
  queue change.
- **Next:** validate report links/diff, open a documentation PR, and return to Gavin for assessment and
  a separate decision on the recommended objective.

---

# Historical — PROJECT-GRAYSON-VISION-001 (merged as PR #585, `5f9a9a12`)

- **Owner authorization:** Gavin approved the exact Protected, documentation-only objective. Brief:
  [`PROJECT-GRAYSON-VISION-001.md`](PROJECT-GRAYSON-VISION-001.md). Starting commit
  `c54c0001cb346af7d358f7d039f087b467bf78fd` (merged PR #583); Builder Codex; branch
  `codex/project-grayson-vision`; [PR #585](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/585).
- **Outcome:** establish the canonical Project Grayson destination, reconcile product authority,
  preserve and classify existing capabilities, and provide one provider-neutral handoff for Claude,
  Claude Duet Steward, Codex, and future qualified builders.
- **Identity:** BEYOND is what was built; Project Grayson is what it is becoming; GRAYSON is the Life
  OS; Delta is the companion intelligence inside it. Current runtime remains BEYOND + Alfred until a
  separately approved implementation.
- **Concurrent work checked:** PR #584 (finished workouts on the shared metric page) remains owned by
  its Builder; draft PR #473 remains separate. This objective changes documentation only.
- **Exclusions:** no product/UI/code/runtime rename, Engine/schema/provider/dependency/automation,
  Google Drive change, or first implementation objective.
- **Next:** complete documentation checks; open a PR; obtain independent exact-head review and green
  required CI; Gavin decides merge. After merge, propose a separate report-only current-product
  baseline against the blueprint's canonical scenarios.

---

# Historical — DRAFT-RECOMMENDATION-001 (merged as PR #583, `c54c0001`)

- **Authorization:** Gavin explicitly approved the bounded pre-check-in draft and, after the original reviewed head became conflicting, authorized its reconciliation onto current master. [Brief](DRAFT-RECOMMENDATION-001.md).
- **Builder:** Codex. **Lane:** PROTECTED (Engine/TODAY). [PR #583](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/583), branch `codex/draft-recommendation-001`, reconciled onto master `af2fa8e3` after OUTCOME-LOOP-001 merged as #582.
- Provisional, read-only starting point from existing recorded post-shift or personal two-short-main-sleeps evidence. Capacity remains unknown. Opening the existing check-in writes nothing; submitting it uses unchanged canonical evaluation. No new storage, provider, command or dependency.
- **Verification:** the original product head passed focused UTC/Chicago Node tests, browser draft/sleep/accessibility/Attention regressions, full CI and independent exact-head review; its actual screenshot was inspected. The master reconciliation changed only this checkpoint conflict, but the new head still requires green CI and renewed independent exact-head review. Do not infer physical-phone verification from Chromium widths.
- **Shipped:** QUALITY-STANDARD-001 #581, OUTCOME-LOOP-001 #582 and HARVEST-003 #579. The earlier OUTCOME-LOOP checkpoint below is historical.
- **Remaining / next:** verify the reconciled head, obtain renewed independent exact-head review, then Gavin merges. After merge, inspect the draft on the actual phone before an eligible check-in and give a brief keep / refine / rethink verdict.

---

# Historical checkpoint (superseded live status)

# Current objective — QUALITY-STANDARD-001 (2026-11-19)

- **Authorization:** Gavin approved making TONIGHT'S ENERGY-level product quality the operating standard: “Make it happen in the best way you can”, following the five-dimension proposal.
- **Builder:** Codex. **Lane:** PROTECTED (product direction and workflow governance).
- **Starting master:** `4b1f499095f01af7197b1a421eaab3ae588fe665`; branch `codex/quality-standard-001`. [PR #581 — QUALITY-STANDARD-001: make product quality part of acceptance and review](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/581). This checkpoint and the PR serve as the concise brief; no separate handbook.
- **Scope:** existing Product Direction defines the standard; DEV-FLOW-002 defines proportional acceptance evidence and independent Feature/Protected product-quality review; AGENTS routes all builders there.
- **Exclusions:** no app code, architecture, doctrine/locked behavior, CI/protection settings, merge delegation or new feature authorization changes. Routine work remains lightweight; device checks cannot be claimed from simulated widths.
- **REUSE:** existing direction, workflow charter, entry-point and brief/PR handoff. **OWN:** BEYOND's five quality dimensions and experience-review expectations. **BUILD FROM SCRATCH:** none.
- **Acceptance:** inspect links/authority consistency and diff hygiene; independent exact-head review and required CI. Final results live in the PR to preserve the reviewed head. Governance remains Protected; owner merge approval is required.
- **Recovered truth:** TONIGHT'S ENERGY merged as #580 at `4b1f4990`, after exact-head independent PASS and green full CI on `58c079a7`, with Gavin's explicit merge instruction. The earlier checkpoint below is historical.
- **Next product objective:** the approved pre-check-in recommendation draft, not yet implemented. The local `codex/draft-recommendation-001` branch has no commits beyond its starting master. Quality work takes priority for this owner instruction.

---

# Historical checkpoint (superseded live status)

# Current objective — ENERGY-CURVE-001 recovery (2026-11-19)

- Builder takeover: Codex, Gavin “Pick up where Claude left off”. Continue existing `claude/energy-curve-001`, PR #580; no competing branch.
- Protected TODAY panel, approved in [brief](ENERGY-CURVE-001.md). Gavin merges after independent exact-head review and green CI. No merge performed.
- Recovered head `de11361e`: implementation and focused tests pushed by Claude. Full CI exposed two accessibility failures: the new standalone panel used h3 directly after the page h1.
- Repair: foundation Panel accepts an optional h2 heading (h3 remains the default); Tonight’s Energy uses h2. Existing full-page accessibility assertions remain intact; focused test checks the actual h2.
- Independent review blocked on DST endpoints and disappearing assumed sleep. Both repaired using existing rollover math and lived-day-anchored assumptions, with actual records replacing assumptions. Added query regressions; 11 focused tests pass in UTC and Chicago. Renew exact-head review.
- Local verification and final CI/review results are recorded in the PR handoff. Do not treat the inherited brief’s checks as evidence for the repaired head.
- Fresh master `4acbc605` includes weekly metric comparisons (#577) and fiber/sodium (#578). Prior checkpoint statuses below are historical. The earlier mock draft is no longer open; no duplicate metric work is needed.
- Remaining: independently review the whole energy panel, resolve findings, obtain green exact-head CI, then Gavin’s protected merge. Research PR #579 remains separate; old shift-what-if draft remains parked.

---

# Historical checkpoint (superseded live status)

# Current objective — night 2026-11-18/19: one look, then Gavin's approved list

- Builder Claude Code. Gavin's mission "NIGHT 2026-11-18" (#565 merge, METRIC-PAGE-002 slices 2–3), then "1A"
  (finish the one look), then "1 through 5 are approved" (roadmap Queue).
- **Merged:**
  - #565 HABIT-QUOTA-001 `6212db1` and #567 protein page `1f6e3d8`, both merged at Gavin's "Merge both".
  - Under his merge permission: #569 GYM-FOUNDATION-001 `ffd2166` (PASS on `432e129`, green), #570
    TODAY-SPLIT-002 brief `cd998ab` (docs, green), and #571 SHEETS-FOUNDATION-001 `b26c309` (renewed PASS on
    `2b963c6`, green).
- **Governance:** that permission conflicts with DEV-FLOW-002's "no self-merge", and Gavin chose to amend the charter.
  The amendment, #574, is Protected and his to merge. Builder merges are paused until it lands.
- **Open:** #572 ONE-LOOK-002 and #573 EXPORT-001, both waiting for review and CI. #568 is this roadmap/checkpoint PR.
- **Stopped, waiting for Gavin:**
  - NUTRIENTS-001 is Protected: new stored fields.
  - TODAY-SPLIT-002 slice 2: TOOLS reads 141 pieces of TODAY state.
  - METRIC-CHANGE-001: mock first.
- METRIC-PAGE-002 slice 3 (finished workouts) stays with #567's builder.
- **Reviewer sessions:** "Independent review: #569" and "Independent review: #571", reused per PR.
- **Phone checks owed:** the live workout and gym mode; the LOG, CHECK IN, ALFRED and SLEEP sheets; HABIT-QUOTA and
  the protein page.

---

# Historical — METRIC-PAGE-002 slice 2 (protein on the shared metric page; merged as #567, `1f6e3d8`)

- Builder Claude Code, same Drop and authorization as slice 1 ([brief](METRIC-PAGE-002.md)). Slice 1 merged as #566
  (`17d0e15`). Branch `claude/metric-page-002-protein` from that master. Lane FEATURE, read side only.
- PROTEIN joins the metric page: your logs in white, TODAY's running total, 7D/30D/1Y bars with gaps as gaps, BEYOND's
  existing target as a target only, FOOD-SOURCES-001's sources. TODAY's PROTEIN tile opens it; records and logging keep
  their routes. BODY's combined NUTRITION card is unchanged.
- Gates as slice 1: Node suite under UTC and America/Chicago, architecture, typecheck, build locally; browser suite in
  PR CI (it can't run in the builder's sandbox). Next: workouts (slice 3).
- Night 2026-11-18 (PD mission): independent exact-head review of `3aabc73` PASS, five non-blocking notes (PR
  comment). Gavin: "Merge both". #565 merged first as `6212db1`; `origin/master` merged in normally (this checkpoint was
  the only conflict; HABIT-QUOTA-001 is history). No code changed in the merge. Slice 3 stays with this builder.

---

# Historical — HABIT-QUOTA-001 ("N times a week" habits; merged as #565, `6212db1`)

- Builder Claude Code. Gavin, 2026-11-18 ("Approved." to the recommended objective). [Brief](HABIT-QUOTA-001.md).
  Branch `ccr-ca6fc619-gqnj7f` from fetched master `6a359d01` (#564 merged).
- Lane PROTECTED (a new value in the backed-up `Habit.schedule`). No Dexie version, migration, event, Engine, Alfred,
  notification, provider or dependency change; `HABIT_SET` answers untouched.
- A habit can be "Times a week" (1 to 6, Monday-to-Sunday lived-day weeks). It is due until the week's target is met,
  then leaves BODY's today list; the Habits card reads "1 of 3 this week" and "Done for this week". Only Done counts.
- Gates: focused tests under UTC and America/Chicago; local `TZ=UTC npm run verify`; PR CI on the exact head;
  **independent exact-head review REQUIRED**; Gavin merges. Exact head, checks run and CI are in the PR handoff.
- Next after merge: on the phone, add "Lift · 3 times a week" in MORE → LIFE → Habits, mark it Done three days, and
  check it leaves BODY's chips on day four and comes back on Monday's lived day (after 16:30).
- Night 2026-11-18 (PD mission): `origin/master` `17d0e15` (#566 METRIC-PAGE-002 slice 1) merged in normally; this
  checkpoint was the only conflict (all sections kept; slice 1 is history). No code changed in the merge. Review PASS
  was on `efbab988`; renewed exact-head review needed on the merge head.
- Renewed check: the head's diff over `efbab988`, outside this checkpoint, was only the master merge. Gavin: "Merge
  both"; merged as `6212db1` (2026-11-19).

---

# Historical — METRIC-PAGE-002 slice 1 (weight on the shared metric page; merged as #566, `17d0e15`)

- Builder Claude Code. Gavin, 2026-11-18: "2" (one look), "Let's work", "Will you give it to Claude code to do".
  [Brief](METRIC-PAGE-002.md). Branch `claude/metric-page-002-weight` from master `6a359d0` (#564 merged).
- Lane FEATURE. Read side only: no Engine, schema, command, persistence, provider or dependency change.
- WEIGHT joins the metric page: LATEST (newest weigh-in plus BODY's weight trend whole), 30D and 1Y as dots on a fitted
  axis, gaps as gaps, a tenth of a pound kept. TODAY's WEIGHT tile and BODY's WEIGHT card open it; records and logging
  stay on weight's existing routes.
- Gates: Node suite under UTC and America/Chicago, architecture, typecheck, build locally. The browser suite (new
  `MetricPage002.test.tsx`) could not run in the builder's sandbox (no browser download); PR CI runs it. Under
  America/Chicago, `tests/integration/habits.test.ts` "shows only weekly and four-week counts" fails on master too at the
  same clock time; not this slice.
- Next: independent exact-head review; Gavin merges. Then slice 2 (protein), slice 3 (workouts); TODAY-SPLIT-002 only
  after this Drop's TODAY-tile slices merge.

---

# Historical — CAPTURE-PARITY-002 (an open capture is listed once in TODAY TOOLS; merged as #564, `6a359d01`)

- Builder Grok Bot. Gavin, 2026-11-18 (owner session, option 2): next highest-value remaining item, preferring the
  ranked list's capture-to-task parity. [Brief](CAPTURE-PARITY-002.md). Branch `codex/capture-parity-002` from fetched
  master `4088b65e` (#561 merged).
- Lane FEATURE (check:risk says PROTECTED only for the brief/checkpoint governance paths). UI composition only: no
  Engine, schema, command, persistence, provider, notification or dependency change.
- MORE → TODAY TOOLS listed every open capture in Attention and in the TOOLS Capture card, so → TASK opened two task
  forms. Now each capture shows once (Attention on a work day; TOOLS on a day off, where Attention only points to the
  sweep). TODAY and the focused COMMAND views are unchanged.
- Gates: focused tests under UTC and America/Chicago; local `TZ=UTC npm run verify`; PR CI on the exact head;
  independent exact-head review; Gavin merges. Exact head, checks run and CI are in the PR handoff.
- Next after merge: phone check in MORE → TODAY TOOLS with two open notes on a work day (each listed once, one form).

---

# Historical — ALFRED-MULTI-001 (several actions in one message; merged as #561, `4088b65e`)

- Builder Grok Bot. Wave 2 of the overnight plan Gavin approved 2026-11-15. [Brief](ALFRED-MULTI-001.md). Branch
  `codex/alfred-multi-001` from `origin/codex/alfred-act-001` `365d2a45`, first stacked on #560. PR [#561](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/561).
- Lane PROTECTED. No Engine, schema, dependency, alert or low-risk-definition change.
- One message → one card per part, in order; ALFRED-ACT-001's rule picks which run at once, each with its own UNDO;
  at most 5 at once per message (more → none at once, he's told); a card that didn't save says why; no double writes.
- Owner session 2026-11-16 ("Next"): #560 merged as `8084b1be` and #559 as `3eece4ac`. The final #560 head `44ab6d83`
  (its review fixes) was merged in normally, then `origin/master` `3eece4ac`; the PR base was retargeted from
  `codex/alfred-act-001` to master. Conflicts: `act()` in AlfredSheet (kept the 5-at-once plan and held-card notes, and
  #560's rule that a failing haptic or refresh after writes never turns saved entries back into SAVE cards), the reminder
  alert line next to the held-card note on cards, the alfredAct comment (#560's saved-meals wording), and this checkpoint
  (all sections kept; the ones below are history).
- Gates: focused tests under UTC and America/Chicago; local `TZ=UTC npm run verify`; PR CI on the exact head;
  **independent exact-head review REQUIRED, not yet done** (never reviewed); Gavin merges. Exact head, checks run and CI
  are in the PR handoff.
- Owner session 2026-11-17 ("561 needs fixed now"): the PR was conflicting after #563 YEAR-REVIEW-001 merged as
  `ba6436f3`; `origin/master` `ba6436f3` merged in normally (this checkpoint was the only conflict; all sections kept,
  theirs are history). No review findings were posted on `138efe77`; no app code changed in this merge.

---

# Historical — YEAR-REVIEW-001 (your year in BEYOND, built on the month recap; merged as #563, `ba6436f3`)

- Builder Grok Bot. Gavin, 2026-11-15, approved sprint plan Wave 3 ("year-in-review built on the monthRecap cards");
  resumed on his return for Claude's review. [Brief](YEAR-REVIEW-001.md). Branch `codex/year-review-001` from fetched
  master `b921d303`.
- Lane: classify-risk suggests PROTECTED (the brief is on a governance path); semantically a feature. Pure rollup of the month recap's own counting helpers across a calendar year plus a tap-to-open block
  on MONTH. Months under 7 logged days are named and left out; "N of 12 months counted" shown. No Engine, schema,
  alert, dependency, navigation or TODAY change.
- Gates: local `TZ=UTC npm run verify` green (557 files, 4122 tests); PR CI; independent exact-head review (Claude);
  Gavin merges.
- CAPTURE-PARITY-001 [#557](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/557) merged by Gavin as `b921d303`;
  its section below is history.
- `origin/master` `3eece4ac` (#558, #559, #560, #562) merged in normally (this checkpoint was the only conflict; all
  sections kept, theirs are history). Renewed independent exact-head review needed after this merge; Gavin merges.
- #561 ALFRED-MULTI-001 (now targeting master) was a separate open PR awaiting its own review; not part of this objective.
  Exact head, checks run and CI for this PR are in the PR handoff.

---

# Historical — EXP-STATS-001 (honest statistics for personal experiments; merged as #559, `3eece4ac`)

- Builder Grok Bot. Gavin, 2026-11-15, approved the overnight plan whose Wave 3 includes "honest statistics for
  experiments". [Brief](EXP-STATS-001.md). Branch `codex/exp-stats-001` from fetched master `abd9dc71` (#555 merged);
  PR [#559](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/559). Fast-forwarded onto `44a1c5b0` after #556
  merged; `origin/master` `b921d303` (#557) merged in normally (checkpoint conflict only).
- The existing LOOP TRY comparison now reports a Welch 95% range on the difference of means, with day counts, and says
  "can't tell yet" when that range crosses zero and still reaches a meaningful gap, or "not enough data yet" when a side
  is thin, instead of declaring a winner. Pure application-layer functions; minimal wording in the existing result
  view. No Engine, schema, alert-kind or dependency change.
- Lane FEATURE (classifier says PROTECTED only for governance-path docs; semantically a readout change). The
  independent review of `d11166bb` applied the PROTECTED bar and was PASS (no blockers).
- Owner session 2026-11-16 ("Finish the next one"): `origin/master` `8084b1be` (#558 FOLLOWUPS-001, #562 REMIND-AT-001,
  #560 ALFRED-ACT-001) merged in normally (this checkpoint was the only conflict; all sections kept, theirs are history).
  Review non-blocking note 1 fixed (intro wording now matches the rule); note 2 left as is (wrapping already guaranteed;
  the review said no change needed). See the brief's review response.
- Gates: focused tests under UTC and America/Chicago; local `TZ=UTC npm run verify`; PR CI on the exact head;
  **renewed independent exact-head review REQUIRED, not yet done** (the PASS review is stale); Gavin merges. Exact head,
  checks run and CI are in the PR handoff. #561 waits (stacked on the merged #560 branch); #563 and #473 are separate.
- Merged by Gavin as `3eece4ac` (2026-11-16 05:42 CT).

---

# Historical — ALFRED-ACT-001 (low-risk logging runs immediately with UNDO; merged as #560)

- Builder Grok Bot. Gavin, 2026-11-15, 04:26 CT: "Yes, low-risk logging runs immediately with undo"; started as wave 2
  of the overnight plan he approved. [Brief](ALFRED-ACT-001.md). Branch `codex/alfred-act-001` from fetched master
  `4d74ac26`, rebased onto `44a1c5b0` (#555 and #556 merged) before the first push. PR [#560](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/560).
- Lane PROTECTED (consequential AI autonomy; Doctrine and BEYOND-4.0 decision 2 amended in their own text; Decision
  Register entry marked built). No schema, Engine, dependency, provider or notification change.
- Immediate with 10 s UNDO: water, a saved meal (never Alfred's estimate), protein,
  weight (within 10 lb of the last), habit done, a set in the workout in progress; only when clear (no time, ordinary
  amount, whole message understood, not repeated). Everything else keeps its confirm card, including `add_reminder`
  (with or without a REMIND-AT `remindAt` time).
- Independent review of `365d2a45` was PASS (no blockers). Since then `origin/master` was merged in normally: `b921d303`
  (#557) as `3a49f926`, then `17f6bc8e` (#558 FOLLOWUPS-001, #562 REMIND-AT-001; owner session 2026-11-16). Conflicts:
  this checkpoint (all sections kept) and the `add_reminder` registry entry (kept `autonomy: "confirm"` and master's
  HH:MM `remindAt` description). Review non-blocking notes 1 (meal comment) and 3 (post-write refresh failure) fixed;
  note 2 (set UNDO is last-set only) stays as documented in the brief. Those sections below are history.
- Gates: local `TZ=UTC npm run verify`; PR CI on the exact head; **renewed independent exact-head review REQUIRED, not
  yet done** (the PASS review is stale); Gavin merges. #561 (multi-action) stays stacked on this branch and waits.
  Exact head, checks run and CI are in the PR handoff.
- Merged by Gavin as `8084b1be` (2026-11-16 04:32 CT). #561 (multi-action) was stacked on its branch.

---

# Historical — REMIND-AT-001 (reminders at a set time, inside the 3-a-day cap; merged as #562)

- Builder Grok Bot. Gavin, 2026-11-15 17:49 CT, approved the overnight sprint plan (Wave 3: "REMIND-AT-001 (reminders at
  a set time, inside the 3-a-day cap)"). [Brief](REMIND-AT-001.md). PR [#562](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/562). Branch `codex/remind-at-001` from fetched master
  `b921d303` (#557 merged).
- A task may carry an optional `remindAt` (HH:MM on its due date); its alert fires then as the existing `TASK_DUE` kind,
  under the same switch, quiet hours, priority and 3-a-day cap. Where the time is set (Missions & Obligations create and
  edit, Alfred's `add_reminder` card) one line says whether it will alert, or "Won't alert:" and why. No Dexie version,
  Engine, alert-kind, Bridge, permission or dependency change.
- Lane PROTECTED (check:risk: domain types; semantically a backed-up field and notification timing). Gates: focused tests
  under UTC and America/Chicago; local `TZ=UTC npm run verify`; PR CI; independent exact-head review (Claude, per owner 2026-11-15); owner merges.
- CAPTURE-PARITY-001 [#557](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/557) merged by Gavin as `b921d303`,
  then FOLLOWUPS-001 [#558](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/558) as `e84751fe`; `origin/master`
  `e84751fe` merged into this branch normally (checkpoint conflict only, all sections kept). Their sections below are history.
- Merge and audit (2026-11-16): no behaviour defect; `add_reminder` example `"9:30"` → `"09:30"` plus coverage tests
  (next lived day's cap from 16:30; backups without `remindAt`). See the brief's last section. Exact head, checks run and
  CI are in the PR handoff. Remaining gates: green CI on that head; **independent exact-head review REQUIRED, not yet
  done**; Gavin merges.
- Merged by Gavin as `17f6bc8e` (2026-11-16).

---

# Historical — FOLLOWUPS-001 (review follow-ups: BRIDGE-NOTIFY-001 N1/N2/N4; sleep-debt nap-only days; merged as #558)

- Builder Grok Bot. Gavin approved the overnight plan on 2026-11-15 (wave 2, item 6). [Brief](FOLLOWUPS-001.md). Branch
  `codex/followups-001` from fetched master `4d74ac26`; `origin/master` `abd9dc71` (#555 merged) merged in normally.
- Fixes #554 review notes N1 (no duplicate after upgrading from 0.11.0), N2 (an alarm delivered 2 hours or more late is
  dropped) and N4 (a failed alert-settings save is not re-applied by a queued change). Health Bridge 0.11.2.
- Fixes the #555 review note on nap-only days: only days with main sleep logged are judged against the main-sleep
  target; a nap-only day is "not counted", like the baseline.
- Lane PROTECTED (inherited). No new alert kind, Engine, schema, permission or dependency change.
- Independent review of `3bfe893c` was PASS with no blockers. `origin/master` `b921d303` was then merged in normally
  as `a0c9b742` (docs only), so that exact-head review is stale. Non-blocking notes 1 (README wording) and 3
  (operatorContext nap-only clause) are fixed on this head; note 2 is left documented (needs Android SDK). See the
  brief's review response.
- Local checks on this head: `TZ=UTC` typecheck, check:architecture, and build; sleepDebt + operatorContext +
  WorkScheduleScreen tests under UTC and America/Chicago; Moments.kt + MomentsTest.kt (kotlinc, JDK 17, JUnit 4.13.2)
  10/10. Full `TZ=UTC npm run verify` was not re-run (optional; last run at `3bfe893c`).
- Remaining gates: green required CI including android on this exact head; **renewed independent exact-head review
  REQUIRED, not yet done**; Gavin merges. The author does not self-review.
- WORK-RUN-REDRAFT-001 [#556](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/556) merged by Gavin as `44a1c5b0`
  (2026-11-15 18:42 CT) and CAPTURE-PARITY-001 [#557](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/557) merged
  by Gavin as `b921d303` (2026-11-15 18:57 CT); `origin/master` `b921d303` merged into this branch normally (docs
  conflict only, all sections kept). Their sections below are history.
- Merged by Gavin as `e84751fe`.

---

# Historical — CAPTURE-PARITY-001 (capture → task works the same everywhere; merged as #557)

- Builder Grok Bot. Gavin, 2026-11-15, approved the ranked item "Make turning a capture into a task work the same
  everywhere" (HARVEST-002's best new refinement). [Brief](CAPTURE-PARITY-001.md). Branch `codex/capture-parity-001`
  from fetched master `4d74ac26`.
- Lane FEATURE: one shared confirm-first form (title, optional planned day, optional due date) for quick capture, Notes
  Sweep and the Capture list, through the existing `convertCaptureToObligation`. No schema, Engine, event or
  notification-kind change.
- Gates: local `TZ=UTC npm run verify`; PR CI; normal review; Gavin merges.
- SLEEP-DEBT-LEARNED-001 [#555](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/555) merged by Gavin as
  `abd9dc71` (2026-11-15 18:06 CT) and WORK-RUN-REDRAFT-001 [#556](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/556)
  merged by Gavin as `44a1c5b0` (2026-11-15 18:42 CT); `origin/master` `44a1c5b0` merged into this branch normally
  (docs conflict only, all sections kept). Their sections are history. #473 stays a parked draft.
- Merged by Gavin as `b921d303` (2026-11-15 18:57 CT).

---

# Historical — WORK-RUN-REDRAFT-001 (offer a fresh work-run draft when something changes; merged as #556, `44a1c5b0`)

- Builder Grok Bot. Gavin, 2026-11-15, approved ranked item 4 ("Go ahead"). [Brief](WORK-RUN-REDRAFT-001.md). Branch
  `codex/work-run-redraft-001` from fetched master `4d74ac26` (#554 merged).
- Plan Today → Week planner offers DRAFT FRESH RUN PLAN when the latest saved work-run note no longer matches a covered
  date's work context (a confirmed extra shift included, also on the days off before its first day) or guidance first
  judged two short sleeps after it. Existing replace warning and confirm-once save; NOT NOW until the change changes.
  No Engine, schema or notification change.
- Lane PROTECTED (check:risk: governance docs; reads issued Engine guidance). PR
  [#556](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/556) merged by Gavin as `44a1c5b0` (2026-11-15 18:42 CT).
  Independent review of `8d4f7434` had blocked two trigger defects (days off before the note's first day not compared;
  short-sleep re-offer after NOT NOW / a fresh save); those were fixed before merge.

---

# Historical — SLEEP-DEBT-LEARNED-001 (sleep owed against your own learned sleep; merged as #555)

- Builder Grok Bot. Gavin, 2026-11-15, chose ranked item 2: recalculate sleep owed against the existing personal
  baseline instead of 7 h; work days vs days off where the baseline supports it; "still learning" with day counts;
  Engine unchanged (readout only). [Brief](SLEEP-DEBT-LEARNED-001.md). Branch `codex/sleep-debt-learned-001` from
  fetched master `4d74ac26`; PR [#555](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/555), merged by Gavin as `abd9dc71` (2026-11-15 18:06 CT).
- BRIDGE-NOTIFY-001 [#554](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/554) merged by Gavin as `4d74ac26`
  (2026-11-15 16:16 CT); its section below is history. The 0.11.1 Health Bridge phone check is Gavin's.
- Each logged night is judged against the low end of its kind's usual main-sleep range (`projectPersonalBaselines`);
  no figure while still learning (no 7 h fallback); MONTH, the energy forecast, the recovery-sleep offer (threshold
  unchanged at 1 h) and Alfred's context follow it. The Engine never reads it; `src/engine/**` untouched. The month
  grid's short-night underline stays on the 7 h guideline (labelled).
- Lane PROTECTED (classifier: governance docs; semantically it also changes Alfred's sleep context and the recovery
  offer).

---

# Historical — BRIDGE-NOTIFY-001 (notification contract; merged as #554)

- Builder Grok Bot. Gavin, 2026-11-15, chose ranked item 1: 3-a-day cap, per-kind switches, quiet hours, day-off /
  plan-to-confirm where they fit existing kinds, the plan through the background sync; no new kinds, no Engine change.
  [Brief](BRIDGE-NOTIFY-001.md). Branch `codex/bridge-notify-001` from fetched master `527332ef` (#552 merged there).
- Lane PROTECTED (persisted settings on the backed-up schedule row; notifications). No schema version, Engine,
  permission or dependency change. Health Bridge 0.11.1 rolls a four-week plan forward; it needs a device check.
- PR [#554](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/554). The independent review of `088c9609` blocked it
  (late inexact alarm lost on re-arm; conflict with #553). Fixed on the same branch (Gavin, 2026-11-15: "Go ahead and
  fix it"): `origin/master` `2e68feaf` merged in with a normal merge (no force-push); the Bridge re-arm keeps unshown
  moments within a 2 h grace; same-time moments are two alerts; docs and settings copy corrected; quick taps keep every
  change. See the brief's review responses. Needs a renewed independent exact-head review.
- Gates: local `TZ=UTC npm run verify`; PR CI; independent exact-head review (Claude, per owner 2026-11-15); owner merges. Plan-to-confirm moments and
  a true BEYOND-to-Bridge background hand-off are deferred (see brief).
- No other open work: ALFRED-TOOLS-001 [#552](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/552) merged as
  `527332ef` (2026-11-15 05:45 CT) and SHIFT-CORRECT-001 [#553](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/553)
  merged as `2e68feaf` (2026-11-15 15:04 CT), both by Gavin. The ALFRED section below is kept as history.

---

# Historical — ALFRED-TOOLS-001, then SHIFT-CORRECT-001 (Alfred follows commands; both merged)

- Builder Grok Bot. Gavin, 2026-11-15 04:26 CT, after his "Im still working till 0600. Fix my log" screenshot: "Start
  with missions 1 and 2 (tool registry + shift correction)"; "Yes, amend WORK TRANSITION to allow explicit shift
  start/end corrections"; "Yes, low-risk logging runs immediately with undo" (recorded as ALFRED-ACT-001; not built).
- Mission 1: branch `codex/alfred-tools-001` from fetched master `1c74307a`. [Brief](ALFRED-TOOLS-001.md). One typed
  registry for every card kind; new confirm-first tools for existing commands; Alfred names what he can't do. Protected
  (AI write proposals): independent exact-head review, green CI, Gavin merges. No schema, Engine or dependency change.
- Mission 2: SHIFT-CORRECT-001, stacked on mission 1 (it adds a registry card). [Brief](SHIFT-CORRECT-001.md).
- Checkpoint PR #551 (4.0-d merged) merged as `58bd0c65`; its text below is unchanged.
- Gates: local `TZ=UTC npm run verify` green on each branch head before push; PRs [#552](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/552) and [#553](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/553) opened (both since merged; Gavin approved
  push, 2026-11-15 05:33 CT). Final exact-head evidence belongs on each PR. Gavin alone merges.

---

# Current state — 4.0-d preview merged; phone trial next

- TODAY briefing preview [#550](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/550) merged by Gavin as `1c74307a` (head `4c156131`). The preview is opt-in on current TODAY; current TODAY remains the default landing.
- Next: Gavin tries the preview on his phone. Whether the briefing replaces TODAY is a separate Protected decision (decision 3) after the trial; nothing is authorized to replace TODAY yet.
- Still parked: recovery coaching, end-of-run debrief, run debriefs and year-in-review. Per the master-brief correction, remaining 4.0 work is mostly upgrades to existing features. No implementation PR is active or authorized; the next objective waits for Gavin's choice.

---

# Historical — 4.0-d: TODAY briefing preview (merged as #550)

- Builder Grok Bot; branch `codex/4d-today-preview` from fetched master `2fc13488`. Gavin approved starting the planned TODAY briefing preview after #548 merged ("Merge 548. Start next work", then "Let's finish the planned work"). [Bounded brief](BEYOND-4.0-D.md). No competing implementation PR found; #473 remains a parked draft. Recovery coaching and end-of-run debrief stay parked.
- Opt-in PREVIEW BRIEFING on current TODAY, below Engine guidance. One read-only screen: NOW and NEXT from the existing TODAY picture plus issued Engine guidance; WHAT BEYOND HANDLED lists only an existing Garmin last-night import, or stays quiet. BACK TO TODAY, and leaving TODAY, restore the current TODAY. No replacement, no persisted home-screen switch, no recommendation writes.
- Master-brief correction (2026-11-15) records that much of 4.0's listed scope already exists on master; this preview is unchanged and still excludes run debriefs and year-in-review.
- Gates: focused query/browser checks, existing TODAY/App regressions, type/architecture/build, full CI and independent Protected exact-head review pending. Final exact-head evidence belongs on the PR. Gavin alone merges.

---

# Current integration — merge the weekly recovery comparison, then TODAY preview

- Gavin explicitly instructed “Merge 548. Start next work.” Work-run PR #549 is already merged at master `41339a37`. Resolve only the comparison branch's checkpoint conflict by preserving this current sequence and both handoffs; source merged automatically.
- Existing comparison PR #548 remains read-only, with no new coaching rule or Engine/Garmin authority change. Prior exact-head review/CI at `b13cc2cd` are historical after integration; renew exact-head review, focused combined checks and full CI before the explicitly authorized merge. No admin bypass or auto-merge.
- Next approved implementation: TODAY briefing preview (4.0-d), after integration, for Gavin to try before any replacement. Recovery coaching and debrief remain parked. No other PR is authorized for agent merge.

---

# Current objective — 4.0-c: work-run draft, then TODAY preview

- Builder Codex; [active PR](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/549), branch `codex/4c-work-run-plan` from fetched master `2bbceb73`. Gavin chose work-run planning then TODAY preview, parking recovery coaching and end-of-run debrief. [Bounded brief](BEYOND-4.0-C.md). No competing work-run PR found; ready comparison PR #548 remains untouched and independent.
- Draft inside Plan Today → Week planner: first known work block and following off days within seven dates, existing meals/training/tasks/calendar/routines and safely matching next-shift sleep context. Unknowns stop the block; dates/provenance stay explicit. Edit and confirm once to save a Capture plan-note snapshot. No task/workout/food/preparation/notification writes or new live plan store.
- Review recovery: independent review found confirmed changes become RECORDED after day start and could bypass sleep exclusion. Explicitly reconcile next-shift start/end and first/last-night assumptions with shared context for the previous/current/next lived dates, including recorded exception/manual overrides; no validation means omission. Regression coverage added.
- Checks/review/CI pending. Final exact-head evidence belongs on the PR. Gavin alone merges; TODAY preview follows as a separate reviewed objective, not in this PR.

---

# Current objective — 4.0-b slice 2: one coach card

- Builder Codex; [active PR](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/547), branch `codex/4b-coach-card`, from fetched master `ba6df574` (deload merged). Owner resumes work; [approved order and scope](BEYOND-4.0-B.md). No competing implementation PR found.
- One optional evidence-backed suggestion below Engine guidance; existing feature confirmation flows own actions, local SKIP lasts until evidence changes. No new formulas, schema, dependency, provider or silent writes.
- Review recovery: independent review found skip pruning could erase a temporarily ineligible dismissal and storage read failure could silently restore advice. Fixed with one evidence fingerprint per stable feature identity and explicit read-failure/retry, with browser regressions. Training advice also uses TODAY's existing Engine-suggested variant; RESET suppresses lift coaching, REDUCED reads reduced history. Final exact-head review/CI remain required.
- Gates: focused query/browser and existing TODAY/App regressions, type/architecture/build, full CI and independent Protected exact-head review pending. Record final evidence in the PR handoff without changing the reviewed commit. Gavin alone merges; no automatic next slice.

---

# Builder takeover — BEYOND 4.0-b slice 1: DELOAD after a steady stall

- **Builder:** Codex resumes Claude Code's existing `ccr-88f5c085-4b-deload` branch and [PR](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/546), following Gavin's explicit takeover instruction. No competing branch/PR or new scope.
- **Recovered:** original head `c99f03c05187538e3c64ed65280dce35f00e426e` has green full PR CI, but no independent review comment was recorded at inspection. The audit/handoff and 4.0-a extraction have already merged; do not repeat them.
- **Integration:** fresh master `4275e26340273d684f4f40d6b4009fd0c5800e70` merged cleanly, including the TODAY numbers extraction. Source behavior unchanged by takeover integration.
- **Scope/authority:** existing [4.0-b brief](BEYOND-4.0-B.md), original approved deload rule only. Protected: deterministic evidence-backed advice, never applied/prefilled; preserve INCREASE/RE-ENTRY, existing records, excluded warmups/substitutions and undo semantics. No next coaching slice until this PR is resolved and owner-integrated.
- **Review recovery:** independent review blocked integrated head `3a57e825`: old matching-slot or substituted loads could contaminate cross-template DELOAD. Fix uses the latest canonical top weight from the stall evidence itself; ordinary slot progression/RE-ENTRY are unchanged. Pure and canonical command/query regressions cover both defects and cross-variant repeat suppression.
- **Gates:** original integration passed full Node (2361 / one existing skip), focused browser deload/re-entry, type/architecture/build; repair verification and renewed independent exact-head review/CI pending. Final review/CI evidence belongs in the PR handoff; do not infer final approval from original-head CI or historical text below.
- **Next:** fix only scoped regressions/findings, obtain independent PASS and full green CI, maintain PR handoff, then Gavin decides merge. Never merge.

---

# Current objective — BEYOND 4.0-a part 1, slice 1: TODAY split, AT A GLANCE (no visible change)

- **Builder:** Claude Code; branch `ccr-88f5c085-4a-foundation`. Routine. [Release brief](BEYOND-4.0-A.md) under
  [BEYOND-4.0](BEYOND-4.0.md). TodayScreen.tsx 3,517 → 3,452 lines; `TodayNumbers.tsx` holds AT A GLANCE.
- **Merged:** #543 (Doctrine line), #544 (4.0 master brief).

---

# Historical — documentation truth (merged as #542; completion plan step 5, Gavin: "Go", "Let's work")
# Historical Claude handoff — BEYOND 4.0 "The Chief of Staff" (Gavin, 2026-11-15: five decisions)

- **Authority:** [master brief](BEYOND-4.0.md). Each release: own PRs; Protected parts (Engine learning, TODAY
  redesign) get independent exact-head review; Gavin merges.
- **4.0-a:** complete with slice 1 (#545); the input features already existed ([4.0-a](BEYOND-4.0-A.md)).
- **Now:** [4.0-b](BEYOND-4.0-B.md) slice 1, DELOAD after a steady stall (Gavin: "Start 4.0-B", "I approve the
  [deload] rule"). Branch `ccr-88f5c085-4b-deload`. Protected: independent review.
- **Next:** slice 2, one coach card at a time; its ranking goes to Gavin first.
---

# Historical — documentation truth (merged as #542; completion plan step 5, Gavin: "Go", "Let's work")
# Historical — DOCTRINE-ALFRED-001 (merged as #543): the Doctrine records Alfred is part of BEYOND (Gavin, 2026-11-15: "Approved the doctrine")

- **Builder:** Claude Code; branch `ccr-88f5c085-doctrine-alfred`. **Protected** (constitutional text): independent
  exact-head review; Gavin merges. Replaces the 2026-10-09 "AI optional" note with RULES-2026-10-31. Docs only.
- **Completion plan:** steps 1–5 merged (#529, #540, #541, #542; #482 closed, #473 parked). Next: the field gate.

---

# Historical — documentation truth (merged as #542) (completion plan step 5, Gavin: "Go", "Let's work")

- **Builder:** Claude Code; branch `ccr-88f5c085-audit` (docs only, routine). The audit and AI handoff
  (`docs/audit/`), the README's stale "AI optional" and navigation text, and the roadmap's current-plan header.
- **Awaits Gavin:** the Doctrine's 2026-10-09 "AI optional" note (Protected, constitutional) — proposed wording in the PR.
- **Plan status:** #529, #540 merged; #482 closed, #473 parked; ALFRED-FIX-001 merged as #541; then the field gate.

---

# Historical — TIMELINE-EDIT-001 (merged as #540): fix a meal or water entry where you see it (Gavin, 2026-11-15: "Approved.")
# Historical — ALFRED-FIX-001 (merged as #541): Alfred and the free helper fix a logged entry (Gavin, 2026-11-15: "Approved.", "Go")

- **Builder:** Claude Code; branch `ccr-88f5c085-alfred-fix`, from master `d51017f8`. **Protected:** independent
  exact-head review, green CI, Gavin merges. [Brief](ALFRED-FIX-001.md).
- **Completion plan (Gavin, "Go"):** 1 #529 week planner (Codex; ready); 2 TIMELINE-EDIT-001 merged as #540;
  3 #482 closed, #473 parked as draft (Gavin); 4 this; 5 audit docs + "Alfred is core" doctrine/README amendment
  (needs Gavin's approval); 6 field gate on the phone. New work only after.

---

# Historical — TIMELINE-EDIT-001 (merged as #540): fix a meal or water entry where you see it (Gavin, 2026-11-15: "Approved.")

- **Builder:** Claude Code; branch `ccr-88f5c085-timeline-edit`, from master after #535. Feature; Gavin merges.
  [Brief](TIMELINE-EDIT-001.md).
- **Also open:** #529 (WEEK-PLANNER-002, Codex), ready to merge. #536 merged. #482 and #473 await Gavin's decision.
- **Next:** ALFRED-FIX-001 (Protected): Alfred and the free helper propose a move, correction or removal through
  `application/logEntries.ts`, confirmed by Gavin.

---

# Current objective — finish WEEK-PLANNER-002 on the existing PR

- **Builder:** Codex resumes its preserved `codex/week-planner-001` branch / [existing PR](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/529). Original bounded owner approval remains in [the brief](WEEK-PLANNER-002.md); merged HARVEST-002 selected completion of this delivery as the next mission, and Gavin asked what comes next. No new capability or architecture is authorized.
- **Integration:** original head `32fb0f969d45dd790abb57ff5817baccbc8eba4c`, fresh master `b4739464` (research archive merged). Source merged automatically; the two conflicts were appended UX decisions and the checkpoint. Preserve all upstream source, decisions, raw capture, speed pack and research records while restoring the active planner handoff.
- **Scope:** the existing seven-day agenda, honest work/programme/calendar context and explicit planned-date moves; deadlines/recurrence/status stay unchanged. No automatic scheduling, capacity score, workout overrides, new schema/provider/dependency, Alfred tools or another feature.
- **Verification:** integration head `59145a5b` passed full Node (2344 / one existing skip), focused Chromium (45), UTC/New York planner integration, architecture, typecheck and build. Independent Protected review blocked that head: midnight can pass during the eligibility read. Fixed by revalidating the date after that awaited read, before the planned-date write; Node and real-Chromium regressions check rejection and unchanged task/event history. Fresh focused checks and final-head review/CI are required; current final results live in the PR handoff to avoid invalidating exact-head review with another documentation commit.
- **Next:** complete that verification, fix only relevant regressions/findings, obtain an independent PASS and green CI, then mark the same PR ready for Gavin's merge decision. Never merge the PR or start another improvement.

---

# Historical implementation checkpoint — WEEK-PLANNER-002 (Gavin: “Week planner it is then”)

- **Builder:** Codex; branch `codex/week-planner-001`, fresh master `77c8ab618e8bdd8eddba29d178ac476821eda806`. [Active PR](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/529); no overlapping week-planner branch found. Existing older shift what-if PR remains separate.
- **Authorization/scope:** [brief](WEEK-PLANNER-002.md). Make the existing read-only week actionable through Plan Today: work context, actual programme versus existing suggestions, canonical planned/due tasks, saved calendar freshness, explicit task placement/moves. No automatic scheduling, capacity score, deadline changes, per-date workout override, Engine/schema/provider/dependency expansion or primary navigation reorder.
- **Recovered:** gym upgrade merged as #528. Its exact-head independent review PASS and full CI green are recorded on that PR; prior checkpoint review/CI pending text is historical.
- **Implementation:** new compositional read model and native responsive date picker/agenda; moves reuse modifyObligation under the shared atomic gateway with current-date and stale-plan guards. Task details still complete/release. Normal task lists and Week Ahead remain; Week Ahead directly opens the planner. Draft intended dates, write/read errors and in-form retries preserve choices.
- **Verification:** full Node 2325 PASS / one existing skip (280 files); planner integration 9 PASS in UTC and New York including DST. Focused real Chromium 28 PASS in six files, including populated 320–1024px/axe, actual navigation, deadline-preserving moves, drafts/midnight, retry and post-commit recovery. Architecture, TypeScript and production/PWA build PASS. Independent early recovery findings fixed and rechecked. Final exact-head review/full required CI are the remaining PR gates; consult the PR handoff for current results after this committed checkpoint.
- **Next:** obtain independent exact-head review and green required CI on the existing PR, then present Gavin’s merge decision. Gavin alone merges. No new owner decision needed within the selected objective.


---

# Current research handoff — HARVEST-002 (Gavin: Discover / Inspect / Classify / Rank / one Claude mission / Verify)

- **Builder/researcher:** Codex, documentation-only `codex/harvest-002` from fetched master `5d78a5dd95bc566fcb8aada0ea7ed0b131d43143`. [Whole-product inventory and deeper capture/planning comparison](harvest/HARVEST-002.md). [Archival PR](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/539). No application/configuration/governance-rule changes.
- **Truth:** speed pack #537 and raw capture #538 are merged. Week-planner PR #529 remains open, draft and conflicting at inspected head `32fb0f96`; its historical green checks do not establish current integration readiness. No live independent review/comment was visible when checked. Do not create another planner or duplicate Notes Sweep/Saved sorting.
- **One proposed handoff:** [Claude mission](harvest/HARVEST-002-CLAUDE-MISSION.md) to finish the already-approved week planner on its existing branch, preserve current upstream work, renew tests/full CI/independent exact-head review and present Gavin's merge decision. No feature implementation or delegation has started during research; the user can assign this bounded handoff to Claude.
- **Research quality:** primary sources/licences, verified findings, recommendations, unresolved questions and subjective ranking (including interaction quality/doctrine fit) recorded. Independent read-only review requested; final archival checks/review are in the research PR handoff. Product verification belongs to the actual implementation head; no new product test result claimed here.
- **Next:** archive/index this research for reuse, then Gavin chooses/assigns the proposed single mission. No automatic merge, next feature chain, new Alfred tools or architecture authorization.

---

# Historical — UNIVERSAL-FAST-CAPTURE-001 (Gavin: universal fast capture, no destination required)

- **Builder:** Codex; branch `codex/universal-fast-capture-001`, fresh master `bc93cc25c5e5103ba3e31f6645835028a8c57dfd` (speed pack merged as #537). [Brief](UNIVERSAL-FAST-CAPTURE-001.md). FEATURE lane: existing canonical saves, no Engine/command/schema/provider/dependency changes. [Active PR](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/538).
- **Bounded implementation:** one-tap CAPTURE on TODAY opens raw multiline text in the existing shell sheet. Explicit CAPTURE saves an OPEN CaptureItem; leaving raw is valid. Optional MAKE A TASK previews copied/editable title and blank optional planned/due dates; only CREATE TASK/PLAN ITEM invokes existing atomic conversion with source provenance. OPEN CAPTURE is the existing later-processing route. No AI sorting, new notes app, broad navigation, family/metrics/training/evidence changes or Alfred writes.
- **Verification:** 40 targeted Node checks PASS in four files (capture inbox/conversion/atomicity/native restoration). 67 unique real-Chromium checks PASS in seven files, including 11 new acceptance cases, original shell sheets/TODAY/LOG/speed/retention/atomicity. No-day/offline use, raw-first/no inferred date, explicit promotion/cancel, failed save/retained draft, same-tick duplicate guard, missing source, close/reopen/remount, source-linked backup and 320/375/768px axe accepted. Architecture, typecheck and production/PWA build PASS. Full required CI is the remaining PR gate; consult its handoff for current status after this committed checkpoint.
- **Next:** obtain green required CI on the bounded PR and present Gavin’s normal review/merge decision. Never merge or start the next mission. Week planner remains preserved separately in #529.

---

# Historical — SPEED-UNDER-FATIGUE-001 (Gavin, 2026-11-15: build only the speed pack)

- **Builder:** Codex; branch `codex/speed-under-fatigue-001`, fresh master `eacbb3a0d1c1252da13281e972c0f879a11c6737`. [Brief](SPEED-UNDER-FATIGUE-001.md). FEATURE lane; no Engine/command/persistence/provider/dependency changes. [Active PR](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/537).
- **Chosen paths:** quick Note from TODAY (one navigation tap instead of LOG → NOTE), existing workout resume lands at the current exercise, and current-set LOG sits immediately after required weight/reps in normal/Gym views. Optional metadata stays accessible below; exact-repeat retains its one-tap handler as a secondary shortcut. Defaults, rest, undo, skip, red-capacity gates and explicit saves remain.
- **Repository truth:** LAUNCH-STEADY-001 and RESUME-FOLD-001 are merged; preserve those fixes. Week planner remains safely pushed in [its separate PR](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/529), outside this objective. Claude's other approved queue entries are not this speed pack.
- **Verification:** targeted workout/atomicity/Gym Node43 PASS; 135 unique focused real-Chromium checks PASS in eight files, including six speed acceptance cases and full TRAIN71, original LOG/resume-fold/Gym/recovery. Explicit saves, retained note drafts, current-exercise positioning, defaults/rest, optional metadata and 320–768px/axe accepted. Architecture, TypeScript and production/PWA build PASS. Full required CI remains the PR gate; consult its handoff for current results.
- **Next:** obtain green required CI on this bounded PR, then Gavin's merge decision. No capture-system build, end-of-day feature, family sharing, metrics/evidence work, major surface or automatic writes. Never merge.

---

# Historical — LAUNCH-STEADY-001: no flash on first launch (Gavin, 2026-11-15: "Approved.")

- **Builder:** Claude Code; branch `ccr-88f5c085-launch-steady`, from master `1fed57c8`. Routine; Gavin merges.
  [Brief](LAUNCH-STEADY-001.md).
- **Approved queue, in order:** this; TIMELINE-EDIT-001 (tap a timeline mark or diary row to change its time, amount,
  or undo, with the existing corrections); ALFRED-FIX-001 (Protected: Alfred and the free helper propose time, amount
  and remove corrections, confirmed by Gavin).
- **Merged since:** #533 (DIRECTION-90-001), #534 (FOOD-SOURCES-001), #535 (RESUME-FOLD-001).
- **Resolved:** the CommandConsole RESUME WORKOUT bound was a real fold problem, fixed in #535 (RESUME-FOLD-001).

---

# Historical — FOOD-SOURCES-001 (merged as #534): where your calories and protein came from (Gavin, 2026-11-15)

- **Builder:** Claude Code; branch `ccr-88f5c085-food-sources`, now on master (after #530). Feature lane; Gavin merges.
  [Brief](FOOD-SOURCES-001.md).
- **Scope:** WHERE IT CAME FROM on the calories page (7D/30D) and BODY's meal calories and protein history. Read only.
- **Merged today:** #530 (calories page), #531 and #532 (calorie proposal and floor). **Also merged:** #533
  (DIRECTION-90-001, the 90-day line).

---

# Historical — DIRECTION-90-001 (merged as #533): the last 90 days against your year (Gavin, 2026-11-14: "Approved")

- **Builder:** Claude Code; branch `ccr-88f5c085-metric-direction`, now on master (after #530).
  Feature lane; Gavin merges. [Brief](DIRECTION-90-001.md).
- **Scope:** one line on the shared metric page comparing the median of the last 90 finished lived days with the last
  year's; quiet until 180 days of records. Read only.
- **Merged today:** #530 (calories page), #531 and #532 (calorie proposal and floor). FOOD-SOURCES-001 follows.
- **Next:** CI green, then Gavin merges.

---

# Historical — METRIC-PAGE-001 slice 4 (merged as #530): calories join the shared page (Gavin, 2026-11-14: "That's good for me")

- **Builder:** Claude Code; branch `ccr-88f5c085-metric-calories`, from master `77c8ab61`. Feature lane: no independent
  review required; Gavin merges. Codex's WEEK-PLANNER-002 (#529) is open and does not touch these files beyond docs.
- **Scope:** TODAY's CALORIES tile opens the shared metric page: TODAY/7D/30D/1Y, eaten (LOGGED, white) beside burned
  (GARMIN, blue), never added or netted, each with its own coverage, usual and work/off split; missing stays missing.
  The old `MeasuredSheet` sheet retires (its shared pieces stay). [Brief](METRIC-PAGE-001.md#slice-4--calories-join-the-shared-page-gavin-2026-11-14-thats-good-for-me).
- **Verification:** see the PR for the actual run results.
- **Next:** CI green, then Gavin merges. After that every TODAY number with a detail view is on the shared page or
  sleep's own page.
# Historical — TARGET-PROPOSAL-002 (merged as #532): your own floor and #531's review notes (Gavin, 2026-11-15)

- **Builder:** Claude Code; branch `ccr-88f5c085-target-floor`, built on #531. Protected (additive stored field
  `calorieFloorKcal`); independent exact-head review, green CI, Gavin merges. Brief: TARGET-PROPOSAL-001.md § 002.
- **Then:** FOOD-SOURCES-001 (approved 2026-11-15), where calories and protein come from. DIRECTION-90-001 is built on
  `ccr-88f5c085-metric-direction` and waits for #530.
- **Merged:** #531 (calorie proposal). **Ready to merge:** #530 (calories page).

---

# Historical — TARGET-PROPOSAL-001 (merged as #531): a weekly calorie proposal you save or keep (Gavin, 2026-11-14: "Approved")

- **Builder:** Claude Code; branch `ccr-88f5c085-target-proposal`, from master `77c8ab61`. **Protected:** amends
  NUTRITION-003's "no formula" and Drop 6's "nothing reads the estimate". Needs independent exact-head review and green
  CI; Gavin alone merges. [Brief](TARGET-PROPOSAL-001.md).
- **Scope:** Weekly's CALORIES FOR THIS WEEK proposes a calorie target from the weight-trend burn estimate and the
  goal weight and weekly rate (capped, floored at 1,500, at most 150 kcal a week of change). SAVE (with UNDO) or KEEP.
  No Garmin input, no Engine input, no schema or dependency.
- **Also open:** #530 (METRIC-PAGE-001 slice 4, calories page), ready to merge. Codex's #529 (WEEK-PLANNER-002) touches
  `WeeklyCheckInScreen.tsx` elsewhere in the file; expect at most a small merge.
- **Next:** independent review at the PR's head, then Gavin merges.

---

# Historical — GYM-UPGRADE-001 (Gavin: “Approved”; merged as #528)

- **Builder:** Codex; branch `codex/gym-upgrade-001`, fresh fetched master `0ffc2a3f3b2f76ec24493bfb8fc0b0bf47ab6a12`. [Active PR](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/528). No overlapping active training work found.
- **Authorization:** [bounded brief](GYM-UPGRADE-001.md). Normal/Gym live workout, optional reps left, explicit warm-ups excluded from working statistics, honest previous-session finish. CSV deferred. No effort-driven recommendations.
- **Recovered truth:** visual foundation, hydration/steps metric pilot, habits and sleep's shared-page slice are merged. Prior checkpoint's sleep-review next action is stale: sleep merged as #527; polling-window repair merged as #526.
- **Implementation:** additive metadata on canonical set rows/events; legacy rows remain working sets. Working-slot duplicate guard, canonical event order for undo; normal/Gym shared controls, session-scoped input drafts, visible warm-ups/effort, matching-actual-lift recap available at finish and in history. Working counts/volume/records/trends/rotation exclude warm-ups; progression formulas unchanged.
- **Verification:** full Node 2315 PASS / one existing skip; latest gym metadata/backup/concurrency suite 12 PASS. 118 unique focused real-Chromium tests PASS across original TRAIN/Gym/history/atomicity, recovery, redesign and upgrade; axe and 320–1024px accepted. Architecture and TypeScript/production/PWA build PASS. Independent early findings fixed and rechecked; final independent exact-head review and required CI pending on the PR.
- **Next:** obtain final independent exact-head review and green required CI on the existing PR; resolve any findings there. Gavin alone merges; no expansion into coaching, schema, providers, dependencies or other deferred work.

---

# Historical — METRIC-PAGE-001 slice 3: sleep gains the shell (Gavin, 2026-11-14: "Approved and continue working")

- **Branch:** `ccr-88f5c085-metric-sleep`, from master `3f84bc29`. **Builder:** Claude Code.
- **Merged today:** #521 (quiet empty-tile caption), #522 (resting heart rate on the shared page), #523 (EXPORT-001
  brief, another session), #524 (16 px cave tabs).
- **What this slice does:** the sleep page keeps its own chart and navigation and gains the source line (GARMIN and
  LOGGED, freshness, the gap-fill rule) and work days compared with days off. Both show on TODAY and in the cave's
  VITALS. It also adds tests for LATEST's fallback (#522's review note).
- **Elsewhere:** #520 HABIT-RHYTHM-001 (Codex) merged after its renewed review PASS; its entry below is historical.
- **Next:** independent review of this slice, then Gavin merges. After that, the metric page covers every number that
  has a detail view except calories, which stays on MeasuredSheet until a later decision.

---

# Historical — HABIT-RHYTHM-001 (owner approved 2026-11-14; merged as #520)

- **Authorization:** Gavin approved recording, seven/28-day history and past-day correction, with explicit
  Done / Didn't do it / Not recorded. [Brief](HABIT-RHYTHM-001.md). Protected answer-history semantics;
  independent exact-head review and green CI required, Gavin alone merges.
- **Builder:** Codex. Fresh branch `codex/habit-rhythm-001`, baseline fetched master
  `c9d6702d3f2459aae7840e6cf402e9d6f9628b47` (#519 metric pilot merged). Active
  [PR #520](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/520); no overlapping habit PR.
- **Implemented:** additive explicit HABIT_SET answers with legacy mark/undo compatibility; atomic append/
  no-op guards; local 16:30 28-day calendar with labelled work context and honest gaps; seven-day rows,
  shared history/correction sheet, read retry, write-error and same-tick submission guards. Existing
  create/schedule/archive, Alfred confirmation and DATA route remain; DATA labels now distinguish No
  from unrecorded. No quit-tracker, schema, Engine, provider, dependency or backup-format changes.
- **History boundary:** only existing day records can be corrected. Gaps are visible but do not
  fabricate historical day lifecycle records or negative answers. Multiple manual starts in one
  lived day retain the actual answer's original correction target.
- **Verification:** full Node 2300 PASS / 1 existing skip; 30 focused real-Chromium tests PASS across
  new habits, original habits, DATA, whole-life and LIFE. DST-specific New York run 12 PASS; architecture,
  TypeScript and production/PWA build PASS. Final required CI and independent exact-head review pending.
  Initial checks fixed a hidden retained dialog's placement and chronological test event selection.
- **Recovery:** previous exact-head independent PASS and full CI green at `d9c18924`. Master advanced
  through #521/#522/#523/#524, causing documentation conflicts. Integrated freshly fetched master
  `3f84bc2940b3e1a2665cb30e343cdfffab2d2eae`; preserved both habit and upstream decision/capability records.
  Also addressed prior non-blocking review notes: clear rollover prompt and canonical RECORDED >
  CONFIRMED > PREDICTED context resolution (with labelled W/C/P work markers). Renewed integration
  verification: full Node 2303 PASS / 1 existing skip; 41 combined focused tests PASS; New York DST
  13 PASS; architecture, typecheck and production/PWA build PASS. New-head required CI and renewed
  independent exact-head review remain required.
- **Next:** finish current-head verification and independent review on the existing PR.
  No merge or expansion into reminders/health comparisons/new schedule rules.

---

# Historical upstream handoff — METRIC-PAGE-001 slice 2: resting heart rate (Gavin, 2026-11-14: "Approved and continue working")

- **Branch:** `ccr-88f5c085-metric-sleep-rhr`, from master `c9d6702d`. **Builder:** Claude Code.
- **What it does:** resting heart rate moves onto the shared metric page from TODAY and DATA, with LATEST, 7D, 30D and
  1Y, its usual and unusual note, work days compared with days off, freshness and sync. Sleep keeps `SleepPeriods`,
  which does more; the shell's source line and work-day comparison are the next slice.
- **Pilot:** #519 merged at `c9d6702d` (the entry below is historical).
- **Also open:**
  - **#520 HABIT-RHYTHM-001** (Codex, Protected). Independent review was assigned to the reviewer session at Gavin's
    approval.
  - **#521 GARMIN-CAPTION-001** (Claude, Routine). Empty Garmin tiles keep a quiet caption.
- **Next:** independent review of this slice, then Gavin merges.

---

# Current objective — METRIC-PAGE-001 hydration/steps pilot (2026-11-14)

- **Owner authorization:** “Go ahead” after confirming the approved pilot scope. Continue existing branch
  `ccr-88f5c085-metric-pilot`; active [PR #519](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/519). Claude's preserved WIP is `e63a6659a3b3097b39482f9cfa4d38db15371eff`.
- **Prerequisites settled:** TODAY merged as #517 (`ebfc9881`), MORE/cave as #518 (`8e04e2eb`). Fresh master
  `8e04e2eb5f486c83489777446370860e3ac57595` is incorporated into the pilot. No competing PR/branch.
- **Brief:** [METRIC-PAGE-001.md](METRIC-PAGE-001.md). Builder Codex completing Claude's approved implementation.
  One shared hydration/steps detail from TODAY and DATA; other metrics and recommendation authority unchanged.
- **Research preserved:** CHP-001 and HARVEST-001, including all owner-approved protocol refinements and
  lifestyle-logging parity findings. Indexed in CAPABILITY_MAP; recommendations remain separate from approvals.
- **Completion work:** honest finished-day coverage, yearly hydration weighting by logged day, canonical weekly
  aggregation reuse, stale Garmin tag, error/retry, existing logging/correction/return routes and regression tests.
  No Engine/schema/command/provider/dependency changes; identity and primary layouts preserved.
- **Verification:** typecheck PASS; focused pilot/query/route checks pass after correcting the recovered
  coverage mismatch. Broad Node/real-Chromium regression and production build are running; final results
  and the exact-head independent review will be recorded on the pilot PR before handoff.
- **Review correction:** range buttons now meet the locked 16 px minimum; the size sweep never exempts
  controls as labels and explicitly measures every button. Read-error controls use foundation tokens/focus.
  Closed metric sheets clear their retained title so focused meal workspaces stay unchanged. Fresh Chromium/
  query regression: 18 PASS (MetricPage001, FocusedMeals, metricDetailQueries). Final CI/review pending.
- **Next:** complete proportional/full verification, push this existing branch, open its one PR, obtain
  independent review of data/provenance/route behavior and green final-head CI. Gavin alone decides merge.
  Stop at pilot assessment; no expansion to other metrics without approval.

---

# Builder takeover — current truth (2026-11-14)

Owner explicitly handed implementation from usage-limited Claude Code to Codex. No competing branch or PR;
no merge authorized. This entry supersedes stale status below; older entries remain historical evidence.

- **Fetched master:** `e12092871d0cee4a1b551f428a013de1332ae833` (VISUAL-FOUNDATION-002, #516).
  Foundation slice 1 (#515) and TRAIN slice 2 (#516) are merged.
- **TODAY foundation (merged):** [PR #517](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/517), branch
  `ccr-88f5c085-today-deck`, head `87d501013e6773698fa4348761064edded5b5cf3`.
  Gavin merged TODAY into master at `ebfc9881`. Its approved decisions and foundation styles are now
  integrated into this existing MORE/cave branch; both decision entries are preserved in the conflict resolution.
  Non-blocking missing-Garmin-caption colour finding remains; do not mix TODAY into the MORE/cave branch.
- **Current objective:** finish verification/handoff for VISUAL-FOUNDATION-004 on its existing branch
  `ccr-88f5c085-more-cave`, [PR #518](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/518).
  Recovered implementation head `98904aefb08dc3501039f0273128561d3bd4f593`.
  All planned implementation is pushed. Independent review BLOCK found an inherited viewport rule forcing
  two status columns below the approved 560 px container breakpoint. Codex is correcting that bounded finding
  with computed-column regression coverage (fails before the fix at a 768 px viewport); renewed exact-head
  review and final-head CI are required. TODAY integration required resolving only the appended UX decision
  entries; both approved entries are retained in slice order. Combined TODAY/BODY/MORE/cave Chromium
  verification: 40 PASS; architecture, TypeScript and production/PWA build PASS. New-head review/CI pending.
  Codex owns the takeover verification and handoff; Claude authored the recovered implementation.
- **Preserved research and next pilot:** existing branch `ccr-88f5c085-metric-pilot`, committed head
  `e63a6659a3b3097b39482f9cfa4d38db15371eff`, no open PR. Contains CHP-001, HARVEST-001 and
  hydration/steps pilot code and tests. CHP-001 preserves all three approved refinements: inspect locked
  decisions, record reuse licences, save/index harvests. The harvest records pilot approval and lifestyle-logging
  parity gaps. No uncommitted Claude workspace is available here, so additional unpushed work cannot be recovered.
  The capability-map index and durable pilot brief/checkpoint still need completing on that branch.
- **Sequence:** renewed review/CI of MORE/cave after integrating merged TODAY; Gavin merges MORE/cave; fetch master and
  resume the existing pilot branch, reconcile its shared seed and approved foundation styling, verify and open
  its one PR. Do not expand the pilot beyond hydration and steps.
- **Other open PRs:** #473 comparison is described as included in merged #474; #482 is an old check-in fix.
  Neither is the current visual-foundation objective; left untouched rather than closing or merging.
- **Takeover verification:** architecture PASS; TypeScript and production/PWA build PASS. Remote PR #517
  and #518 CI both completed successfully at their recovered heads. Full local Node/Chromium verification
  was interrupted after browser progress stalled; separate full Node verification passed (2278 passed,
  1 skipped), and 32 focused MORE/cave browser checks passed. Results are recorded on PR #518.
  The follow-up corrects only the reviewer-found responsive grid and adds its regression assertion.
  Final-head CI and renewed independent review remain required.
- **Review:** independent reviewer Huygens posted BLOCK on the recovered head, with architecture/type/build
  and 47 focused browser tests passing. Reviewer capability became available in the follow-up session.
  Responsive-grid correction: 32 focused Chromium tests PASS, architecture and TypeScript/production/PWA
  build PASS. Renewed independent exact-head review is requested after pushing the correction.
  Review verdict and final verification are maintained on PR #518; Gavin remains the merger.

---

# Owner working rhythm (Gavin, 2026-11-11: "Yes, adopt that as the standing rule")

Applies to every Builder session. It sits inside DEV-FLOW-002 and changes none of its rules.

1. **Gavin gives one objective at a time.** He can queue more; the Builder works them one at a time.
2. **The Builder builds and opens the PR.** Routine and Feature work needs no independent reviewer (Gavin,
   2026-11-12: "Stop needing reviews… we will just merge"), as DEV-FLOW-002 already allows: the Builder runs the full
   suite, checks the riskiest path itself and says so. **Protected** work still needs the independent exact-head
   review DEV-FLOW-002 requires; the Builder says up front when an objective is Protected.
   Reviewer sessions the Builder starts post their PASS/BLOCK verdict on the PR (Gavin, 2026-11-12: "Let reviewer post").
3. **The Builder messages Gavin only when:**
   - **ready:** "Ready to merge: CI green at `<sha>`" (plus "review PASS" for Protected work);
   - **a decision is needed:** asked once, as one question with a recommended answer;
   - **something is blocked:** what blocks it and what is needed.

   CI runs, cancellations and routine review back-and-forth are not reported.
4. **Gavin merges on a READY message.**
5. **One session per item.** No parallel builders or researchers on the same objective.
6. **"Status" gets a one-paragraph answer:** what's open, what's waiting on whom, the next step.
7. **Fewer pushes:** doc and checkpoint updates ride with the next code push, not alone, so CI isn't cancelled for nothing.
8. **A fresh branch per PR** (Gavin, 2026-11-12: "use a fresh branch per PR"): each PR gets its own branch cut from the
   latest `origin/master` (e.g. `ccr-88f5c085-pwa-001`), so it carries only its own commits and the squash-merge
   message stays short. The old long-lived branch is no longer pushed.

---

# Current objective: OPERATOR-EXPERIENCE-001, unified daily operating system (Gavin, 2026-11-13) — Feature lane, slice 2

Brief and roadmap: [OPERATOR-EXPERIENCE-001.md](OPERATOR-EXPERIENCE-001.md).

- **Slice 1** (NOW, NEXT, WEEK AHEAD) merged in #501.
- **Slice 3** ("since you last looked", device-local) merged in #503.
- **Slice 2** (Alfred explains TODAY) is in #502, on branch `ccr-88f5c085-alfred-explains`. Alfred's context and the
  free helper explain what TODAY shows, from the shared `todayPicture` reading. It is read-side, writes nothing, and
  isn't a recommendation.
- **Verification:** typecheck, the architecture check, the node and browser suites and the build.
- **Next:** Gavin merges #502.
- **Remaining roadmap options:** contextual actions on NEXT; the training suggestion beside the next day off.
- **Field tests still needed:** #402; the 16:30 day start on the phone with a confirmed change; the band at 360 px on
  the device.

---

# Next session: BIG-IDEAS-001 (approved 2026-11-09, "Everything but 4")

- Item 1, SHIFT WHAT-IF: merged (#474, includes #473's comparison; #473 can be closed).
- Item 2, WEEK ENERGY FORECAST: merged (#475). The run-length rule also went into Shift What-If (#476, merged).
- Item 3, CIRCADIAN PLAN: merged (#478). "Sleep soon after" added, citing Kalkanis 2023 as search-confirmed (Gavin), in #481.
- Item 6, RECAP: merged (#481).
- Item 8, FAMILY CALENDAR: merged (#483, review fixes #484). #485 reuses an existing "BEYOND — family" after a
  reinstall (review PASS at `fa6d93f1`).
- Item 7, ON-DEVICE ALFRED: spike measured; **deferred** (Gavin, 2026-11-12: "Defer for now."). See
  [ONDEVICE-ALFRED-SPIKE-001.md](ONDEVICE-ALFRED-SPIKE-001.md). BIG-IDEAS-001's picked items are now all built or decided.
  Still open with Gavin: the rotation field test (#402).
- Item 5, WEEKLY INTERVIEW / TIMELINE: merged (#479).
- REFLECT-001: merged (#480). Follow-ups in #481, which also carries CI-MIRROR-001 (Chromium download off the Ubuntu mirror) (search-route test; the circadian source). Independent post-merge
  reviews of #479/#480 and a review of #481 were requested from a separate session.
- Build in order from [BIG-IDEAS-001.md](BIG-IDEAS-001.md), using Gavin's numbers: 1 shift what-if → 2 week energy
  forecast → 3 circadian plan (🔒 approved; research first) → 5 weekly interview / timeline → 6 recap → 7 on-device
  Alfred (🔒; spike first) → 8 shared view for his wife (🔒; privacy design and Gavin's re-confirm first). 4 (voice) is
  not picked.
- Everything before this is merged through #471 (SUPERCHARGE-001 complete). The rotation field test (#402) still
  waits for Gavin.

---

# SUPERCHARGE-001 — 1, 2, 4, 5 merged (#469); item 6 "Talk it through with Alfred" in review (2026-11-09)

- Gavin's weekly plan usage is ~93% (resets Fri); a fresh session is recommended. Next: rotation field test (#402)
  with Gavin, then fixes from a week of real DELTA use.
- Ask DELTA free, Alfred knows what DELTA knows (with the personal opt-in for note-based facts), DELTA lines tap
  through, and more free answers. Brief: [SUPERCHARGE-001.md](SUPERCHARGE-001.md). DELTA-NEXT-001 is complete
  (#467, #468); item 8 (rotation field test #402) waits for Gavin.

---

# DELTA-NEXT-001 — approved ("All"), batch 1 in review (2026-11-09)

- Gavin approved all 8 next items. Batch 1 is in review: 1 unusual, 7 one-tap answer, 4 workout tags, 5 weekly,
  and 2+3 looking ahead. Batch 1 merged (#467). Item 6 (what moves the needle, Protected, approved) in review. Item 8 (rotation field test
  #402) waits for Gavin. Brief: [DELTA-NEXT-001.md](DELTA-NEXT-001.md). DELTA × experiments merged (#466).

---

# DELTA-GROWS-001 — merged (#465); DELTA × experiments in review (2026-11-09)

- Gavin: "Yes, build DELTA. Yes, with the TODAY line." The notebook, what DELTA knows, one question a day, and the
  TODAY line. Brief: [DELTA-GROWS-001.md](DELTA-GROWS-001.md). JOURNAL-LEARN-001 is complete (#463, #464).

---

# JOURNAL-LEARN-001 — approved, building (2026-11-09)

- Gavin: "Yes, build it. Then we add to it." Three parts, one PR each. Brief: [JOURNAL-LEARN-001.md](JOURNAL-LEARN-001.md).
  Part 1 merged (#463). Parts 2 (tag patterns) and 3 (Personal Understanding → Patterns) are in review together.
  Gavin will add more after.
- The 23:30 queue is complete: #458–#462 merged.

---

# Queue for the 23:30 session (Gavin's picks, 2026-11-09: "A, B, 25, 5, C") — A #458, B #459, 25 #460, 5 #461 merged; C in review

In order:
1. **A. TRAIN-HOME-001 — in review.** TRAIN in the YOUR LIFE / MORE / DATA style (date, title, Start workout, shortcuts;
   nothing removed). Protected (TRAIN IA). **Approved directly by Gavin by picking "A".** Keep the active-workout
   view untouched.
2. **B. DATA-HOME-001 tidy-ups** (#456 review notes): extract `openComposition(view)` / `openRotation()`, rAF for
   History's scroll, and test every shortcut.
3. **25. Monthly letter:** a deterministic month summary from recorded data, warmed by Alfred only if a key is
   present; saved only on a tap.
4. **5. Inbox zero:** triage saved notes into task / project / keep / done through existing commands.
5. **C. Monthly Drive restore check:** download, decrypt and compare counts via `checkBackupFile`.

Merged tonight: #448–#456 (Drive backup, sleep rhythm, MORE-HOME, rest memory, DATA-HOME).

---

# Session handoff (2026-11-09, late) — DATA-HOME-001 in review; next: guided TRAIN

- Merged tonight:
  - DRIVE-BACKUP-001: #448, #449, #450 and #452. Gavin set it up and his first backup is confirmed in Drive.
  - SLEEP-RHYTHM-001: #451.
  - MORE-HOME-001 (Protected, approved "Redo more"): #453 and #454.
- REST-MEMORY-001 merged (#455). In review: DATA-HOME-001 (Protected, approved directly: "Next is data").
- Was in review: REST-MEMORY-001 (big-list idea 37). TRAIN's rest starts at your remembered length per exercise,
  learned from ± taps, in localStorage only. Routine lane.
- Next, offered to Gavin: the same YOUR LIFE-style guided top for TRAIN or DATA (Protected IA, so it needs his OK
  per tab), then the Monthly letter (idea 25). Deferred: the monthly restore check against the latest Drive backup.
  The rotation field test (#402) is still waiting.

---

# MORE-HOME-001 — approved, in review (2026-11-09)

- Gavin: "Redo more". MORE opens like YOUR LIFE: YOUR SYSTEMS., area shortcuts and status cards; nothing removed.
  Protected (MORE IA), approved directly. Brief: [MORE-HOME-001.md](MORE-HOME-001.md).
- SLEEP-RHYTHM-001 merged (#451). Drive backup copy fix #452 is in review. Gavin set up Drive backup on his phone,
  and the first backup is confirmed in Drive.

---

# SLEEP-RHYTHM-001 — in review (2026-11-09)

- Gavin asked for "really impressive", Builder's choice. Claude Code chose big-list idea 27, sleep regularity across
  shifts. It adds a read-only RHYTHM section to the existing sleep page. Brief: [SLEEP-RHYTHM-001.md](SLEEP-RHYTHM-001.md).
  Routine lane. Review and CI pending.
- DRIVE-BACKUP-001 complete: #448, #449, #450 merged. Next for Gavin: SET UP in MORE → Data safety → Automatic backups.
- Deferred: the monthly restore check against the latest Drive backup. The rotation field test (#402) is still waiting.

---

# DRIVE-BACKUP-001 — approved, building (2026-11-09)

- Gavin chose encrypted Google Drive backups (Protected: backup contract + provider). Brief:
  [DRIVE-BACKUP-001.md](DRIVE-BACKUP-001.md). **Gavin approved the brief 2026-11-09.** Brief + privacy page #448.
- Google console done by Gavin 2026-11-09: `drive.file` scope, home + privacy links, app **In production**.
- PR 1 merged as #449: WebCrypto encryption, device key store, setup/encrypt/unlock helpers.
- PR 2 (this): Google sign-in (GIS token flow, token in memory only), Drive v3 calls, retention (7 newest + first of
  6 months), Drive as the BACKUP-AUTO-001 destination (due once per lived day after 16:30), SYSTEMS setup with the
  one-time recovery code, TODAY's quiet line, restore list feeding the existing preview-and-confirm restore.
  Review and CI pending. Next: Gavin sets it up on his phone (MORE → Data safety → Automatic backups → SET UP).
- Deferred: monthly restore check against the latest Drive backup (file check unchanged).

---

# TEMPLATE-EDIT-001 — in progress (2026-11-08)

- Gavin chose "Edit saved workout templates" (the main gap after supersets #444). EDIT on each custom template loads
  it into the builder; SAVE CHANGES uses the existing `updateCustomTemplate` (same id, no new data). Edited exercises
  keep their rep range and increment; exercises no longer in the library stay. Review and CI pending.
- POLISH-003 complete (#445, #446).

---

# POLISH-003 — in progress (2026-11-08)

- Gavin chose a polish pass after ~35 features in two days ("Polish pass"): phone screenshots of what shipped,
  then plain wording, less noise, no bare zeros. No new features. Builder Claude Code.
  Brief: [POLISH-003.md](POLISH-003.md). (POLISH-002 is an older, unrelated Protected brief.)
- Batch 1 merged as #445.
- Batch 2: Review empty states in words, no 0s; day squares hidden until recorded. Review and CI pending.
- APPS-PICKS-003 complete (#440–#444). Rotation field test (#402) waits for Gavin's next work night.

---

# APPS-PICKS-003 — in progress (2026-11-07)

- Gavin picked 18 more ideas ([brief and UX rules](APPS-PICKS-003.md)); 18 (supersets) and 31 (places) are approved
  Protected additions. Gavin: Claude Code is the Builder for all of them today. Pick 11 merged as #440.
- Picks 17 + 19 merged as #441. Pick 38 already existed (DATA meals: SAME AS YESTERDAY / SAME AS LAST), so nothing was added.
- Picks 13 + 7 + 29 merged as #442.
- Picks 30, 39, 20, 12, 36, 34, 31 merged as #443 (26, 35, 40 already existed; Places uses Collections).
- Pick 18 supersets (approved Protected): optional `supersetWithNext` on a template exercise; no Dexie version (unindexed field), backup round-trip and old-row tests added. Review and CI pending. Last APPS-PICKS-003 PR.
- APPS-PICKS-002 is complete (#435–#439). CONNECTED-001 complete (#431–#434). CI-HANG-001 merged (#430).
- Rotation field test (#402) still waits for Gavin's next work night.

---

# APPS-PICKS-002 — in progress (2026-11-07)

- Gavin picked 8 ideas ([brief](APPS-PICKS-002.md)); one PR each, in the brief's order.
- Pick 1 merged as #435 (tappable links).
- Pick 2 merged as #436 (person pages; two people sharing a first name share one page for now).
- Picks 1 and 3 merged as #437 (quick add, end of day).
- Picks 16 and 23 merged as #438 (plates, day pixels).
- Picks 10 and 33 together: BACK FOR TODAY resurfacing in YOUR LIFE; Plan my day off with Alfred (cards to save). Review and CI pending. This is the last APPS-PICKS-002 PR.
- CONNECTED-001 is complete (#431 Connections, #432 Patterns, #433 Calendar, #434 Alfred).

---

# CONNECTED-001 — in progress (2026-11-07)

- Gavin chose all four slices ([brief](CONNECTED-001.md)): Connections, Patterns, Calendar with your day,
  Alfred's connected context. Builder Claude Code; branch `ccr-90736806-z9op9b`.
- Slice 1 merged as #431 (Connections).
- Slice 2 merged as #432 (Patterns).
- Slice 3 merged as #433 (Calendar).
- Slice 4 Alfred: with personal context opted in, Alfred also reads the last 7 daily notes and cached calendar events; excluded otherwise. Review and CI pending.
- Rotation field test (#402) still waits for Gavin's next work night.

---

# LIFE-PATTERN-001 — in progress (2026-11-05)

- Objective: apply the YOUR LIFE section pattern across BEYOND, presentation only. Gavin approved it
  ("Go", then "Plan confirmed" to the Builder directly). Builder Claude Code; brief and guide:
  [LIFE-PATTERN-001.md](LIFE-PATTERN-001.md). Start `dd191d83` (#423).
- Rollout, one PR each: 1 primitives + guide (branch `ccr-90736806-z9op9b`) → 2 TRAIN → 3 BODY →
  4 MORE and Plans → 5 weekly review → 6 TODAY (the order and the Engine's next action stay unchanged).
- Step 1 merged as #424 (shared `Section` primitives, `readSection`, guide, Decision Register entry).
- Step 2 TRAIN merged as #425.
- Steps 3 and 4 merged as #426 (BODY) and #427 (MORE and Plans, built by Copilot).
- Step 5 merged as #428 (also fixed the Drop0, DailyExperience fold and duplicate-Settings failures left on master).
- Step 6 merged as #429. LIFE-PATTERN-001 is complete. Reviewer note: WATER BEHIND PACE with 0 oz is
  intended (SuitPace test: behind your usual pace is true information), so no change.
- Next: CI-HANG-001, then the rotation field test (#402).
- Open non-blocking follow-up from the #423 review: TODAY imports all of wholeLife.css for one button.
- CI-HANG-001 (owner OK 2026-11-07): browser install gets apt timeouts, 3 retries of 5 min and a
  30-minute job limit in pr-verify and deploy-pages.

---

# WHOLE-LIFE-001 — merged as #423 (2026-11-05)

- Gavin approved a dramatic whole-life cockpit prototype, corrected the emphasis from shift work
  to everyday life, then directed “Make it happen.” Brief: [WHOLE-LIFE-001.md](WHOLE-LIFE-001.md).
  Builder Codex; branch `codex/whole-life-001`; fresh master
  `95947a7ba539ab2691ed8e4aa24696a4da67e336` (TODAY-FOLD #422). PR pending.
- Implemented a whole-life overview in LIFE with a YOUR LIFE entry on primary TODAY, actual dated
  tasks, project next steps, routine playback/live recorded progress, daily notes, people/home,
  and routes to habits, memory, collections, calendar, training, food and recovery. Existing area
  editors stay mounted for drafts. No Engine, schema, event, backup, dependency or provider change.
- Protected presentation under the owner's bounded approval; existing primary tabs/recommendation
  authority remain. Independent exact-head review and green CI required; no self-merge/deployment.
- Chromium acceptance: 21/21 PASS including 320/360/412/1440 widths, full axe, a task inside the phone
  fold, no-write browsing, source failure/retry, free/work days, retained draft/focus and canonical
  routine completion feedback. Full verify at `f866f7af`: **433 files / 3,523 tests PASS**, existing
  one-file/two-test skips; architecture/TypeScript/production/PWA build PASS. A final small player
  style-containment repair has renewed 21/21 focused PASS, architecture 455 files and build PASS;
  the full suite predates that containment repair. Exact-head remote CI/review remain pending.
- Gavin authorized a final bounded pass with the remaining weekly budget. Prominent resumption of
  an actual open workout, native recorded-step progress and keyboard/hover feedback are implemented.
  Focused WholeLife/Life/RoutinePlayer **22/22 PASS**; final contrast-adjusted WholeLife **10/10 PASS**,
  architecture and production/PWA/TypeScript build PASS. No new query, write command, schema or
  dependency. The full-suite result above predates this small presentation pass.
- [Actual App captures](../screenshots/whole-life-001/README.md) use synthetic records in a disposable
  browser context. Interactive inspection fixed the inherited 430 px desktop wrapper and tall phone
  introduction. CI repair #409 is already on master; live GitHub API access still returns Forbidden.
- Branch and captures pushed; PR creation failed with `Post https://api.github.com/graphql:
  Forbidden`. No PR number or independent review claimed. Next: open the one prototype PR,
  obtain independent exact-head review and green CI, then Gavin's merge/deployment decision. Gavin
  judges the working experience before further expansion; the complete life vision is not claimed done.

---

# TODAY-GLANCE-001 — historical; merged as #420

- Gavin approved starting TODAY at a Glance from fresh master after explicitly approving PR #419's
  merge on 2026-11-04. Brief: [TODAY-GLANCE-001.md](TODAY-GLANCE-001.md). Builder: Codex; branch
  `codex/today-at-a-glance-001`; baseline `6472d5fdb93dd7a94df6fea6a5d7b679a4807490`;
  active [PR #420](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/420).
- The bounded first slice renames the existing metric grid AT A GLANCE and adds SEE ALL to the
  existing DATA home. Existing readings, evidence sheets, priority/order, one-red rule and writes
  are unchanged; no Engine, schema, event, backup, provider, dependency or recommendation change.
- Focused Chromium evidence: TODAY 21/21 and navigation/TODAY regressions 93/93 PASS, including
  320 px no-overflow and a no-write SEE ALL path. TypeScript PASS. Interactive inspection at
  390×844 confirmed the active workout still leads, At a Glance remains compact, and SEE ALL lands
  on DATA // NUMBERS. Production/PWA build PASS; risk classification confirms PROTECTED.
- Independent review BLOCKED head `6f9d8ef5`: MORE → DAILY CONTROLS exposed a dead SEE ALL action,
  and the checkpoint understated completed build evidence. The adapter now deliberately opens the
  DATA workspace when no metric focus is supplied, with regression coverage; this changed head
  requires renewed exact-head review and green CI.
- Next: push the repair, obtain renewed independent exact-head review and green CI, resolve any
  findings, then request Gavin's merge approval. After merge, test the experience through real
  daily use before adding customization, new summaries or another layer.

---

# MORE-LIBRARY-001 — merged PR #419

- Gavin approved the researched Home + Library direction and explicitly approved MORE instead of
  COMMAND. The protected build merged on 2026-11-04 at
  `6472d5fdb93dd7a94df6fea6a5d7b679a4807490` after independent exact-head PASS, resolved findings
  and green required CI.
- Shipped consistent capability icons, browsable Apps Checklist destinations, device-local
  Favorites and Recent quick strips, and plain-language grouped library rows. Internal `COMMAND`
  route keys remain for compatibility; the operator sees MORE.

---

# Current checkpoint — Apps Checklist integrated, field gate next

Updated 2026-11-04 by Codex.

- `origin/master` is `5ab48460fe3438b5bd11b91917126a6986b042a8`; the pull-request queue is empty.
- The complete Apps Checklist is merged: A1 Snippets (#405), A2 Share Inbox (#406), A7a Smart
  Lists (#410), A4 Routine Player (#411), A5 Habits (#412, Dexie v22), A9 IFTTT (#413), A3 Daily
  Note (#414, Dexie v23), A6 Collections (#415, Dexie v24), A8 Google Calendar (#416), and A7b
  Highlights (#417, Dexie v25).
- Integrated verification on that exact master passed: architecture 453 files; tests 432 files / 3,510
  tests, with the existing one-file/two-test skips; TypeScript, production build and PWA generation
  passed. The existing large-chunk build warning remains non-blocking.
- Provider secrets remain phone-local and excluded from backups. The final IFTTT repair also
  redacts network errors so Webhooks keys cannot appear in user-visible failure text.
- Automated integration is complete. Real Google authorization, a real IFTTT key, physical-phone
  ergonomics and lived rotation behavior cannot be established by repository tests.
- Resume `ROTATION-FIELD-001`, the already-approved report-only 3.0 launch mission. Gavin uses
  BEYOND through a complete work run and first full day off; capture `FIELD · INCIDENT`,
  `FRICTION`, `MISSING JOB`, `TRUST GAP`, or `CLEAR` at final shift, next wake and full day off.
  This closeout authorizes no new product implementation; evidence determines the next bounded
  objective.

---

## Historical checkpoints

# CI-FLAKE-001 — 2026-11-04 (Builder: Codex; reviewer/merger: Claude Code)

- Gavin assigned [CI-FLAKE-001](CI-FLAKE-001.md) ahead of further checklist items. Branch
  `codex/ci-flake-001` starts at fresh master `39ae60c9b41398804af99371ccd95be537465965`.
- Repairing browser test readiness/isolation only; no app, dependency, retry, timeout or assertion
  relaxation. Shared helpers/setup ensure this PR selects full-suite CI under #408.
- Routine-player WIP is paused and preserved at `ae1f7c6` on `codex/routine-player-001`.
- Focused verification: 16 files / 232 tests PASS, including all named browser files and Factory;
  architecture, TypeScript and production/PWA build PASS. A full run found an additional two-hop
  Small Steps meal path and synthetic camera readiness race. Both repaired; expanded regression
  set 5 files / 61 tests PASS; all original assertions retained (337 `expect` expressions checked).
  Final full local run at code head `502cb286`: **416 files / 3,449 tests PASS**, zero failures,
  existing one-file/two-test skips unchanged (541.28 seconds). Final TypeScript PASS.
  Completion requires five consecutive full-suite CI workflow
  passes on the one PR, with run links in its body; none claimed yet.
- Git fetch/push work, but GitHub API requests return `Forbidden`, blocking PR creation/run control.
  The owner's three requested domains have been saved into the environment draft; publishing it
  remains necessary to apply those settings. Repair pushed; no PR number yet. Next: restore API
  access, open the one PR, obtain the five consecutive full-workflow run/attempt links in its body,
  then Claude review and merge. See the brief's CI handoff. No self-merge; checklist work stays paused.

---

# APPS-CHECKLIST — 2026-11-03 (orchestrator: Claude Code; builder: Codex)

- Gavin picked nine outside-app jobs for BEYOND: [checklist](../BEYOND_APPS_CHECKLIST.md), briefs in
  [APPS-CHECKLIST-BRIEFS.md](APPS-CHECKLIST-BRIEFS.md). Google Calendar sync and IFTTT webhooks approved as providers.
- ROTATION-FIELD-001 is **paused** by Gavin ("Pause it, build now"); restart after the checklist merges.
- Next: Codex builds A1 → A9 one PR each; Claude Code reviews and merges on PASS + green CI.

---

# BATCOMPUTER-001 — active protected build

- Gavin approved the BEYOND 4.5 / COMMAND concept and directed “lets work on it” on 2026-11-03.
  Brief: [BATCOMPUTER-001.md](BATCOMPUTER-001.md). Baseline
  `126e76fa315edfa5c4fdb379d1c5519e5a527f41`; Builder Codex; branch
  `codex/batcomputer-001`; active
  [PR #403](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/403).
- Building a real wide-screen Rotation Command from existing schedule, Whole Picture, Cave Tonight,
  current Engine recommendation and grounded Alfred paths. No Engine/schema/provider/write/phone IA
  change; narrow screens deliberately return to FIELD.
- Implemented the discoverable Rotation Command with schedule timeline, canonical Engine call,
  recorded-change rail, personal-range evidence, source limits and grounded Alfred/Whole Picture/
  FIELD actions. Dedicated Chromium 2/2 PASS at 1440 and 360 px including axe and overflow;
  COMMAND catalog 68/68 PASS; architecture, TypeScript and production/PWA build PASS. Visual
  inspection completed against the generated concept; no bitmap or fictional telemetry ships.
- Independent review blocked head `b55d6291` because the first stylesheet bypassed the locked
  palette with local colors. The repair uses only established BEYOND tokens and keeps red as
  structural authority rather than low-contrast small text; dedicated Chromium/axe is again 2/2
  PASS. The changed head requires renewed exact-head review.
- Renewed review found the actionable Engine status still used small red text while the all-clear
  fixture overrode it. The status words now use accessible text with red retained as the border,
  and a STABILIZE-specific axe case covers that state.
- CI at `3c5f8293` found the catalog's new description redundantly began `COMMAND ·`, violating the
  existing plain-language catalog safeguard. The description is now simply “Whole-rotation desktop
  briefing”; no destination or behavior changed.
- Next: obtain independent exact-head review and required CI, then apply Gavin's standing
  green-gates merge ruling.

---

# ROTATION-FIELD-001 — active 3.0 launch field mission

- Gavin approved activation with “Get after it” on 2026-11-03. Brief:
  [ROTATION-FIELD-001.md](ROTATION-FIELD-001.md). Report-only mission; Gavin operates the real app,
  Codex reconciles evidence. Baseline `100a701ce7a0da9f11631e26c5fe71fdbda4511b`;
  branch `codex/rotation-field-001`; active
  [PR #402](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/402).
- Run the next complete work run through the first full day off. Mandatory checkpoints: final shift
  ends, next wake, full day off.
- Capture evidence through the existing LOG → NOTE path with `FIELD · INCIDENT`, `FRICTION`,
  `MISSING JOB`, or `TRUST GAP`; capture `FIELD · CLEAR` when a checkpoint has no failure.
- No product change is authorized by the mission. Data-integrity/core-loop incidents stop and jump
  the queue; ordinary friction is carried through the rotation to measure recurrence.
- Next: merge the field protocol, then begin on Gavin's next first work night. Completion waits for
  real evidence; tests and simulated days cannot substitute.

---

# BEYOND-AFTER-3-PLAN-001 — merged PR #401

- Gavin directed: “Let's create a plan beyond 3.0 launch. Advance it even further” on 2026-11-03.
  Routine documentation objective; baseline `47d98ceb56496f24cce35cb179c853c41249f020`;
  branch `codex/beyond-after-3-plan`; active
  [PR #401](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/401).
- Live master is clean apart from the existing untracked attachment folder, matches origin, and has
  no active implementation objective. The old 3.0 checklist understated shipped programme, meal
  planning, graph, recovery and Alfred capabilities.
- Added [BEYOND after 3.0](../BEYOND_AFTER_3.md): 3.0 field gate → self-running week → rotation
  intelligence → learning coach → connected body → Batcomputer. It preserves Engine authority,
  local-first truth, explicit confirmation and one-phase-at-a-time gates.
- Reconciled [the 3.0 launch checklist](../BEYOND_3_LAUNCH.md) with master. Partial marks distinguish
  shipped surfaces from field-proven journeys rather than falsely declaring launch complete.
- Immediate recommended objective is `ROTATION-FIELD-001`: use BEYOND through a complete rotation
  and convert observed incidents/friction into the next bounded build.
- Next: review the plan diff, open a documentation PR, require green CI, and merge only under Gavin's
  standing green-gates ruling.

---

# ALFRED-COACH-001 — merged PR #400

- Gavin approved the proposed ALFRED COACH 1.0 direction with “Make it so” on 2026-11-02.
  Protected brief: [ALFRED-COACH-001.md](ALFRED-COACH-001.md). Branch
  `codex/alfred-coach-001`; baseline `8e1d46411b3725ce78c5ee32f9d4b17fa0e931a3`; active
  [PR #400](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/400).
- Current truth already includes Alfred, daily and weekly briefs, whole-history reads, confirmed
  action cards, week/flip/meal planning and debriefs. This objective unifies those capabilities
  rather than creating a second coach or external integration.
- Scope is one NOW / NEXT 7 / REVIEW coach workspace plus debrief and draft adjustment. NOW may
  explain the existing deterministic recommendation but cannot create or rank a competing one;
  plans remain drafts and all writes still require individual confirmation.
- No provider, dependency, schema/event, Engine rule, automatic plan change, notification or
  primary-navigation change.
- Implemented the suit-style coach console, retained every prior starter under deliberate depth,
  and added bounded NOW and REVIEW prompts alongside the existing confirmed weekly-plan path.
  Independent review of head `5126b842` correctly blocked NOW because its promise to explain the
  Engine recommendation was not backed by that canonical record in Alfred's context. The repair
  supplies the exact current recommendation and recorded decision as a provenance-bearing source,
  or explicitly supplies that none is recorded; Alfred remains forbidden to infer a replacement.
  Evidence: TypeScript PASS; Alfred/Week Plan/cost-control Chromium 11/11 PASS; 320/360/412 px
  overflow and axe PASS; recommendation-context integration 10/10 PASS; architecture PASS (418
  files); production/PWA build PASS (49 entries).
- CI at `b49f6684` reached the full browser suite and found four stale locators for specialist
  starters now intentionally placed under MORE THINGS ALFRED CAN DO. Their behavioral assertions
  are unchanged; each now deliberately opens that depth before selecting the existing starter.
- Next: push a PR, obtain independent exact-head review and required CI, then apply Gavin's
  standing green-gates merge ruling.

---

# SUIT-DATA-001 — merged PR #399

- Gavin authorized taking BEYOND's graphs and surrounding data experience beyond on 2026-11-02.
  FEATURE brief: [SUIT-DATA-001.md](SUIT-DATA-001.md). Branch `codex/suit-data-001`; baseline
  `e338eb67a68e57cdffdc93bf8ae6186920836182`; active
  [PR #399](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/399).
- Scope is presentation/read-only inspection across BODY, REVIEW / Whole Picture, VITALS and TODAY:
  one suit-data grammar, stronger touch/keyboard selection, axes, legends, sparse states and
  responsive composition. Existing data meaning, evidence floors, sources and Engine boundaries
  remain unchanged; no dependency or invented telemetry.
- Implemented shared angular instrument frames, plot grids/lines/points, yellow inspected-value
  cursor, exact-value rails and responsive measured-chart framing across the major chart families.
  Weight and BODY inspection use recorded values unchanged; VITALS retains personal bands/off-normal
  semantics; Whole Picture retains keyboard/day/source inspection; TODAY retains existing tables.
- Evidence so far: architecture and TypeScript PASS; Cave browser 5/5, Garmin measured browser 7/7,
  direct 320 px suit-data interaction/axe 1/1 and focused Node 18/18 PASS; production PWA build PASS.
  Existing `BodyInsights.test.tsx` cannot reach assertions because its legacy ESM module mock is no
  longer a mock under the current browser runner. Independent exact-head review passed at
  `45962b85471ca03273591b56f5656a55be933c3c`. CI then exposed two stale Connected Health text
  locators: the new readout deliberately separates date/count and exact value into structured
  children. Their assertions now target the accessible status and independently verify exact value
  plus observation count; no product behavior or data semantics changed. Standalone local execution
  of that legacy suite still collapses at its known ESM mock teardown, while CI reaches its tests.
- Next: push the locator repair, obtain independent exact-head review again and require green CI;
  merge only after the standing green-gates rule passes.

---

# PHONE-POLISH-001 — approved suit elevation (Codex)

- Gavin approved distinct TODAY/TRAIN/DATA/MORE compositions, stronger hierarchy, constructed panels, Gotham atmosphere and action-linked motion: “Approved. Now take it beyond.”
- FEATURE; brief and complete evidence: [PHONE-POLISH-001.md](PHONE-POLISH-001.md).
- Branch `codex/phone-polish-001` pushed; app implementation through `ec09187`, with final test-selector/evidence updates in subsequent commits.
- Final broad run: 3,423 passed / four old menu-selector failures / two skips. Corrected selectors retain all assertions; final affected rerun 45/45 PASS. Separate architecture, TypeScript/PWA build and compiled offline 320/360/412px walkthrough PASS. No single green final full-verify invocation claimed.
- Review [captures and motion](../screenshots/phone-polish-001/README.md) use synthetic records. All four workspaces, confirmations, native disclosures, compact Plan access and Engine authority retained.
- Prior PR creation was blocked by GitHub GraphQL; the current primary chat took the explicit
  handoff, reconciled master through merged PR #397 and opened
  [PR #398](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/398).
- Reconciled evidence: architecture and TypeScript PASS; production/PWA build PASS. Combined
  phone/command/data/Shift Recovery browser run 43/48; the five failures reproduce master harness
  issues (shared IndexedDB closure and legacy ESM mocks), with no visual assertion failure. Isolated
  CI remains authoritative.
- Next: independent exact-head review and remote CI. Gavin's standing 2026-11-02 ruling authorizes
  automatic merge only when both pass at an unchanged head with no unresolved findings.

---

# SHIFT-RECOVERY-001 — merged PR #397

- Gavin approved the bounded Shift Recovery objective on 2026-11-02. Brief:
  [SHIFT-RECOVERY-001.md](SHIFT-RECOVERY-001.md). Branch `codex/shift-recovery-001`; baseline
  `fc94c0da152a0c9de067d6003af3c042ebbe0bf7`; merged PR
  [#397](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/397).
- TODAY now offers optional, read-only recovery context for a recorded final shift, flip toward work,
  first day off or later day off. It reuses saved schedule position plus existing sleep/training
  evidence, states its limits, and never moves commitments, schedules recovery or writes a record.
- No Engine, schema, command/event, provider, dependency, recommendation-priority or primary
  navigation change. Medical claims and generic shift-worker prescriptions are explicitly excluded.
- Local evidence: focused Node 14/14, Chromium component 3/3 including axe, 320 px overflow and
  stale-guidance clearing across the 16:30 lived-day boundary,
  architecture, TypeScript and production PWA build PASS. The repository-wide browser command is
  not a clean signal in this checkout: parallel suites repeatedly close one another's shared
  `beyond` IndexedDB, and standalone `TodayScreen.test.tsx` cannot resolve its existing
  `currentContextQueries` mock target. PR CI, independent exact-head review and separate owner
  merge gate passed.
- Independent review of head `d1547ce7` found two blockers: refresh was hour-keyed rather than
  lived-day-keyed, and a prior brief remained visible while its replacement read was pending. Both
  are addressed by the existing rollover subscription plus an explicit 16:30 key and fail-closed
  loading state. Independent exact-head review then passed at `b20410b0`; required CI was green.
- PR #396's missing Protected review was reconciled post-merge by the established independent
  reviewer at exact head `3c38be9689746291614947e5543c1ddc015b4368`: PASS, 27/27 focused
  Node, 2/2 browser and architecture PASS. The record is a post-merge reconciliation, not a claim
  of retroactive workflow compliance; reviewer-attributed evidence is recorded on PR #396.
- Gavin's standing ruling on 2026-11-02 authorizes automatic merge after green required CI and an
  independent exact-head PASS, with no unresolved findings or head movement. PR #397 then merged
  without bypass as squash `793821b95f612e2f17af2659355294caafc27cff`.

---

# BEYOND-2.0 night campaign — 2026-11-02 (orchestrator: Claude Code; builders: Claude Code, Codex)

- Plan, authorization and rules: [#373](https://github.com/gavinlohnes/neo-beyond-lohnes/issues/373);
  Codex briefs #374–#377. One independent reviewer session reviews every PR; merge on PASS + green CI.
- Merged: #378 BUNDLE-002, #379 FREE-HELPER-002, #380 COMMAND-BAR-001, #381 DRIVE-HOME-001,
  #382 PRESENCE-001, #383 SHIFT-RUN-001, #384 Sync002 timing, #385 CARD-UNDO-001, #386 GYM-SETS-001,
  #387 POST-SHIFT-001, #388 CORRECTIONS-001, #389 NIGHT-POLISH-001, #390 TODAY-RUN-001,
  #391 CALENDAR-EXPORT-001 (Codex), #392 FREE-BRIEF-001. Next with Codex: #375 meal plan, #377 weekly
  debrief, #376 TRAIN programme. Goal after tonight: [BEYOND 3.0 launch checklist](../BEYOND_3_LAUNCH.md).
- Known CI noise: browser tests near 06:00 UTC can meet the real shift-end moment; heavy imports can
  pass 15 s under load (Sync002 now 45 s). Re-run failed jobs; never skip a test.
- Follow-ups: free helper doesn't yet log meals by voice in DRIVE HOME for unknown foods (they become a
  note); on-phone AI model needs Gavin's OK; vite-plugin-pwa 2.0; TODAY "before you go" merge.
- What's new, for Gavin: [NIGHT-2026-11-02.md](NIGHT-2026-11-02.md).

---

# ALFRED-VOICE-001 — Routine, in review (Builder: Claude Code)

- Gavin: the fixed "Ate a McGriddle…" hint should fit him, BEYOND and Alfred. The message box now shows
  one line in Alfred's voice per lived day. Also closes #371 review notes: brief summary's accessible
  name matches its text, stale AlfredWeek comment, ALFRED-003/006 amendment pointers, and TODAY's
  open routine refreshes after a free-helper tick.
- On-phone AI check (Gavin's phone): no built-in browser AI; WebGPU available (Adreno 8xx); ~8 GB
  reported. A downloaded on-phone model is possible but is a new dependency + model download:
  needs Gavin's explicit OK before any work.

---

# Handover — 2026-11-02 (Builder: Claude Code)

- Codex ran out of usage; Gavin: "Finish and merge everything for a good starting point for tonight."
  Claude Code finishes #371 ATTENTION-001 as Builder, within #370's approved scope; no new scope.
- Merged: #365 WEEK-PLAN-001, #367/#368/#369 OPERATOR-CONTEXT-002A/B, #366 FREE-HELPER-001
  (reviewer PASS at 5ffcc1a; free cards now carry #367's recordVersion guard).
- #371: master (#366) merged in; only conflict was UX_DECISIONS (both entries kept). Fresh independent
  exact-head review in a separate reviewer session; merge after PASS + green CI.
- Follow-ups for Gavin to choose: helper single-word loose match (#366 N1); Alfred's planning context
  still lists archived-mission tasks (#365 N1); TODAY "before you go" merge; vite-plugin-pwa 2.0;
  on-phone AI (run CHECK ON-PHONE AI in SYSTEMS first).

---

# ATTENTION-001 — implementation (Builder: Codex)

- Gavin approved [#370](https://github.com/gavinlohnes/neo-beyond-lohnes/issues/370), including
  the two explicit Alfred placement amendments and pleasant Batman Beyond visual direction.
- Protected lane. Branch `codex/attention-001`; baseline `997421b272c7c952864adf63296fd4ac60ade881`.
  Active PR pending. Separate owner merge approval required.
- #369 is merged with Gavin's explicit merge approval; its final PR body supersedes older notes below.
- Primary TODAY puts the existing next/log pair before closed Alfred support; review invitations use
  actual OFF and existing records/readiness. Generation remains mounted independently of disclosure.
- Current-moment routines group into one disclosure. LIFE retains tabs/drafts; one canonical fact
  editor replaces the redundant general-fact form. Legacy evidence/conversion remains available.
- Black-dominant space, BEYOND framing/typography and current brand tokens retained. No Engine,
  command/event/schema/provider/dependency or primary navigation change.
- Verification: Node217 files /2,002 passed /one existing skip; architecture, TypeScript and PWA
  build PASS. Focused browser55/55, then20/20 after final focus/routine/history refinements.
  Actual phase assertions and recovery→OFF display pin are covered; phase changes preserve an
  operator-opened review and closing returns to an available action. Production before/after and
  offline LIFE save/draft walkthrough PASS at320/360/412px; font-settled final capture in progress.
- Independent exact-head review and final CI pending. No field acceptance, live model quality, deployment or merge claimed.
- #366 FREE-HELPER-001 remains Claude Code's branch; do not take it over. Integrate AlfredSheet and
  typed memory action seams separately, preserving #369's source/privacy/confirmation safeguards.
- Next: finish acceptance and visual inspection, publish PR, independent review and green CI.
  Final PR body will carry exact-head evidence and supersede this implementation snapshot.

---

# OPERATOR-CONTEXT-002B — implementation and verification (Builder: Codex)

- Gavin explicitly approved the bounded scope, global personal-fact contract and history retention
  on 2026-11-01. The concise durable brief is [issue #368](https://github.com/gavinlohnes/neo-beyond-lohnes/issues/368).
  Protected lane. [PR #369](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/369).
  Branch `codex/operator-context-002b`; baseline `938e2e06e7e4a20218baee0048ba86f6768ccffc`.
- #367 (002A) is merged under separate owner approval; its final PR body supersedes the older notes below.
- New personal facts use MEMORY_RECORDED globally; old fact kinds retain day guards. People/Home
  and remember cards use the same lifecycle. STOP USING retains history. Legacy FORGET remains
  physical deletion until individually previewed/confirmed conversion; original evidence stays local.
- Common context and search expose active destination wording only. No Engine, schema version,
  provider, dependency, recommendation, TODAY or navigation change. New backups require a build
  that understands PERSONAL_FACT; originals remain in exports, not model context.
- Verification so far: full Node 217 files / 2,001 passed / one existing skip; architecture PASS;
  TypeScript PASS. Focused Chromium run found and fixed a long-original phone overflow and stale
  conversion-list refresh. Focused Chromium acceptance: 38/38 across eight files, including
  stale conversation/privacy and cards. Built-PWA offline reload, dayless capture, retire/restore,
  source inspection and 320/360/412px overflow checks PASS; zero page errors. Latest metadata/tool
  reference refinements still need exact-head CI; no live provider or real phone acceptance claimed.
- Review findings addressed: personal-fact cards now bind displayed wording atomically, and cached
  briefs hide changed sources offline, discard in-flight stale answers and retain the ten-minute
  request gate. Focused brief/privacy/cost browser checks 17/17; independent lifecycle Node 46/46.
- Independent exact-head review, final required CI and separate Gavin merge approval pending.
  No merge or field acceptance claimed. Final PR body will carry exact-head evidence/status.
- #366 FREE-HELPER-001 is still Claude Code's branch. No takeover. Coordinate typed memory
  reference semantics if its helper parser proposes legacy `forget` for a new personal fact.
- Next: complete browser/build proof, publish PR, obtain independent exact-head review and green CI.

---

# OPERATOR-CONTEXT-002A — draft PR #367 (Builder: Codex)

- Gavin approved the first bounded advancement objective on 2026-11-01.
  [Brief](OPERATOR-CONTEXT-002A.md). Protected context/privacy contract; no memory migration or Engine change.
- Branch `codex/operator-context-002a`, baseline `f23668a` (#365), [PR #367](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/367).
- Shared read-only source projection, bounded request assembly and local LIFE/Memory inspection built.
  Both memory lifecycles remain distinct; existing purpose-specific sharing and atomic cards retained.
- Verification: focused Node30/30; full Node216 files, 1,995 passed / one existing compile-time skip;
  TypeScript, architecture, risk classification and production/PWA build PASS (existing chunk warning).
- Independent source review PASS at `7a4b5a694cc01edb490d8bc2f3f43d95d50d3b52`, reviewer18/18 Node.
  Initial BLOCK findings fixed: outside-change receipt bypass, unmeasured steps as zero, old-day citations.
  [Review record](reviews/OPERATOR-CONTEXT-002A.md). Final copy/tests/docs need exact-head confirmation.
- Browser acceptance: local execution blocked by absent Chromium and invalid official downloads.
  CI installed Chromium and is running the full suite. New 320/360/412px, offline, editor, stale-save,
  oversized-request and old-day citation browser regressions are not yet claimed passed.
- #366 FREE-HELPER-001 remains Claude Code's work; no takeover. Check helper integration after its separate merge.
- Next: final exact-head review + green required CI, resolve any findings, then Gavin's merge decision.
  No live-model quality, phone field acceptance, deployment or merge claimed.

---

# WEEK-PLAN-001 — in review (Builder: Claude Code)

- Merged since the campaign: #361 UX-POLISH-001, #362 LIFE-HUB-001, #363 REVIEW-NITS-001, #364 DEPS-002.
- Gavin: "We will do plan my week Now". [Brief](WEEK-PLAN-001.md). Feature lane, no schema.
- Held for his separate OK: TODAY "before you go" merge; vite-plugin-pwa 2.0 upgrade (10 build-time advisories).

---

# PERSONAL-OS campaign — end of 2026-10-31 (Builder: Claude Code)

Merged today (each with an independent reviewer session, green CI, Gavin's merge or his "merge for me"):
#353 PERSONAL-CONTEXT-001 · #354 PROJECTS-001 · #355 RELATIONSHIPS-001 · #359 BUNDLE-001 ·
#358 ALFRED-COST-001 · #357 ROUTINES-001 (schema v19, one TODAY row) · #360 HOME-001.

Open: #356 PROJECTS-001 review follow-up (branch `ccr-0be4f40f-16m0ja`, this checkpoint rides on it).
Its reviewer found no problems but posts only on Gavin's own word: he types "post it" in the reviewer
chat "Review PR #354 — PROJECTS-001". Then green CI, then Gavin merges.

State to know:
- Main bundle about 1.86 MB of the 2 MiB offline precache limit; split more MORE screens before it's tight.
- Every Alfred-proposed date must be a real calendar date (`isRealDate`); Alfred's repeat rules are anchored.
- Known limit: monthly jobs on the 29th–31st skip short months (RFC 5545).
- GitHub reports 7 dependency advisories (1 high) on master; untouched; a dependency change needs Gavin's OK.
- Live Alfred quality, real API cost and on-phone use of today's features are unmeasured.

Next: Gavin uses it on shift (limit, pre-shift routine, one birthday, one project, one home job) and
reports friction. Then one of: WEEK-PLAN-001 (place project steps, people dates and home jobs on days
via planned-date cards; no schema), or a dependency audit for the 7 advisories.

---

# PERSONAL-CONTEXT-001 — merged as #353 (2026-10-31)

- Authority: Gavin, 2026-10-31: handed PERSONAL-CONTEXT-001 and the PERSONAL-OS campaign to
  Claude Code ("finish it rather than starting over"). Brief approval ("Let's get after it") stands.
- Branch `ccr-0be4f40f-16m0ja` = Codex's `codex/personal-context-001` (`cb07b1b`) merged with
  no changes to its source, plus the existing one-line FullShift test budget (#353). PR #353 now
  carries the whole slice. Master `f001049` (#352) already integrated; merged cleanly.
- Claude's check: read the source diff (context catalog, opt-in sharing, atomic card guards,
  search exclusions); typecheck and focused suites (22 tests) green; full verify run before push.
- Review 1 (`3a356a2`): BLOCK, because a confirmed "remember" card reset the conversation. Fixed with tests;
  low/info findings handled (failed-send notice; no-downgrade note in brief). Re-review requested.
  Gavin: "If it passes just merge" (merge approval for #353, conditional on review PASS + green CI).
- Remaining: independent exact-head re-review, green CI, then merge. Live Claude quality, API
  cost and phone behavior unmeasured until he uses it.
- Next after merge: reset branch onto master; tune from real conversations; then propose the
  first campaign journey (Goals & Projects, design parked on `codex/goals-projects-design`).

---

# PERSONAL-CONTEXT-001 — handoff to Claude Code, built and verified

- Authority: Gavin's “Let's get after it” approves the bounded connected-context slice;
  guilt-free Delta-inspired voice. PROTECTED. Gavin explicitly transferred ownership to Claude Code:
  “Wrap up. We are handing it over to Claude Code.” Codex stops implementation. No merge authorized.
- Branch `codex/personal-context-001`; baseline `20743ae`, integrated master #352 `f001049`.
  [Brief](PERSONAL-CONTEXT-001.md) · [Claude handoff](PERSONAL-CONTEXT-001-HANDOFF.md). PR pending: GitHub GraphQL/REST return Forbidden; git works.
- Built: local direction/constraint revisions in Personal Understanding → My context; existing
  Mission/memory source catalog, explicit per-conversation sharing, current-record inspection
  and canonical editor navigation. Fresh sensitive context resets model history. Confirmed
  existing commands guard each card's own day/task/source snapshot atomically.
- Verification at source `579ae55`: full `npm run verify` PASS, architecture374 files,
  362 test files passed / one skipped; 3,226 tests passed / two existing skipped; TypeScript,
  production build and PWA pass. Full suite 613.82s. Existing bundle-size warning remains.
- Independent exact-source review PASS; [review record](reviews/PERSONAL-CONTEXT-001.md).
  Reviewer independent node8/8 PASS. Exact3ed0b02 PASS is on GitHub as
  `refs/notes/personal-context-001-review`. This subsequent handoff is docs-only and needs
  exact-head confirmation before integration; verified source/tests remain identical579ae55.
- [Built PWA proof](../screenshots/personal-context-001/README.md): four sizes, offline reload,
  local capture/source inspection, reduced motion at390; synthetic records/mocked replies.
  Live Claude response quality, real API cost and physical-phone behavior are unmeasured.
- Master #352 weekly review/shared memory preserved. Its automatic prep/recovery context stays;
  new Mission/direction/constraint sources remain outside automatic briefs/reviews. No own
  Engine, schema, dependency, workflow or protected-fixture change relative to fresh master.
- Next (Claude): fetch/check overlap, renew docs-only exact-head review, use Claude’s GitHub
  access to open the existing branch PR, require green CI, then Gavin decides merge.
  No CI/deployment/merge claim. No source rebuild or new objective required.

---

# PERSONAL-OS-001 — connected personal understanding (design only)

- Authority: Gavin clarified MiLyfe/LifeOS/personal-OS references, approved research/design,
  then “Begin”, 2026-10-31. Codex; no production implementation or merge authorized.
- Baseline: fresh master `20743ae`; branch `codex/personal-os-design`.
- [Research/design proposal](PERSONAL-OS-001.md): pinned source inspections, license
  dispositions, current BEYOND gap map and proposed PERSONAL-CONTEXT-001 first journey.
- Communication: [Delta-inspired, guilt-free design](ALFRED-COMMUNICATION-DESIGN.md).
  Owner explicitly rejects guilt; detailed voice remains proposed. Fresh literature access
  blocked (403); references and evidence limits recorded, no production prompt change.
- Earlier Goals & Projects design remains preserved on `codex/goals-projects-design`
  (`2e6c502`), parked after owner clarified broader connected personal-OS intent.
- Findings: TELOS pattern fits; no wholesale harness import. Alfred initial context omits
  Missions/MEMORY-001 and stays fixed within a session; use existing source records/commands.
- Evidence: four external repository snapshots inspected; no donor code copied or executed;
  documentation-only checks. No production tests or live external-app validation claimed.
- Open work/CI: GitHub API access denied; active implementation ownership not assumed absent.
- Next: Gavin reviews bounded personal-context-to-planning design. Implementation and any
  new event/store/Alfred contract changes need approval, overlap check and independent review.

---

# ALFRED-006/007 — weekly review writes itself; memory joined; Ask Alfred in more places

- **Authority / Builder / lane:** Gavin, 2026-10-31 ("What do we do now?… we have until 0800").
  Claude Code; Protected within the owner's go (additive schema v17 `alfredReviews`). Brief:
  `docs/agent/ALFRED-006.md`. Branch `ccr-0be4f40f-16m0ja`.
- **Built:** a real-data phone-size walk of tonight's screens (fixed Alfred's footer wrap); the
  weekly review Alfred writes once a week, on TODAY until GOT IT and kept in MONTH; ALFRED REMEMBERS
  in MORE → MEMORY (People, Money and bills…) beside MEMORY-001, which Alfred now reads too; ASK
  ALFRED in the Garmin sheets and after a workout.
- **Next:** CI and Gavin's merge. Then from the roadmap: reminders at an exact time of day, and
  real-phone tuning after a week of use.

# GARMIN-AUTO-001 — Garmin checks itself every 3 hours

- **Authority / Builder / lane:** Gavin, 2026-10-31 ("Yes, auto sync every few hours"). Claude Code;
  Protected within the owner's go (new background permission, WorkManager dependency, Bridge CI
  allowlist). Branch `ccr-0be4f40f-16m0ja`, with ALFRED-005 and BRIDGE-MOMENTS-002 in PR #351.
- **Built:** Health Bridge 0.10.0's 3-hourly background check and one-tap notification on new sleep;
  BEYOND imports the Bridge's own sends straight away after a first SYNC GARMIN.
- **Next:** CI (PR Verification + Health Bridge), Gavin's merge, install 0.10.0, tap ALLOW ACCESS AND
  READ once and allow "Access data in background".

# Follow-ups after #350 — test harness fix, roadmap, Alfred's month spend

- **Authority / Builder / lane:** Gavin, 2026-10-31 ("Just keep building and working through the
  list"). Claude Code; Routine. Branch `ccr-0be4f40f-16m0ja`.
- **Built:** awaited `unmount()` in Boot001/Alfred003 (later renders in Boot001 were blank, so two
  tests passed vacuously); the roadmap records tonight's Alfred work; Alfred's sheet shows this
  month's estimated spend (ALFRED-005); open tasks due this week notify through the Bridge at 16:00
  on their day (BRIDGE-MOMENTS-002).
- **Next:** CI and Gavin's merge; then his pick from the roadmap's next candidates.

# BOOT-ONCE-001 — the launch brief shows once per lived day

- **Authority / Builder / lane:** Gavin, 2026-10-31 ("having it pop up every time I open it or
  refresh it is too much"). Claude Code; Routine (presentation of an approved screen). Branch
  `ccr-0be4f40f-16m0ja`.
- **Built:** the launch brief plays on the first launch after 16:30 and is remembered on the phone.
- **Next:** CI and Gavin's merge. ALFRED-003/004, MONTH-001 and BRIDGE-MOMENTS-001 merged in #349;
  Gavin installed Health Bridge 0.9.0.

# ALFRED-004 — Alfred remembers, reads the whole history, talks back, plans

- **Authority / Builder / lane:** Gavin, 2026-10-31 ("I like all of the ideas… Make it so"). Claude
  Code; Protected within the owner's go (additive schema v16). Brief: `docs/agent/ALFRED-004.md`.
  Branch `ccr-0be4f40f-16m0ja`, with ALFRED-003 in PR #349.
- **Built:** memory with Forget; search_records and get_days read tools; Speak answers and hands-free
  send; DEBRIEF MY SHIFT; weekly review, flip, meal plan and grocery starters; log-urge card; MONTH
  in DATA's cave with sleep owed; "Ask Alfred" on a day and on every vital.
  Health Bridge 0.9.0: notifications at the key moments around each shift and a home-screen widget
  with Alfred's brief, both fed by SYNC GARMIN.
- **Next:** CI (PR Verification + Health Bridge), Gavin's merge, install Bridge 0.9.0, tap SYNC
  GARMIN once to arm the moments, add the widget.

# ALFRED-003 — cheap everyday Alfred, his brief on TODAY, Alfred can do it

- **Authority / Builder / lane:** Gavin, 2026-10-31 ("go cheap + 1 and 2"). Claude Code; Protected
  within the owner's go. Brief: `docs/agent/ALFRED-003.md`. Branch `ccr-0be4f40f-16m0ja`; follows
  ALFRED-002 (#348, merged).
- **Built:** everyday answers on the cheaper model with THINK HARDER for deep ones; Alfred's brief at
  the top of TODAY; new cards for check-in, started work, work ended, task done or moved, clean day, open TRAIN.
- **Verified:** `npm run verify` green (3,191 passed).
- **Next:** CI and Gavin's merge; he reads TODAY's brief on his phone; then notifications at key moments and Alfred's memory.

# ALFRED-001 — the man in the chair (and RULES-2026-10-31)

- **Authority / Builder / lane:** Gavin, 2026-10-31 ("approve the new rules"; Alfred via the Claude
  API). Claude Code; Protected within the owner's go. Brief: `docs/agent/ALFRED-001.md`. Branch
  `ccr-0be4f40f-16m0ja`.
- **Built:** the rule amendments (online allowed, Alfred core, Anthropic approved, notifications at
  key moments); Alfred v1 — header and LOG entry, voice or text, answers from BEYOND's records,
  proposes logs/reminders/notes as cards the owner confirms.
- **Verified:** `npm run verify` green (3,182 passed); the Claude SDK loads lazily, keeping the start-up bundle under the precache limit.
- **Next:** Gavin adds his Claude key on the phone and tries it; then notifications and timed reminders.

# SLEEP-WINDOW-001 — "last night" reaches 36 hours

- **Authority / Builder / lane:** Gavin, 2026-10-31 (sleep in DATA but not TODAY). Claude Code;
  Routine (a display window aligned to the existing 36-hour rule; a Bridge display fix). Branch
  `ccr-0be4f40f-16m0ja`.
- **Built:** `lastNight` reaches 36 hours (was 24); Health Bridge 0.8.1 keeps the per-kind freshness
  line after a send.
- **Verified:** `npm run verify` green (3,178 passed); Bridge builds in Health Bridge CI.
- **Next:** CI and Gavin's merge; Gavin reads the Bridge's freshness line after a sync. If sleep,
  steps or resting HR read "Behind", Garmin Connect's Health Connect write access for that kind is off.

# SYNC-002 — SYNC GARMIN is one tap

- **Authority / Builder / lane:** Gavin, 2026-10-31 ("Go A"). Claude Code; Protected within the
  owner's go. Brief: `docs/agent/SYNC-002.md`. Branch `ccr-0be4f40f-16m0ja`.
- **Built:** SYNC GARMIN's tap lets the Bridge's files import straight away; TODAY says what came or
  that Garmin is behind; Health Bridge 0.8.0 sends straight to BEYOND.
- **Verified:** `npm run verify` green (3,178 passed). Kotlin builds and tests in Health Bridge CI.
- **Next:** CI (PR Verification + Health Bridge), Gavin installs Bridge 0.8.0 and merges. Open:
  Garmin Connect → Health Connect gaps on the owner's phone (settings check).

# CITY-FIX-001 — TODAY's city stands under the timeline

- **Authority / Builder / lane:** Gavin, 2026-10-30, from his phone: "The clock and building and
  search light are not looking correct." Claude Code; Routine (a display repair, same scene, no
  doctrine change). Branch `ccr-0be4f40f-16m0ja`.
- **Built:** the beam, skyline and perch moved into the hero's scene under the timeline (ModeScene),
  so on shift the COMMS and SHIFT rows no longer cover them, and without those rows they no longer
  rise into the timeline's labels. The COMMS line keeps its full height above the SHIFT row.
- **Verified:** `npm run verify` green (3,173 passed); `tests/browser/CityFix001.test.tsx` fails
  without the fix.
- **Also built (BOOT-BRIEF-001, owner chose option A):** the launch screen is a readable startup
  brief (mode, shift, sleep, protein, backup when due), held about 2.6 s, tap to skip.
- **Open from the same report:** sleep and resting HR not showing (needs the owner's Health Bridge
  check or a fresh backup).
- **Next:** CI and Gavin's merge.

# FOOD-001 — MEAL works like MyFitnessPal, protein first

- **Authority / Builder / lane:** Gavin, 2026-10-30 ("make it closer to my fitness pal"; protein
  left, by time, barcode yes). Claude Code; Protected within the owner's go. Brief:
  `docs/agent/FOOD-001.md`. Branch `ccr-0be4f40f-16m0ja`.
- **Built:** MEAL's diary header, SEARCH ALL FOODS (USDA), amount by grams or servings, SCAN BARCODE
  (Open Food Facts), any number of servings.
- **Verified:** `npm run verify`: 3,171 tests passed; build and typecheck green after a test-typing fix.
- **Next:** CI and Gavin's merge; a real-phone check of the camera scan (Chrome on Android).

# END-OF-RUN-001 — the after-action reads a run as it was lived

- **Authority / Builder / lane:** Gavin, 2026-10-29 ("merge 340 and go end of run"). Claude Code;
  Protected within the owner's go. Brief: `docs/agent/END-OF-RUN-001.md`. Branch
  `ccr-0be4f40f-16m0ja`.
- **Built:** the existing AFTER ACTION now covers only the run's own lived days, counts real
  workouts, and adds sleep by night, fuel, and open tasks.
- **Verified:** `npm run verify` green (3,163 passed).
- **Next:** CI and Gavin's merge.

# SLEEP-001 — main sleep is one tap after a shift

- **Authority / Builder / lane:** Gavin, 2026-10-29 ("merge 339 and go sleep"). Claude Code;
  Protected within the owner's go. Brief: `docs/agent/SLEEP-001.md`. Branch `ccr-0be4f40f-16m0ja`.
- **Built:** the sleep draft counts from the scheduled shift end when WORK ENDED / Shift Down
  weren't tapped; it reads "Slept 06:00 → 13:40?" and is the "Did you sleep?" card, so one tap logs.
- **Verified:** `npm run verify` green (3,161 passed).
- **Next:** CI and Gavin's merge.

# OWNER-GO-001 — the field study's protected fixes

- **Authority / Builder / lane:** Gavin, 2026-10-29 ("Go." and "delete or undo … can go away").
  Claude Code; Protected within the owner's go. Brief: `docs/agent/OWNER-GO-001.md`. Branch
  `ccr-0be4f40f-16m0ja`.
- **Built:** quiet log confirmations; LOG in the bottom bar; short PREFLIGHT and STARTED WORK →
  ON SHIFT; rotation needs a working set; check-in SAME AS LAST with a one-line outcome.
- **Verified:** `npm run verify` green (3,157 passed).
- **Next:** CI and Gavin's merge; a phone check of the new bottom bar.

# REAL-DATA-001 — fixes from the owner's real backup

- **Authority / Builder / lane:** Gavin, 2026-10-28 ("Use whatever is beneficial for beyond").
  Claude Code; Routine. Brief: `docs/agent/REAL-DATA-001.md`. Branch `ccr-0be4f40f-16m0ja`.
- **Built:** task card DONE / NOT A TASK / NEW DATE; exercises shown before START; TRAIN's LAST
  skips empty completions; an idle workout no longer takes the launch; one WORK ENDED after a
  shift with the owner's plan first; DATA shows Garmin's last night when nothing is logged.
- **Verified:** `npm run verify` green (3,174 passed).
- **Next:** CI and Gavin's merge. Protected items listed in the brief wait for his word.

# WHOLE-PICTURE-IN-DATA — DATA's Whole Picture stays in DATA

- **Authority / Builder / lane:** Gavin, 2026-10-28 ("merge 336 when green and go whole picture").
  Claude Code; Protected (navigation, amending FIELD-AUTHORITY-001's COMMAND note). Branch
  `ccr-0be4f40f-16m0ja`.
- **Built:** the existing `WholePicture` renders inside DATA behind BACK TO DATA, and focus
  returns to the button that opened it. Retapping DATA or opening a cave view closes it. MORE //
  REVIEW still shows Whole Picture as before.
- **Verified:** `npm run verify` green (3,168 passed).
- **Next:** CI and Gavin's merge, then decide what's next together.

# MORE-TRIM-001 — MORE shows each destination once

- **Authority / Builder / lane:** Gavin, 2026-10-28 ("merge 335 and trim MORE next"). Claude
  Code; Protected (it amends FIELD-AUTHORITY-001's COMMAND rows; no capability is removed).
  Branch `ccr-0be4f40f-16m0ja`.
- **Built:** 27 duplicate rows are search-only, so the browse list goes from 50 to 23 rows.
  Empty job rows (Log) are hidden. The test helper reaches search-only rows by search.
- **Verified:** `npm run verify` green (3,168 passed).
- **Next:** CI and Gavin's merge. Still open: keep DATA's WHOLE PICTURE inside DATA, and move LOG
  to the header (NAV-001).

# AUDIT-FIX-001 — fixes from the whole-app audit

- **Authority / Builder / lane:** Gavin, 2026-10-28 ("go audit fixes"). Claude Code; Routine
  (presentation and copy only, no Engine, event or schema change). Branch `ccr-0be4f40f-16m0ja`.
- **Built:**
  - TODAY no longer says "Nothing's waiting" while water or protein is behind pace: the headline
    reads "Nothing urgent." and the context names what's behind;
  - PREPARE FOR WORK is hidden once on shift;
  - TRAIN's COMPLETE button wraps instead of clipping;
  - IMPORT HEALTH DATA uses a CHOOSE HEALTH FILE button, not the browser's grey file picker;
  - the SLEEP page shows a night's logged main sleep when Garmin missed it, labelled "logged";
  - contrast: selected chips on shift, links on MORE, and an invalid aria attribute.
- **Verified:** `npm run verify` green (3,168 passed). The audit crawler is clean across 85 screens.
- **Next:** CI and Gavin's merge. Still open, and each needs his go: trim MORE (56 entries), keep
  DATA's WHOLE PICTURE inside DATA, and move LOG to the header (NAV-001).

# BRAND-MARK-003 — Brand Drop v2: the emblem and the palette

- **Authority / Builder / lane:** Gavin, 2026-10-28, Brand Drop v2 plus the palette decision (it
  supersedes the split-bat Drop). Claude Code; Protected (doctrine amended by the owner's own
  decision). Branch `ccr-0be4f40f-16m0ja`.
- **Built:**
  - the emblem SVGs in `docs/brand/beyond-emblem/`, chamfer 80/512;
  - the `--brand-yellow` and `--black` tokens;
  - the `Emblem` plate as the in-app logo everywhere;
  - `beyond-v3-*` icons for maskable, any, monochrome, apple-touch and favicon;
  - service-worker cache `beyond-mark-v3`;
  - every bat and split-bat asset removed.
- **Next:** CI and Gavin's merge. Then install on the phone to check the home-screen icon, the
  splash and the themed icon.

# SHIFT-CHANGE-001 — the end of a shift, given the whole screen once

- **Authority / Builder / lane:** Gavin, 2026-10-28 04:18 on shift ("Am."). Claude Code; PROTECTED
  (TODAY composition, presentation only). Branch `ccr-0be4f40f-16m0ja`.
- **Built:**
  - `buildShiftChange`: LANDING runs for the last 45 minutes and SECURED for 3 hours after the real
    end;
  - a full-screen moment on TODAY, shown once per shift and phase;
  - the rehearsal covers 05:30 and 06:30 on eight weeks of rotation;
  - STARTED WORK: a one-tap `WORK_PERIOD_STARTED` on TODAY and in PREFLIGHT, and the brief and the
    shift end count from it;
  - a late "work ended" tap no longer stretches the shift (CI caught "19:30 on the clock").
- **Verified:** `npm run verify` green (3,160 passed).
- **Next:** Gavin's merge before about 05:15. Then a pre-shift version, if he wants it.

# LOG overlap — the floating + steps aside while you scroll

- **Authority / Builder / lane:** Gavin, 2026-10-28: "Fix the LOG button overlap". Claude Code;
  ROUTINE. Branch `ccr-0be4f40f-16m0ja`.
- **Baseline:** master after #328 (FIELD-REHEARSAL-001).
- **Built:** `useScrollAway` on TODAY's floating LOG, which steps aside when you scroll down and
  comes back when you scroll up, reach the end or return to the top. The rehearsal now checks this,
  and checks that nothing is covered at the end.
- **Verified:** `npm run verify` green (3,151 passed).
- **Next:** CI and Gavin's merge.

# FIELD-REHEARSAL-001 — the suit, walked on eight weeks of rotation

- **Authority / Builder / lane:** Gavin, 2026-10-28: "Make it count and do some amazing stuff."
  Claude Code; ROUTINE (corrections and a test). Branch `ccr-0be4f40f-16m0ja`.
- **Baseline:** master `8401f3d` (#327 SUIT-VOLUME-001 merged).
- **Built:** a real-Chromium rehearsal that seeds 56 days of the real 2-2-3 pattern through the app's
  commands, then walks TODAY, all seven cave views, TRAIN and MORE. It runs before a shift, on shift
  and on a day off, at 360px and 390px.
- **Fixed from it:**
  - on-shift primary buttons failed AA (4.03:1 before, 6.32:1 now);
  - VITALS painted days off amber on a work day;
  - PREFLIGHT read "pack · food";
  - the first day off read "no full day off since".
- **Next:** CI and Gavin's merge.

# SUIT-VOLUME-001 — flashy on action, calm at rest

- **Authority / Builder / lane:** Gavin, 2026-10-28: "Go volume. But make it bigger." Claude Code;
  PROTECTED (TODAY composition, presentation only). Branch `ccr-0be4f40f-16m0ja`.
- **Baseline:** master `c8822be` (#326 BRAND-MARK-002 merged).
- **Built:**
  - one accented suit band on TODAY;
  - the beam sweeps once and never loops;
  - commit feedback on the cave BRIEF's saves;
  - VITALS bars above your usual read off-normal;
  - the volume table, recorded in SUIT-VOLUME-001 and UX_DECISIONS.
- **Next:** CI and Gavin's merge. Then live use for a shift cycle.

# BRAND-MARK-002 — the split bat is BEYOND's mark and app icon

- **Authority / Builder / lane:** Gavin, 2026-10-28, Routine Drop ("Brand mark Drop (Routine). Queue
  after D4."). Claude Code; ROUTINE. Branch `ccr-0be4f40f-16m0ja`.
- **Baseline:** master `44ded85` (#325 D4 + D5 merged; CAVE-DATA is complete apart from stages).
- **Built:**
  - Gavin's three SVGs in `docs/brand/suit-mark/`, using the HUD red `#D0141B` and black.
  - The in-app bat uses the icon cut in the header and cave, and the hairline cut at boot.
  - New `beyond-v2-*` icons at 192, 512, 512 maskable, 180 apple-touch, and the 32px and SVG
    favicons.
  - The manifest lists "any" and "maskable" separately, and the service worker has a new cache id
    (`beyond-mark-v2`).
  - The old icons and their generators are removed.
- **Verified:** `npm run verify` green. The built manifest and service worker carry only `beyond-v2`
  icons. A preview with a circle mask shows the bat uncropped and the split visible at 48px.
- **Next:** CI and Gavin's merge. Then install on the phone to confirm the home-screen icon. If
  Android still shows the old one, remove and re-add the app.

# CAVE-DATA D4 + D5 — since last shift in TONIGHT; resting HR and steps in VITALS

- **Authority / Builder / lane:** Gavin, 2026-10-28: "If we can get D4 and D5 done…" (this is also
  DELTA-002's slice go). Claude Code; PROTECTED (CAVE-DATA-001). Branch `ccr-0be4f40f-16m0ja`.
- **Baseline:** master `fb6230c` (#324 D3 merged).
- **Built:**
  - TONIGHT leads with SINCE LAST SHIFT: up to four facts (the shift and days off since, nights
    against your usual sleep, last workout, and weight change). Each opens its records.
  - Questions as buttons: WHY THIS? and WHAT'S NORMAL FOR ME?
  - VITALS adds RESTING HR and STEPS, which are Garmin daily readings, informational only.
- **Verified:** `npm run verify` green (3,142 passed, 1 skipped).
- **Deferred:** sleep stages against your usual, because the rows carry no stages. "What would help
  most?", because ranking factors is Protected.
- **Next:** CI and Gavin's merge. The CAVE-DATA plan is then complete apart from stages. Gavin's
  brand-mark SVG Drop (three SVGs) is waiting on the files reaching the session.

# CAVE-DATA D3 — FILE carries YOUR ROTATION

- **Authority / Builder / lane:** Gavin, 2026-10-28: "Go with number and start d3. Merge when ready."
  Claude Code; PROTECTED. [Brief](CAVE-DATA.md).
- **Baseline:** master `75f4e73` (#323 D2 merged).
- **Decided:** DATA opens on NUMBERS.
- **Built:**
  - FILE shows YOUR ROTATION, the same view as Whole Picture's, in place of its duplicate table.
  - NUMBERS' YOUR ROTATION opens FILE in place, and a tapped day opens in DATA.
  - OPEN WHOLE PICTURE in FILE.
- **Next:** CI, then merge (Gavin: "merge when ready"). Then D4 (DELTA in TONIGHT; needs DELTA's slice
  approval) or D5 (resting HR, steps and stages as vitals).

---
# CAVE-DATA D2 — VITALS carries each reading's page

- **Authority / Builder / lane:** Gavin, 2026-10-28, "D2 next" (CAVE-DATA-001). Claude Code; PROTECTED.
  [Brief](CAVE-DATA.md).
- **Baseline:** master `b2ec540` (#322 D1 merged).
- **Built:** VITALS shows sleep's D/W/M/Y page (shared with TODAY's sheet) and protein's and water's
  7/28/90 pages inline.
- **Open question for Gavin:** should DATA open on TONIGHT? It conflicts with NAV-001's two-tap paths
  (42 tests). DATA stays on NUMBERS until he decides.
- **Next:** CI and Gavin's merge; his default-view choice; then D3 (FILE absorbs YOUR ROTATION).

---
# CAVE-DATA D1 — the cave is DATA

- **Authority / Builder / lane:** Gavin, 2026-10-28, option A (CAVE-DATA-001). Claude Code; PROTECTED
  (amends NAV-001's DATA). [Brief](CAVE-DATA.md).
- **Baseline:** master `dbccca9` (#321 S8 merged; the SUIT-ALIVE build plan is complete).
- **Built:** DATA's page is the cave's first view, NUMBERS. Every cave entry (TODAY's bands, SYSTEMS's
  readings) opens DATA's cave on its view. The second cave in SYSTEMS is gone. S7's wrong "sleep
  stages not known" line is fixed.
- **Next:** CI and Gavin's merge. Then D2 (VITALS absorbs the per-number pages; DATA opens on TONIGHT).

---
# SUIT-ALIVE S8 — suit systems, vision and the log

- **Authority / Builder / lane:** Gavin, 2026-10-28. He ruled night vision may be automatic and cloak
  is only on his word (SUIT-ALIVE-007). Claude Code; PROTECTED (presentation; no Engine, schema or
  event change). [Brief](SUIT-ALIVE.md#s8--suit-systems-vision-and-the-log).
- **Baseline:** master `b0f4317` (#320 S7 merged).
- **Built:**
  - Vision: AUTO (night from midnight on shift), NORMAL, THERMAL and NIGHT, stored on this device,
    with AA holding.
  - CLOAK in SYSTEMS → SUIT SYSTEMS, entered only when pressed.
  - The cave's LOG: COMMS rebuilt from records, plus the RECORDER.
- **Next:** CI and Gavin's merge. That completes the SUIT-ALIVE build plan (S1–S8). Then live use.

---
# SUIT-ALIVE S7 — the cave, File

- **Authority / Builder / lane:** Gavin, 2026-10-28, "go S7" (SUIT-ALIVE-006). Claude Code; FEATURE,
  read-only. [Brief](SUIT-ALIVE.md#s7--the-cave-file).
- **Baseline:** master `8441d1b` (#319 checkpoint merged).
- **Built:** the cave's FILE view. The case file shows findings only once their floor is met.
  Calibration rates each usual range FIRM, BUILDING or THIN, with a "not known" list. The whole-run
  table shows each place in a run. It reuses Personal Understanding's query and links to it.
- **Next:** CI and Gavin's merge. Then S8 (Protected; needs the night-vision and cloak-default rulings).

---
# SUIT-ALIVE — S1–S6 merged; paused for live use (2026-10-28)

- **State:** S1–S6 are all on master: #313/#314 (the bat), #312 (VITALS), #315 (comms and TONIGHT),
  #316 (ROUTE), #317 (pace and the dark cockpit) and #318 (BRIEF: preflight and after-action). Rulings
  are SUIT-ALIVE-001 to SUIT-ALIVE-005 in `docs/UX_DECISIONS.md`. The brief is
  [SUIT-ALIVE.md](SUIT-ALIVE.md). There are no open PRs and no scheduled check-ins.
- **Verification:** the last full `npm run verify` (S6) passed 3,125 tests with 1 existing skip.
  Architecture checks and the production build are OK, and CI was green on every merge.
- **Owner direction:** wrap up and run real shifts. Pace, usual sleep and wake, and the usual ranges
  appear only after 10 same-kind days (3 Garmin-timed days for the route's usual sleep and wake), so
  early days will say "still learning".
- **Remaining risks:**
  - The comms line, route and brief add reads to TODAY: Whole Picture, plus up to 28 days of entries
    for pace, loaded once per day.
  - Hero height is held by swapping lines, not stacking them. Watch the fold on long cards.
- **Next, each on Gavin's go:**
  - S7 (case file, calibration and whole-run table): coordinate with Codex's Personal Understanding first.
  - S8 (cloak, thermal and night vision, comms history): Protected, and needs the night-vision and
    cloak-default rulings.
  - Deferred: a break time on the schedule (schema change).

---
# SUIT-ALIVE S6 — preflight and after-action

- **Authority / Builder / lane:** Gavin, 2026-10-28, "go S6 and make it bigger" (SUIT-ALIVE-005). Claude
  Code; FEATURE plus the TODAY band. [Brief](SUIT-ALIVE.md#s6--preflight-and-after-action).
- **Baseline:** master `79fcaed` (#317 S5 merged).
- **Built:** the cave's BRIEF view. PREFLIGHT has a T-minus clock and a GO/HOLD/LATE/ADVISORY poll
  that is auto-ticked by logs, with inline packing and handoff actions. AFTER-ACTION puts planned
  beside actual. TODAY's band shows PREFLIGHT or DEBRIEF for 3 hours either side of the shift.
- **Next:** CI and Gavin's merge. Then S7 (coordinate with Codex) or S8 (Protected, needs rulings).

---
# SUIT-ALIVE S5 — pace and the dark cockpit

- **Authority / Builder / lane:** Gavin, 2026-10-28, "go S5" (SUIT-ALIVE-004). Claude Code; PROTECTED
  (TODAY readings; no Engine, schema or event change). [Brief](SUIT-ALIVE.md#s5--pace-and-the-dark-cockpit).
- **Baseline:** master `7e9810c` (#316 S4 merged).
- **Built:** "by now" pace for protein and water. TODAY's tiles dim inside your normal and say BEHIND
  PACE in amber; the cave judges today's totals by pace.
- **Next:** CI and Gavin's merge. Then S6 (preflight and after-action), FEATURE.

---
# SUIT-ALIVE S4 — the route

- **Authority / Builder / lane:** Gavin, 2026-10-28, "go S4" (SUIT-ALIVE-003). Claude Code; PROTECTED
  (TODAY layout; no Engine, schema or event change). [Brief](SUIT-ALIVE.md#s4--the-route).
- **Baseline:** master `8fa7f33` (#315 S3 merged).
- **Built:** ROUTE on TODAY (the next three points), in-app callouts on COMMS, and the cave's
  ROUTE view. Break time deferred (schema).
- **Next:** CI and Gavin's merge. Then S5 (dark cockpit and pace), Protected.

---
# SUIT-ALIVE S3 — comms and Tonight

- **Authority / Builder / lane:** Gavin, 2026-10-28, "go S3" (SUIT-ALIVE-002). Claude Code; PROTECTED
  (presentation of recommendation authority; no Engine, schema or event change). [Brief](SUIT-ALIVE.md#s3--comms-and-tonight).
- **Baseline:** master `d937c3e` (#314 S1 merged).
- **Built:** a comms line closing TODAY's mode hero (your readings against your normal, never the call),
  and the cave's TONIGHT view (the call as made, what's furthest from normal, what's overdue).
- **Next:** CI, independent review (unless waived), Gavin's merge. Then S4 (route), Protected.

---
# SUIT-ALIVE S1 — the bat mark

- **Authority / Builder / lane:** Gavin, 2026-10-28, "go S1 with the prototype bat" (SUIT-ALIVE-001).
  Claude Code; presentation only. [Brief](SUIT-ALIVE.md#s1--the-bat-mark).
- **Baseline:** the SUIT-ALIVE-001 ruling (#313) merged as master `181aeea`.
- **Built:** the red bat is the header emblem, sits beside THE CAVE heading and opens on the cold
  start. It has one source SVG under `docs/brand/suit-mark/`. Stealth and the app icon are unchanged.
- **Next:** CI and Gavin's merge. Then S3 (comms and Tonight, Protected) on his go.

---
# SUIT-ALIVE S2 — the cave, Vitals

- **Authority / Builder / lane:** Gavin, 2026-10-28, "go S2". Claude Code; FEATURE (read-only,
  TODAY unchanged). [Brief](SUIT-ALIVE.md). Prototype and build plan in `prototype/suit-alive/`.
- **Baseline:** master `b8fb15a` (#311 LOOP-002 merged).
- **Built:** MORE → SYSTEMS rows open the cave: one vital in depth against your own normal, with
  run position, records, what it feeds and source; full history one tap further.
- **Merged:** #312 by Gavin's direction, 2026-10-28 (`cf3ccfd`).
- **Bat ruling:** recorded as SUIT-ALIVE-001 in `docs/UX_DECISIONS.md` (docs-only PR). The original red
  bat mark is allowed in the header emblem, the cave heading and the cold start; EMBLEM-002 stays the
  app icon. Open for S1: the prototype's geometry or the EMBLEM-002 master.
- **Next:** Gavin's merge of the ruling PR. Then S1 (build the mark) or S3, each on his go.

---
# LOOP-002 — one post-shift moment

- **Authority / Builder / lane:** Gavin, 2026-10-27, "go LOOP-002". Claude Code; PROTECTED (TODAY
  post-shift composition; no Engine/schema/new event). [Brief](LOOP.md#loop-002--one-post-shift-moment-follow-ups-where-they-belong).
- **Baseline:** master `9a37a6b` (#310 REMEMBER merged; review waived by Gavin).
- **Built:** debrief folded into the shift handoff; "Did this happen?" on "From last shift";
  "Looking back?" on the next same-kind recommendation card. Duplicate debrief card and PREP line removed.
- **Next:** CI and Gavin's merge (review per DEV-FLOW-002 unless waived). Then live with the loop
  for a rotation.

---
# LOOP step 4 — REMEMBER

- **Authority / Builder / lane:** Gavin, 2026-10-27, "go remember". Claude Code; PROTECTED
  (advisory, informational only; no Engine/schema/new event). [Brief](LOOP.md#step-4--remember).
- **Baseline:** master `3a74cc9` (#309 TRY merged by Gavin).
- **Built:** your reviewed lesson on the next recommendation of the same kind; your last debrief's
  plan under PREP; past experiment lessons when starting a new one.
- **Next:** CI and Gavin's merge (review per DEV-FLOW-002 unless waived). This completes THE LOOP.

---
# LOOP step 3 — TRY

- **Authority / Builder / lane:** Gavin, 2026-10-27, "Merge it and go try". Claude Code; PROTECTED
  (bounded: journal-backed, no schema/new event/Engine input). [Brief](LOOP.md#step-3--try).
- **Built:** Journal → Experiments (start, run, compare with your usual, close with a lesson) and a
  quiet "Trying: …" line under TODAY's mode while one runs.
- **Next:** CI, then Gavin's merge (independent review per DEV-FLOW-002 unless waived). Step 4
  REMEMBER needs its own approval.

---
# Session close — 2026-10-27 (all work merged and live)

- **Live on master `8a14c72`, deployed (GitHub Pages run 418 green):** ROTATION-002/003/004
  (#297, #299, #304), DELTA-004 (#298), SLEEP-ENGINE-001 (#300), overlay removal (#301),
  PERSONAL-UNDERSTANDING-001 (#302), LOOP step 1 ASK (#305), LOOP step 2 REFLECT (#306),
  MEMORY-001 (#303) and SUIT-002 (#307). All merged at Gavin's direction; independent review
  waived by Gavin for #300 and #306 only (recorded on each PR).
- **No open PRs from this session; no work in flight.** Builders: Claude Code owns THE LOOP;
  Codex owns Personal Understanding, memory and SUIT-002.
- **Next action:** LOOP step 3 TRY (bounded personal experiment, proposed as a journal-backed
  record with no schema change) awaits Gavin's "go try"; step 4 REMEMBER after it. Both PROTECTED.
- **Owner checks:** feel SUIT-002 haptics on the phone (water tick; hold-to-delete arm and
  commit). Delete merged branches `claude/delta-004` and `claude/remove-pcb-overlay` in GitHub.
- **Known risks:** existing bundle-size warning. REFLECT follow-ups appear in the Journal only,
  not on TODAY (deliberate; revisit with use).

---
Historical SUIT-002 checkpoint (Codex, #307 merged at `8a14c72`):

# SUIT-002 — make the armor answer

- Authority: Gavin's BEYOND // SUIT brief, 2026-10-27. Codex; PROTECTED combined memory/command-outcome review.
- Baseline: fresh master `8aedba5`; branch `codex/suit-002`; [PR #307](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/307), depends on #303; base master for required CI.
- [Brief](SUIT-002.md). Reuse existing haptics/hold/confirmation/rotation and MEMORY-001 #303.
- Built so far: shared semantic feedback after successful writes, 120ms neutral pulse,
  mute reduced-motion, cancellable holds and short rotation surface with optional detail.
- Evidence: corrected focused TRAIN/KEEP/receipt checks86/86; reviewer node29/29; code review
  PASS at6db4328. Production build + four-size offline water/undo/memory/backup acceptance PASS
  (360/390/844/1280), zero unrelated writes/errors/overflow. Final full gate/CI/review follows.
- Integration: fresh master `c28a846` (#306 reflection) merged, code clean; both checkpoint histories retained.
- Latest: inspection is one tap/mute, charged deletion retains its hold. Focused114/114 and
  code review PASS at63a222b. Built offline360 hold PASS in normal/reduced motion: tap/halfway
  zero voids, full hold exactlyone; expected native calls [10,8,35] or none.
- Next: final full gate/CI and exact-head evidence review, then owner decision. No merge authorized.
- MEMORY-001 #303 refreshed onto master `c28a846` as `1a653303`; current CI/review renewal pending. Prior exact `71bcb079` CI/review PASS.
  Integrated unchanged memory lifecycle into #307 for combined testing, plus UI feedback. Neither is deployed.

---

---
# LOOP step 2 — REFLECT

- **Authority / Builder / lane:** Gavin, 2026-10-27, "merge 305 and go reflect". Claude Code;
  PROTECTED (bounded: journal link at creation, no Engine/schema/new event). [Brief](LOOP.md#step-2--reflect).
- **Baseline / branch:** master `8aedba5` (#305 ASK merged at Gavin's direction); `ccr-0be4f40f-16m0ja`.
- **Built:** "Why not?" after declining a recommendation, the 30-second shift debrief, and "How did
  it go?" in the Journal from the next lived day.
- **Next:** CI and Gavin's merge (independent review per DEV-FLOW-002 unless Gavin waives it).
  Steps 3 TRY and 4 REMEMBER each need their own approval.

---
Historical LOOP step 1 checkpoint (#305 merged at `8aedba5`):

# LOOP step 1 — ASK

- **Authority / Builder / lane:** Gavin, 2026-10-27, "Go loop" (campaign + step 1). Claude Code;
  FEATURE (read-only). [Campaign brief](LOOP.md). Claude owns THE LOOP; Codex keeps Personal
  Understanding and memory (#303).
- **Baseline / branch:** master `98a8300` (#304 ROTATION-004 merged at Gavin's direction);
  `ccr-0be4f40f-16m0ja` reused.
- **Built:** Review → Whole Picture → Ask: four questions answered by rules from recorded days
  (`application/askProjection.ts`), every line opening the days behind it; "not enough recorded
  yet" names what is missing. No writes, Engine input or AI.
- **Next:** CI and Gavin's merge. Steps 2–4 (REFLECT, TRY, REMEMBER) are PROTECTED and each need
  their own approval. Merged branches `claude/delta-004` and `claude/remove-pcb-overlay` still
  await deletion by Gavin.

---
Historical ROTATION-004 checkpoint (#304 merged at `98a8300`):

# ROTATION-004 — your whole day on one line

- **Authority / Builder / lane:** Gavin, 2026-10-27, "go 004". Claude Code; FEATURE.
  [Brief](ROTATION-004.md). Meals, water and workout starts on every Rotation actogram row.

---
Historical SLEEP-ENGINE-001 checkpoint (#300 merged at `c3338a0`):

# MEMORY-001 — confirmed prep and recovery memory

- **Authority / Builder / lane:** Gavin's explicit MEMORY-001 direction, 2026-10-27; Codex,
  PROTECTED additive event/command contract. [Brief](MEMORY-001.md). No new schema or Engine rule.
- **Baseline / branch / PR:** fresh master `ab3508887af7650d6e4180d815e048fd2b48b8f2` (#302
  merged/deployed); `codex/memory-001`; [#303](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/303), WIP pushed early.
- **Built:** operator-only food/bottle/other-prep/recovery facts, causal append-only revisions,
  confirmation/status/history, atomic stale/day/duplicate guards; MORE manager, PREP context and
  recovery-only TRAIN context. Existing backup/store; no consumption/tasks/advice side effects.
- **REUSE:** PREP/atomic/events/day/history/backup, native disclosures and existing routes.
  **OWN:** fact lifecycle and context mapping. **BUILD FROM SCRATCH:** only missing fact/editor
  semantics, which daily preparation confirmations and Journal records cannot represent honestly.
- **Evidence so far:** integration 7/7; focused browser/Train/PREP/Nav 104/104 before final day-read
  ownership refinement. Four-size axe/reduced-motion/bounded controls, inspect/edit/irrelevant,
  source/Engine isolation and real native backup tests included. TypeScript/architecture pass.
- **Independent WIP review:** BLOCK on `0401fa4`: day-keyed PREP remount lost a global-memory
  draft. Corrected by retaining the hidden component through no-day/new-day transitions; day-owned
  preparation reads reset separately and cannot revive yesterday's confirmation. Regression covers
  ended/null/new-day draft survival and explicit day adoption; final exact-head review follows.
- **Production / follow-up:** [Built-PWA acceptance](../screenshots/memory-001/README.md) PASS at
  360/390/landscape/desktop, offline reload, original/corrected/irrelevant history and recovery-only
  context, actual native backup preview/cancel. Exactly four memory revisions; all other domain
  records unchanged. Current Memory/Personal Understanding browser 18/18, node catalog/history/
  memory 34/34, new catalog route/focus/back/no-write case PASS; TypeScript/build pass.
- **Full-gate history:** initial local 3,031 pass / three fail / one existing skip. Two missing
  catalog expectations corrected (heading and existing meal-memory alias), original unchanged
  target-return timeout passes alone/in follow-up. No assertions/timeouts/gates weakened.
- **Review / CI:** independent corrective PASS at `b9ea7ae`, 19/19 node probes; final exact-head
  renewal required after evidence. Source `8da2c0e` required CI [PASS](https://github.com/gavinlohnes/neo-beyond-lohnes/actions/runs/40467876738).
  Final full verification, exact-head review and current-head CI are recorded in #303 before
  readiness. Existing bundle warning remains; no inference, Engine or schema change.
- **Next:** final full gate/review/CI, then Gavin's separate merge decision. No merge/deployment
  or next slice authorized here. Other memory domains remain parked.

- **Mainline continuity:** merged fresh master `c3338a0` (#300 SLEEP-ENGINE-001) after it landed during final verification. Only this checkpoint conflicted; both histories are retained. MEMORY adds no Engine change relative to that master. The previous final local run was stopped for integration; combined-head verification/review/CI follow.

---
Historical SLEEP-ENGINE-001 (#300 merged at `c3338a0`):


# SLEEP-ENGINE-001 — two short main sleeps suggest the reduced session

- **Authority / Builder / lane:** Gavin, 2026-10-27, "approve option 1". Claude Code; PROTECTED.
  [Brief](SLEEP-ENGINE-001.md). Independent review waived by Gavin ("Skip the reviews for now");
  none performed. Merged at Gavin's direction ("Merge") as #300.
- **Evidence:** full verify 3,028 passed / 1 existing skip; CI green. Overlay removal merged as #301.
- **Next:** live with it on shift; check that the reduced suggestion appears only after two short nights.

---
Historical PERSONAL-UNDERSTANDING-001 (#302 merged/deployed as `ab35088`):

# PERSONAL-UNDERSTANDING-001 — connected knowledge

- **Authority / Builder / lane:** Gavin: “Let's work on personal understanding”, after the
  first-slice proposal; Codex, FEATURE read-only Review composition. [Brief](PERSONAL-UNDERSTANDING-001.md).
- **Baseline / branch / PR:** fresh master `e0da229`; `codex/personal-understanding-001`;
  [#302](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/302), draft pushed early.
- **Scope:** existing Missions/explicit targets/weekly focus, qualified personal baselines,
  comparable rotation positions, and real written lessons with canonical source/edit navigation.
  Existing word matching connects candidate lessons to Missions, with its limitation visible.
- **REUSE:** existing queries, projections, matcher, source screens and native disclosure.
  **OWN:** read-model/navigation composition. **BUILD FROM SCRATCH:** missing cross-domain view only.
- **Boundaries:** no Engine/schema/command/backup/dependency changes, new preference store,
  recommendation priority or TODAY changes. Claude's SLEEP-ENGINE-001 #300 remains separate.
- **Built:** optional Choices/Patterns/Lessons workspace in MORE → Review, lazy read-only loading,
  source inspection, direct original Mission/Journal/Targets/Schedule routes and BACK TO REVIEW.
- **Verification:** full `npm run verify` PASS on source `5f1bdeb`: architecture 312 files;
  312 test files pass, 3,015 tests pass / one existing skip; TypeScript and production/PWA build
  pass. New integration 3/3 and browser 9/9 cover exact corrected samples, all-table no-write
  snapshots, source round trips, absence/error/retry, bounded lists and stale-read rejection.
  [Production acceptance](../screenshots/personal-understanding-001/README.md) PASS at four sizes,
  offline, keyboard disclosure and original-source return; zero domain writes/errors/overflow.
- **CI / limits:** source head's required CI [PASS](https://github.com/gavinlohnes/neo-beyond-lohnes/actions/runs/40454206900).
  Final evidence-only head's CI is recorded in #302. Existing bundle warning remains. This slice
  exposes existing knowledge; it does not yet learn preferences or change advice. Risk classifier
  flags the brief path, not a governance amendment; semantic lane remains FEATURE (brief explains).
- **Next:** green final-head required CI, then Gavin's merge decision. No merge/deploy is claimed.
  Feedback/experiments and a durable preference store remain future scope.

---
Historical ROTATION-003 (merged #299):

# ROTATION-003 — flip planning

- **Authority / Builder / lane:** Gavin, 2026-10-27, "go flips". Claude Code; FEATURE.
  [Brief](ROTATION-003.md). #297 (ROTATION-002) and #298 (DELTA-004) merged at Gavin's direction.
- **Branch / baseline:** `ccr-0be4f40f-16m0ja` restarted from `c03eff3`.
- **Built:** Rotation → Flips: aligned actograms of recent flips into/out of work, usual sleep
  times around each, naps before nights with a comparison gated at 3 flips each way; next-window
  card names the next forecast flip. Rows carry nap minutes.
- **Evidence:** full verify 3,013 passed / 1 existing skip; architecture and build OK.
- **Next:** CI and Gavin's merge. Then use on shift; refinement candidates: one-sentence next
  window, "unusual" tuning, phone readability of actograms. Sleep-aware Engine stays Protected.

---
Historical DELTA-004 checkpoint (#298 merged at `c03eff3`):

# DELTA-004 — "not enough data" becomes a goal

- **Authority / Builder / lane:** Gavin, 2026-10-27, "go Delta 4". Claude Code; FEATURE.
  Brief: [DELTA-002.md, slice 2](DELTA-002.md).
- **Branch / baseline:** `claude/delta-004` from `618e435` (#297 merged, Gavin's "Merge it.").
- **Built:** abstaining readings say what to log and what it unlocks (Weekly expenditure, usual,
  waiting findings; Garmin usual; Rotation). Same floors; no streaks, scores or TODAY rows.
- **Evidence:** full verify 3,008 passed / 1 existing skip; architecture and build OK.
- **Next:** CI, Gavin's merge. Then live with ROTATION-002 + DELTA-004 on shift; candidates after
  use: one-sentence next window, "unusual" tuning from real data, ROTATION 3 flip planning.

---
Historical ROTATION-002 checkpoint (#297 merged at `618e435`):

# ROTATION-002 — BEYOND understands your rotation (Tracks A + B)

- **Authority / Builder / lane:** Gavin, 2026-10-27, "Go A + B". Claude Code; FEATURE.
  [Brief](ROTATION-002.md). PREP-001 merged as #296 (`fa5cdd8`); spending is out of BEYOND.
- **Branch / baseline:** `ccr-0be4f40f-16m0ja` from `fa5cdd8`; [PR #297](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/297).
- **Stacked next:** DELTA-004 ("not enough data" becomes a goal), Gavin's go 2026-10-27, branch
  `claude/delta-004` on #297; brief in [DELTA-002.md](DELTA-002.md).
- **Built:** Rotation tab actogram (Garmin sleep vs scheduled shift), shift-by-shift and day-off
  patterns with sample sizes and tap-through, next window (forecast days off, last workout,
  most-trained day off). TODAY's Garmin tiles flag 3+ finished days outside your own range;
  sheets explain values/range/basis. Mode-pin flake fixed in the test (expect.poll moved the
  faked clock past 16:30); app mode-pin code unchanged.
- **Not changed:** Engine, recommendations, events/commands, schema, dependencies, backups.
- **Next:** full verify + green CI; independent review if Gavin wants one (FEATURE lane does not
  require it); Gavin's merge approval. Then live with it on shift and decide the next step
  (ROTATION 3 flip planning, or DELTA-ADVANCED experiments).

---
Historical PREP-001 checkpoint (#296 merged at `fa5cdd8`):

# PREP-001 — ready for tonight

- **Authority / Builder:** Gavin approved the focused first campaign step, 2026-10-26. Codex;
  PROTECTED preparation facts/TODAY composition. [Brief](PREP-001.md).
- **Branch / baseline:** `codex/prep-001`; `560deb3bc5d080ff19c0dd537c3d20a8c93144cb` (#295 merged).
- **Scope:** food/snacks and bottle preparation, practical alternatives, undo/change and local
  persistence; no consumption logging, spending or recommendation changes.
- **REUSE:** event/atomic-write/day/backup/history and LogSheet/confirmation paths.
- **OWN:** preparation fact mapping. **BUILD FROM SCRATCH:** missing preparation projection only.
- **Built:** one-tap food/bottle before actual work, quiet manual entry at other times, native
  sheet with homemade/frozen/other/not-needed choices, change/undo and inspectable history.
  Append-only item revision in existing events; atomic idempotence/stale/day guards. New days
  start unknown; no consumption or Obligation records are created.
- **PR / evidence:** [#296](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/296), draft pushed
  early. Persistence 12/12 and initial browser 10/10 PASS (including four axe sizes), TypeScript,
  architecture (308 files), build and diff check PASS. [Production acceptance](../screenshots/prep-001/README.md)
  PASS at phone/landscape/desktop, offline confirmations, frozen option, midnight reload, native
  backup download/restore preview and unchanged non-preparation records. Final verification covers
  compact controls and retained logging-first placement; no product change after final capture.
- **Review history:** WIP BLOCK `801d138` found time sorting could revive superseded state after
  clock correction. Causal-chain projection fixes it and rejects conflicting/incomplete chains;
  independent original probe and integration 12/12 PASS. Initial CI test-type/import/order
  issues corrected without assertion/configuration weakening. Final exact-head review and full
  gate/required CI results are recorded in #296 before readiness.
- **Full-gate correction:** 2,984 passed / two failed / one skip on prior head. Retained original
  Polish001 phone-fold assertion by moving preparation below existing Log controls. Preparation
  and Polish001 now 23/23 PASS. Catalog follow-up had 57 pass / one different 15s timeout; original
  MIRROR and TODAY TOOLS cases pass 2/2 alone. Final production acceptance refreshed: four sizes
  PASS. Final full verification/review/CI results are recorded in #296.
- **Next:** final full verification, independent review and green CI, then Gavin's separate merge
  approval. Spending and later campaign stages remain outside this focused step.

---
Historical C2 checkpoint (#295 merged):

# REVIEW-001 — C2 operator-set targets

- **Authority / Builder / lane:** Gavin approved C2 on 2026-10-25 after #294 merged. Codex;
  PROTECTED operator-controlled interpretation settings.
- **Branch / baseline:** `codex/review-001-c2-targets`; fresh master
  `9bc96e826f7167cadb0be8ca5f90abd91f72d284`; [PR #295](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/295).
- **Outcome:** optional weight-change-rate, sets-per-muscle and strength-sessions-per-week targets;
  Review compares canonical recorded evidence with the operator's choices.
- **Exclusions:** no defaults, generic pass/fail verdict, Engine input, program adjustment,
  recommendation priority, provider/dependency, or JOURNAL work.
- **REUSE / OWN / BUILD FROM SCRATCH:** existing mutable targets row/save/undo/backup and Review
  projections / missing-data-aware comparison language / none.
- **Built:** COMMAND → Targets now stores and clears the three optional choices in the existing
  targets row. Review presents weight-rate, per-muscle working-set and weekly strength-session
  actuals beside those choices without a default, score or recommendation. Existing backups carry
  the additive fields with no schema migration.
- **Evidence:** TypeScript and production/PWA build pass; persistence/restore/target/strength
  integration coverage passes 43/43; focused COMMAND/Targets/Review/Body Chromium coverage passes
  169/169, including 320 px target comparison. Diff check is clean. The existing >500 kB bundle
  warning remains. `MoreOperator.test.tsx` retains its pre-existing isolated ESM-mock setup failure
  (`mockReset is not a function`) before product rendering; no assertion was weakened.
- **Independent review:** exact head `67f51c6` BLOCKED on two P2 gaps: an early-open/late-read
  race could manufacture clears for untouched Review targets, and setting guidance lacked the
  brief's inspectable sources. The correction disables Targets until its initial read succeeds,
  adds the delayed-read/no-edit regression, and attributes bounded context to the relevant JISSN,
  ACSM and meta-regression sources without creating defaults. Focused browser tests pass 52/52;
  TypeScript, production/PWA build and diff check pass. Existing bundle warning remains.
- **Closeout handoff, 2026-10-26:** Gavin explicitly approved this session taking over #295
  (“Let's finish that up then”). Existing PR branch remains `codex/review-001-c2-targets`;
  isolated local branch `codex/review-001-c2-closeout`. Preserved corrected source head
  `2708c82798936a3877eaf799db51eab7854f1574`; its required CI passes. No new product scope.
- **Closeout evidence:** current-head Targets/Review/integration regression passes 66/66.
  Corrected two stale “COMMAND → Targets” hints to “MORE → Targets”, with matching existing
  copy assertions. Final review and unchanged required CI cover that correction as well.
- **Next:** verify both reviewer corrections, renew independent exact-head review, and update
  #295 with final checks and review before readiness. Final evidence is recorded in the PR;
  Gavin separately decides merge. PREP-001 remains an unapproved implementation proposal.

---

# REVIEW-001 — Phase 1b strength and muscle intelligence (merged #294 at `9bc96e8`)

- **Authority / Builder / lane:** Gavin approved the recommended bounded Phase 1b objective on
  2026-10-24 (“do it”). Codex; PROTECTED read-only Engine analytics.
- **Branch / baseline:** `codex/review-001-phase1b`; fresh master
  `aafa5b57c85050b5cab3eed3a07e484ae3fbcd02` after #293 merged; active
  [PR #294](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/294).
- **Outcome:** Review answers strength direction/preservation, lift progress/stalls, weekly hard
  sets by muscle, and broad training balance from existing records with explicit floors and abstention.
- **Exclusions:** no schema/events/commands/backups/dependencies/providers; no template,
  progression, recommendation, target, program or automatic-decision change; no fat/muscle verdict.
- **REUSE / OWN / BUILD FROM SCRATCH:** existing session/set truth, TRAIN curves, exercise mappings
  and Review evidence UI / BEYOND comparability and abstention / only the pure aggregation layer.
- **Built so far:** pure `strengthReview` projection with two-session-per-window same-lift
  comparability; best-set and volume-led lift/index direction; secondary estimated max; relative
  strength when a prior bodyweight exists; weekly volume and muscle-set rates; explicit exercise-
  level push/pull classification; canonical exclusions; and complete 56-day source disclosure.
- **Evidence:** new Engine + integration tests 5/5; TypeScript, architecture (304 files), production
  build and diff check pass. Existing ReviewScreen/BodyAnswers browser files pass 11/11. The existing
  ReviewHub file remains unstable in isolated Chromium at its ESM mocks (`mockClear` /
  `mockRejectedValueOnce` missing) and two shared-state timing assertions; no assertion was changed.
- **Completed slice:** direct 320 px browser coverage; push/pull and upper/lower set-rate views
  retain arms/core/full-body/unknown work as unclassified rather than inventing a split; the body
  side-by-side now uses the same strength result while preserving its no-verdict language.
- **Evidence:** Engine + integration 6/6; focused strength/body browser 5/5; TypeScript,
  architecture (305 files), production/PWA build and diff check pass. Existing >500 kB bundle
  warning remains.
- **Independent review:** exact head `cacb658` BLOCKED on three scope gaps: primary strength
  measures, shoulder movement classification, and inspectable source records. The Builder corrected
  all three without expanding scope. Focused Engine/integration tests pass 7/7; direct 320 px browser
  coverage passes; TypeScript, architecture (305 files), production/PWA build and diff check pass.
  Existing >500 kB bundle warning remains.
- **Next:** push the corrected head, obtain green required CI and renewed independent exact-head
  review. Gavin separately decides merge.

---

Historical NAV-001 slice 4 (merged #293 at `aafa5b5`):

# NAV-001 — slice 4: DATA paths and Garmin sync

- **Authority / Builder:** Gavin approved the NAV map and explicitly requested “merge 292 and
  continue” on 2026-10-23. Codex; PROTECTED primary IA. [Brief](NAV-001.md#slice-4--data-paths-and-garmin-sync).
- **Branch / baseline:** `codex/nav-001-slice4`, fresh master `731279d`; slice 3 #292 merged.
- **Scope:** direct existing Whole Picture and Rotation entries in DATA; the existing Android-only
  Health Bridge sync action on TODAY's measured-number heading. No Engine, schema, Garmin import,
  logging/correction, backup, dependency or TRAIN change.
- **REUSE:** existing review destination, Whole Picture/Rotation, SyncGarminLink and path tests.
- **OWN:** presentation-only navigation focus handoff.
- **BUILD FROM SCRATCH:** none.
- **Evidence so far:** NAV paths 14/14 pass; DATA/Review/Garmin/App focused browser regression
  95/95 passed before the added Whole Picture path; the established three-part DATA layout passes
  7/7 at 320/360/390/412 px after folding the new entries into PROGRESS. Architecture (302 files),
  TypeScript and production/PWA build pass; diff check is clean. Existing bundle-size warning remains.
- **Local full-gate note:** the default and two-worker Windows runs were stopped after widespread
  shared-IndexedDB/overlapping-act contamination across unrelated suites. The isolated existing
  MoreOperator file also currently fails at its setup mock (`mockReset is not a function`) before
  rendering product code. No assertion was weakened; required clean full CI remains the authority.
- **Review correction:** independent review of `d591dad` found the DATA → Review focus request
  remained live after use. The corrected handoff is consumed once, is not queued when navigation is
  blocked, and has a leave/re-enter regression; NAV paths and TypeScript pass on the corrected tree.
- **Next:** push the correction to #293, obtain renewed independent exact-head review and green
  required CI, then merge under Gavin's recorded approval.

---

Historical slice-3 checkpoint (merged):

# NAV-001 — slice 3: sleep metric page

- **Authority / Builder:** owner-approved NAV map; Gavin: “go ahead” after slice-2 handoff.
  Codex; approved PROTECTED IA. [Brief](NAV-001.md#slice-3--sleep-metric-page).
- **Branch / baseline:** `codex/nav-001-slice3`, `64248eb8cb8bac5af05517943aa3469b494f7086`.
  #291 merged with explicit approval, green CI and independent exact-head PASS.
- **Scope:** shared week-first sleep detail, D/W/M/Y and period paging/swipe, record drill-through;
  display only. No Engine/schema/logging/Garmin/backup semantics change.
- **REUSE:** measured charts/queries, SleepEvidence, LogSheet; **OWN:** period-to-evidence mapping;
  **BUILD FROM SCRATCH:** period navigation because existing charts use fixed ranges.
- **Built:** shared week-first Garmin sleep sheet from TODAY and DATA; calendar D/W/M/Y,
  earlier/later controls and swipe, measured sample counts, keyboard/pointer night selection,
  retained stages/source records and canonical all-records/correction route. Missing is not zero;
  manual sleep is not silently converted to Garmin evidence. Existing 371-period history bound
  is disclosed, including clipped calendar periods.
- **PR / evidence:** [#292](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/292), draft pushed
  early. Architecture/typecheck/build PASS; calendar tests 4/4, Garmin regression 6/6; final sleep
  browser file 9/9 (including four axe sizes), NavPaths 11/11 with two slice-4 todos.
  [Production acceptance](../screenshots/nav-001-slice3/README.md) PASS at phone/landscape/desktop,
  offline real import→week→night/source, close/focus, all-records route, unchanged events.
- **Verification history:** first focused 17 pass / 3 new test-harness failures, then 19 pass /
  one instrumentation call-count failure. Corrected unsupported ESM spy, actual destination
  heading and expected DB invocation count; all behavior assertions retained. Keyboard focus
  refinement independently suggested and verified. WIP code review PASS; final full gate,
  exact-head review and required CI recorded in #292 before readiness.
- **Next:** finish full verification, final independent review and green exact-head CI, then
  Gavin’s merge approval. DATA layout/sync tile/tree-test rerun remain slice 4.

---
Historical slice-2 checkpoint (merged):

# NAV-001 — slice 2: DATA / MORE and backup first

- **Authority / Builder:** Gavin approved the NAV map and explicitly requested merging #290 and
  continuing on 2026-10-23. Codex; PROTECTED primary IA. [Brief](NAV-001.md#slice-2--data--more-and-backup-first).
- **Branch / baseline:** `codex/nav-001-slice2`, fresh master `3520cba`; slice 1 #290 merged.
- **Scope:** visible DATA/MORE labels and consistent headings/returns/catalog copy; compatible
  internal routes/history/shortcuts; direct “Back up my data” first in MORE, existing export
  handler and visible receipt. No backup format/restore semantics, schema, Engine or Garmin change.
- **REUSE:** existing tab renderer, catalog, MoreScreen export/backup panel and path tests.
- **OWN:** presentation mapping to existing destinations and handlers.
- **BUILD FROM SCRATCH:** none.
- **PR / evidence:** [#291](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/291).
  Typecheck, architecture (300 files), diff and build pass. [Production acceptance](../screenshots/nav-001-slice2/README.md)
  passes phone/landscape/desktop, including offline real backup download, real restore preview,
  cancel and unchanged domain records. Native-backup path, failure/retry and duplicate-click
  checks pass; internal legacy routes and “body” search alias are retained.
- **Verification history:** initial recovery-fold failure fixed without relaxing the bound;
  follow-up 26/26. First complete local full run: 2,929 passed / 6 failed / 1 skip / 3 future todos.
  Fixed a dynamic BACK TO label and two stale test selector paths; five affected files then
  pass 32/32, including both timeout cases. Final full gate runs with two workers for load;
  no assertion/timeout/configuration weakening. Final exact-head results/review are recorded
  in #291 before readiness. WIP independent review found no substantive issues.
- **Next:** final full gate, renewed exact-head independent review and green required CI, then
  Gavin’s merge approval. Metric zoom and DATA layout remain later slices.

---
Historical slice-1 checkpoint (merged):

# NAV-001 — slice 1: TODAY

- **Objective / authority:** [NAV-001](NAV-001.md); Gavin approved the map on 2026-10-23 (Protected IA).
  Builder: Codex, explicitly taking over from Claude Code on Gavin’s 2026-10-23 instruction.
  Existing branch `claude/nav-001`, [PR #290](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/290);
  local checkout `codex/nav-001`. SLEEP-FILING-001 (#289) merged.
- **Built:** a floating + LOG; the meal sheet opens with NEW MEAL / QUICK ADD; "See the reasoning ›";
  path tests per top task (`tests/browser/NavPaths.test.tsx`).
- **Takeover verification:** 8 related browser files **230 passed / 4 future-slice todos**;
  architecture (300 files), TypeScript/production build and diff check pass. Built-PWA acceptance
  passes 320/390/landscape/desktop: floating LOG placement, sheet focus return, inactive-tab hiding,
  retained meal draft, no overflow/page errors. [Evidence](../screenshots/nav-001/README.md).
  Fixed the reproduced entrance-animation containing-block bug with a TODAY-only fade; logging
  handlers unchanged. Original Claude head had green full CI/verify; final-head required CI
  runs the full suite/build again. Independent final exact-head review and CI are recorded
  in #290 before readiness. Gavin approves merging slice 1; takeover is not merge authority.
- **CI follow-up:** the first takeover CI failed four legacy fresh-install cases asserting
  LOG bottom <700px. NAV intentionally places it above bottom navigation (764px at height844).
  Replaced the superseded absolute threshold with viewport/navigation bounds, target size,
  pointer hit test and actual LOG opening, preserving empty-state, red-budget and no-day-write
  checks. RedesignToday + NavPaths follow-up: **29 passed / 4 later-slice todos**. No product
  code changed after the accepted production capture; final CI/review renewal required.
- **Later approved slices:** slice 2 (BODY → DATA, COMMAND → MORE, "Back up my data"), slice 3 (sleep page by week),
  slice 4 (DATA layout, sync on numbers, tree-test re-run).

---
Previous checkpoint (SLEEP-FILING-001, #289 merged):

# SLEEP-FILING-001 — real sleep, not quiet shifts

- **Objective / authority:** [SLEEP-FILING-001](SLEEP-FILING-001.md); Gavin: "go sleep filing"
  (2026-10-23), only while actually working. Builder: Claude Code, branch `claude/sleep-filing`.
- **Built:** shift-aware, gap-aware Garmin sleep filing; Health history notes for uncounted sleep.
- **Verified:** `npm run verify` green (2,923 passed / one skip, build OK); node suite green under
  both TZ=UTC and TZ=America/Chicago.
- **Next:** #289: CI, independent review, Gavin's merge. SYNC-001 (#287) is merged.

---
Previous checkpoint:

# SYNC-001 — current in two taps

- **Objective / authority:** [SYNC-001](SYNC-001.md); Gavin: "go SYNC-001" (2026-10-23).
  Builder: Claude Code, branch `claude/sync-001`.
- **Built:** helper 0.7.0 reads on open, explains stale Garmin data, opens from BEYOND's SYNC GARMIN
  link and sends; BEYOND shows SYNC GARMIN on Android in Garmin sheets and the old-data note.
- **Verified:** BEYOND `npm run verify` green (2,914 passed / one skip, build OK). The helper is
  compiled and tested by Health Bridge CI (no local Android SDK).
- **Next:** #287: both CI workflows on the master-merged head, renewed exact-head review, merge
  (Gavin approved on review pass); Gavin installs helper 0.7.0.

---
Previous checkpoint (ROTATION-001 phase 1, #288 merged by Gavin):

# ROTATION-001 — phase 1: the rotation map

- **Objective / authority:** [ROTATION-001](ROTATION-001.md); Gavin: "go ROTATION" (2026-10-23).
  Builder: Claude Code, branch `claude/rotation-1`. SYNC-001 (#287) is separate and pending merge.
- **Built:** Rotation tab in Whole Picture (runs by recorded context, per-day sleep/energy/workout
  cells into the existing inspector, next predicted run). Display only.
- **Verified:** `npm run verify` green: 2,916 passed / one skip, build OK.
- **Found in Gavin's 2026-10-23 backup (not committed):** two Garmin sleeps on Oct 21 were never
  filed as sleep because no lived day covered their start (BEYOND unused Oct 19–21); Garmin steps
  stop at Oct 22 05:00 local while heart rate continues. Filing fix is Protected; awaiting Gavin.
- **Next:** PR, CI, review, Gavin's merge.

---
Previous checkpoint:

# Owner-approved integration — #286 and #282

- **Authority:** Gavin explicitly requested merging both PRs on 2026-10-23. Codex integrates;
  no additional feature implementation is authorized.
- **Current truth:** Whole Picture #283, reuse-first #285 and TODAY “Why this?” #284 are merged.
  #286 records mandatory REUSE / OWN / BUILD FROM SCRATCH and proportional process. #282 records
  advanced Delta direction only; each future slice still requires owner approval.
- **Branches / verification:** #286 `codex/reuse-first-002` merges fresh master `a17a2fd`;
  #282 `claude/delta-advanced` incorporates that same reconciled base. Conflicting checkpoint
  and register entries retain both owner direction and Delta history. Final exact-head reviews
  and unchanged required CI are recorded in each PR before the owner-approved merges.
- **Mainline / next:** use Whole Picture and TODAY’s explanation on shift; Gavin decides whether
  to authorize sleep-aware Engine work. Parallel feature epics remain parked; no SUIT-ALIVE,
  visual epic, boxed AI, ranked help, new recommendation priority or pushback schema authorized.
- **REUSE:** existing register, checkpoint, Intelligence Spine and Delta direction briefs.
- **OWN:** documentation reconciliation and mapping to existing owner authority.
- **BUILD FROM SCRATCH:** none.

---
Historical checkpoint (superseded status; retained for evidence):

# REUSE-FIRST-002 — owner build direction, 2026-10-23

- **Authority / Builder / lane:** Gavin’s explicit owner direction; Codex; PROTECTED docs-only.
- **Branch / baseline:** `codex/reuse-first-002`, fresh master `fcc0d0d`; [brief](REUSE-FIRST-002.md).
- **Direction:** reuse existing work/proven patterns by default; every new brief and PR description
  states REUSE / OWN / BUILD FROM SCRATCH (one-sentence justification or none). Existing builder
  gate, risk lanes and review retained; Routine stays thin; Careful presentation uses short
  brief/tests; Protected safeguards remain. [Locked decision](../UX_DECISIONS.md#reuse-first-002--owner-build-direction-locked-2026-10-23).
- **Mainline:** Whole Picture #283, reuse-first #285 and TODAY-only DELTA slice #284 merged. Park parallel feature epics unless Gavin names them. SUIT-ALIVE/visual epics,
  boxed AI, ranked “what would help most,” new recommendation priority and new pushback schema
  are not authorized. #282 is direction documentation, not implementation permission.
- **PR / verification:** [#286](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/286).
  Local Markdown targets, diff check and architecture pass (298 files); classifier confirms
  PROTECTED. Docs-only; unchanged required CI runs full verification. Final exact-head review
  and CI evidence are recorded in #286 before readiness; Gavin approves merge.
- **Merge authority / next:** Gavin explicitly requested merging #286 and #282 on 2026-10-23.
  Fresh master through #284 merged into this branch; renew independent exact-head review and
  green required CI, then perform the approved merges without bypass. No new product work.


---
Historical checkpoint (superseded status; retained for evidence):

# DELTA-002 slice 1 — "Why this?" in plain words

- **Objective / authority:** [DELTA-002](DELTA-002.md) slice 1; Gavin: "yes start step 1"
  (2026-10-23). Builder: Claude Code, branch `claude/delta-002-slice1`, from `628ea3c` (#283).
- **Built:** `explainRecommendation` (recommendationCopy.ts) reads the DecisionTrace into plain
  sentences that lead the "How BEYOND decided" panel; always states the Engine doesn't use sleep,
  weight or training. Display only.
- **Verified:** full verify 2,912 passed / one skip (ModePinExpiry 320px clock-edge flake, passes
  alone and on master). Review @ e60e35b requested one fix (the RED + post-shift sentence said
  shift-down could wait while STABILIZE hands off to SHIFT DOWN); fixed with the cheap notes.
- **Next:** CI, exact-head re-review, Gavin's merge. Then Gavin's call: should the Engine
  consider sleep (Protected)?

---
Previous checkpoint (REUSE-FIRST-001, #285 merged):

# REUSE-FIRST-001 — reuse before invention

- **Authority / lane / Builder:** Gavin’s “Make it so,” 2026-10-23; PROTECTED; Codex.
- **Branch / baseline:** `codex/reuse-first-001`, fresh master `628ea3c`; [brief](REUSE-FIRST-001.md).
- **Scope:** existing leverage gate strengthened; concise reuse evidence in brief/PR and reviewer
  check; capability map now points to the existing Intelligence Spine. No runtime changes.
- **PR / verified:** [#285](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/285).
  Local Markdown links and new implementation pointers resolve; diff check and architecture
  pass (298 files); risk classifier confirms PROTECTED. Docs-only: no redundant local runtime
  tests; required CI is unchanged. Independent final-head review and CI results are recorded
  in #285 before readiness; Gavin approves merge.
- **Other work:** WHOLE-PICTURE-001 #283 merged; its final local gate, independent review and CI
  passed. Claude owns DELTA slice 1 (#284); #282 is separate advanced-direction documentation.
- **Next:** verify, open PR, independent review and green CI; no merge without Gavin’s approval.

---
Historical checkpoint (superseded status; retained for evidence):

# WHOLE-PICTURE-001 — connected Review production integration

- **Authority / Builder / lane:** Gavin approved the full interactive concept on 2026-10-23;
  Codex; PROTECTED. [Brief](WHOLE-PICTURE-001.md).
- **Branch / start:** `codex/whole-picture-001`, fresh master
  `ba381c77066a426c6ea52e10dfa30603c5210c3a`; no overlapping open feature PR at start.
- **Scope:** production connected evidence, comparisons, real intent/journal stories, canonical
  weekly focus, tentative real-schedule planning, source inspection and review export/print.
  Full approved concept retained; no fake data, new runtime dependency, schema or Engine rule.
- **Status / PR:** implementation pushed; draft [#283](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/283).
  Fresh master `5e0811c` through #281 merged. No `src/engine/**` diff; new pure projections
  live in application as Gavin directed.
- **Verification:** `npm run verify` PASS (2026-10-23): architecture 298 files,
  295 test files; **2,910 passed / 1 existing skip**, then TypeScript + production/PWA build.
  Risk classifier reports PROTECTED; `git diff --check` passes. No assertions, timeouts or
  suite configuration weakened. The build retains Vite’s advisory about a bundle over 500 kB.
  Built-PWA acceptance passes at 320/390/1440 pixels: source links/History return, no
  exploration writes, retained draft, canonical offline save and offline cold reload.
  [Screenshots/results/reproduction](../screenshots/whole-picture-001/README.md).
- **Review / CI:** independent review at `8c00266` found no substantive issues. Renew on this
  final documentation head and persist exact SHA / PASS or BLOCK in PR #283. Initial CI’s
  legacy-disclosure navigation failure was corrected; its assertions now pass in the full
  local gate. Required CI must be green on the final PR head; live result is in #283.
- **Next:** renew independent exact-head review, obtain green required CI on this final head,
  then Gavin’s merge approval. No merge or deployment authorized. DEPS-001 #280 and DELTA-002 #281 are now on master.
  Read DELTA-002 and the DELTA-ADVANCED brief at #282 (`c1a3c1e`); Delta implementation waits
  for this objective. Every claim must reach its records; show denominators, never causes/scores.

---
Previous checkpoint:

# DELTA-002 — direction locked (docs only)

- **Objective / authority:** Gavin locked the DELTA-002 direction on 2026-10-23 ("Lock it in for
  right now"). Builder: Claude Code, branch `claude/delta-002`. Docs only: [brief](DELTA-002.md) and
  a Decision Register entry. No implementation authorized.
- **Also in flight:** WHOLE-PICTURE-001 (Codex), unpushed in Codex's container; it goes first.
- **Next:** PR, Gavin's merge. Then Codex pushes WHOLE-PICTURE-001 for continuation.

---
Previous checkpoint:

# DEPS-001 — dev/build dependency security patches

- **Authority / lane / Builder:** Gavin approved DEPS-001 on 2026-10-23 in the task; ROUTINE;
  Codex. Disposition: USE DEPENDENCY (upstream security patches).
- **Branch / start:** `codex/deps-001`, from freshly fetched master
  `ba381c77066a426c6ea52e10dfa30603c5210c3a` (#279). No worktree or Factory activation.
- **Scope:** Vite 8.3.0 → 8.3.5; Vitest, browser, browser-playwright and mocker
  4.1.11 → 4.1.12; source-map-js 1.2.1 → 1.2.2; serialize-javascript 7.1.1 → 7.1.3.
  Declare vitest-browser-react ^2.3.0 (already locked at 2.3.0). npm regenerated the lockfile
  using installs and non-forced audit fix; no overrides or hand-edited lockfile.
- **Boundaries:** runtime dependency declarations and the entire runtime lock graph are unchanged.
  No application/Engine/persistence/protected-fixture, Kotlin, Gradle or test changes.
  Playwright remains 1.63.0; existing CI's installed Playwright CLI still installs its matched
  Chromium, so no workflow adjustment is needed.
- **Verified:** clean `npm ci`, `npm audit` (0 vulnerabilities), production-only audit (0),
  compatible `npm ls` peer tree, production build (`tsc -b && vite build`) and `git diff --check`.
  Independent review of `3f5ff89d67cc091c892db8836d2480a1305c24a5` found no code-diff issues
  (code PASS), but overall BLOCK on verification/delivery gates. Renew at the final PR head.
- **Full gate:** first run: 2,894 passed / 4 failed / 1 existing skip; two-worker run: 2,895
  passed / 3 different timeouts / 1 skip. First-run failures passed afterward, and all second-run
  failures passed in a focused check. A separate focused meal-entry timeout also passed alone.
  The one-worker complete gate finished with 2,895 passed / 3 timeouts / 1 existing skip:
  three RedesignSheets undo/duplicate-food cases. All three passed in isolation afterward
  (3 selected; 14 unselected). All failures are retained; no assertions/timeouts/tests changed.
  The complete local gate is NOT green; focused passes do not replace it. Production build
  passed independently after the full gate stopped before build. Matched Chromium uses
  `PLAYWRIGHT_BROWSERS_PATH=/workspace/.cache/ms-playwright`. No further full retries are
  justified without new evidence or an environment change; required CI still must run.
- **PR / alerts / CI:** [#280](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/280),
  draft, against master; branch pushed. GitHub API network access recovered after reattachment.
  The authenticated alerts endpoint still returns HTTP 403, `Resource not accessible by
  integration`, requiring `vulnerability_alerts=read` (Dependabot alerts read permission).
  GitHub's ten alerts (2 high / 6 moderate / 2 low) match the ten distinct npm advisory IDs
  and severity totals, but this does not establish the private alert list or Android status.
  Any confirmed Gradle alerts belong in the PR report, not Kotlin/Gradle changes here.
- **Next:** renew independent review at this checkpoint's final PR head, monitor required CI,
  resolve/verify the intermittent gate failures and require green exact-head CI. Obtain the
  integration's Dependabot-alert read permission to finish authenticated alert reconciliation.
  Local audit/build success does not establish green full verification or a completed objective.
  Wait for Gavin's explicit merge approval; no merge authorized.

---
Previous checkpoint:

# FRICTION-001 — slice 5: owner-approved sleep freshness and PARTIAL note

- **Objective / authority:** [FRICTION-001](FRICTION-001.md); Gavin approved both on 2026-10-22
  ("yes to both"). Builder: Claude Code, branch `claude/friction-5`; slice 4 (#278) merged and is merged in.
- **Built:** the 36 h last-main-sleep window counts from the sleep's `occurredAt` (Garmin wake time);
  SYSTEMS shows "Garmin · woke HH:MM"; the PARTIAL rotation note shows only after a set is logged
  and before completion. No schema, Engine or recommendation change.
- **Verified:** `npm run verify` green: architecture OK, 2,898 passed / one skip, build OK.
- **Next:** PR, green CI, independent review, Gavin's merge. This is the last planned FRICTION-001
  slice.

---
Previous checkpoint:

# FRICTION-001 — slice 4: review screens say it plainly

- **Objective / authority:** [FRICTION-001](FRICTION-001.md); Gavin: "We have work to do".
  Builder: Claude Code, branch `claude/friction-4`; slice 3 (#277) merged and is merged in.
- **Built:** Plan today names the day instead of an ISO date; Review drops the 16:30 boundary
  wording; Import describes activity files (with calories). Copy only.
- **Verified:** `npm run verify` green: architecture OK, 2,894 passed / one skip, build OK.
- **Next:** PR, green CI, independent review, Gavin's merge.

---
Previous checkpoint:

# FRICTION-001 — slice 3: COMMAND in plain words

- **Objective / authority:** [FRICTION-001](FRICTION-001.md); Gavin: "We have work to do".
  Builder: Claude Code, branch `claude/friction-3`; slice 2 (#276) merged and is merged in.
- **Built:** COMMAND descriptions rewritten in plain words (no "existing …", no "COMMAND ·" self-tag;
  IMPORT HEALTH DATA no longer says sleep only); workout-complete sentence-case test. Copy only.
- **Verified:** `npm run verify` green: architecture OK, 2,892 passed / one skip, build OK.
- **Next:** PR, green CI, independent review, Gavin's merge.

---
Previous checkpoint:

# FRICTION-001 — slice 2: weight in one place, honest last-night sleep

- **Objective / authority:** [FRICTION-001](FRICTION-001.md); #275 (slice 1) merged as 7f11f20;
  Gavin: "We have work to do" (continue). Builder: Claude Code, branch `claude/friction-2`.
- **Built:** BODY home's WEIGHT card is the one weight surface, with LOG WEIGHT opening the existing
  bodyweight sheet; the readout grid drops LAST WEIGHT there. A day-before sleep reads "Garmin ·
  last main sleep" and opens all sleep history. Display/navigation only.
- **Verified:** `npm run verify` green: architecture OK, 2,891 passed / one skip, build OK.
- **Next:** PR, green CI, independent review, Gavin's merge.

---
Previous checkpoint:

# FRICTION-001 — slice 1: the 2:30 AM operator pass

- **Objective / authority:** [FRICTION-001](FRICTION-001.md); Gavin said "start the friction pass
  after it merges" (#274 merged as 42d6c2b). Builder: Claude Code, branch `claude/friction-1`.
- **Built:** BODY's sleep reading agrees with TODAY (last main sleep instead of "Not logged");
  shorter no-target protein line; TRAIN workout titles in sentence case; WeightTrend reuses
  `formatShortDate`. Display/copy only.
- **Verified:** `npm run verify` green: architecture OK, 2,889 passed / one skip, build OK.
- **Next:** PR, green CI, independent review, Gavin's merge. Candidate fixes and ARCH-001 notes
  are in the brief.

---
Previous checkpoint:

# UX-COHESION-001 — slice 3: one way back, quieter BODY, bounded history

- **Objective / authority:** [UX-COHESION-001](UX-COHESION-001.md), approved 2026-10-22; Gavin said
  yes to starting slice 3 after #273. Builder: Claude Code, branch `claude/ux-cohesion-3`, targets
  master (#273 merged as 91e6520 and is merged in).
- **Built:** one back/close grammar (CLOSE for sheets, BACK TO <place> for sub-screens; RETURN TO and
  arrows gone; OPEN WORKOUT for the blocked END DAY); BODY drops the day-start time and the standing
  NAPS "Not logged", and the weight card uses short dates; HISTORY pages 14 days and TRAIN history
  10 sessions with SHOW MORE, keeping a searched day reachable. Labels and copy only, plus paging;
  no data, schema, Engine or capability change. Also folds in #273's non-blocking review notes:
  BODY's busy guard no longer strands a hidden past day, one health-days layout, "Health days"
  region label, plainer GARMIN wording, and a test that choosing GARMIN clears a selected day.
- **Verified:** `npm run verify` green after the master merge: 2,886 passed / one skip, build OK.
  New `BoundedLists.test.tsx`; known full-load TODAY check-in timing flake noted, untouched here.
- **Next:** PR against master, green CI, independent exact-head review, Gavin's merge.

---
Previous checkpoint:

# UX-COHESION-001 — one health-history destination (slice 2)

- **Objective / authority:** [UX-COHESION-001](UX-COHESION-001.md), approved 2026-10-22; slice 1
  merged as #272 (`40147c3`). Codex began this slice locally (not pushed); Gavin asked Claude Code
  to continue it. Builder: Claude Code, branch `claude/health-history` from `40147c3`.
- **Built:** BODY → HISTORY keeps today's records plus one closed **Health history** with DAYS
  (existing day browser, controls shown directly) and GARMIN (measured days + imported sleep). The
  separate "Browse health days" and "Garmin history" are gone from both BODY paths. Garmin measured
  days page ten at a time (previously capped at the newest 7, so older days were unreachable);
  imported sleep already paged by ten. Closing history returns to today. No data, schema, Engine,
  import or capability change; COMMAND already shows import only (slice 1).
- **Verified:** `npm run verify` — architecture OK, 290 files / 2,882 passed / one skip, build OK.
  New `tests/browser/HealthHistory.test.tsx` (320/390 px, a month of Garmin days paged 10→20→30,
  axe, closing returns to today); updated BODY/import/connected-health tests.
- **Next:** PR, green CI, independent exact-head review, Gavin's merge. Remaining UX-COHESION
  slices (quieter BODY/TODAY, back/close grammar) stay separate.

---
Previous checkpoint:

# UX-COHESION-001 — quiet by default

- **Objective / authority:** Gavin approved the expanded mobile UX audit and its preferred
  `Quiet by Default` plan on 2026-10-22. Protected primary-information presentation work. Brief:
  [UX-COHESION-001.md](UX-COHESION-001.md).
- **Builder / baseline:** Codex on `codex/ux-cohesion-001`, starting from freshly fetched master
  `f1aeecf9e194b683bf2b03fa003730f01c2b6349` after GARMIN-005 merged.
- **Current bounded slice:** sleep truth/provenance and calm Garmin import/history. TODAY uses a
  measured Garmin sleep value when no operator-confirmed sleep exists and labels the source;
  operator-entered sleep still wins. Import previews lead with count/date range and lazily render
  individual sessions only on request. The importer no longer appends stored history. BODY keeps
  the combined compact Garmin archive behind one deliberate `Garmin history` disclosure. No data,
  import safety, schema, Engine, guidance, four-tab navigation or capability was removed.
- **Verified so far:** typecheck; focused browser coverage 61/61 across import, Garmin, connected
  health, BODY navigation, phone fit and accessibility at mobile widths. Large-preview regression
  proves 68 sessions create no record cards until review is requested. Full verification passed
  architecture and 2,878 tests / one skip, with one unrelated full-load TODAY check-in timing
  failure; that exact test then passed in isolation and the production build passed. Required CI is
  the clean full-gate authority.
- **Next:** full verification, production acceptance/screenshots, PR, independent exact-head
  review and green CI. Gavin alone decides merge. Later approved UX-COHESION slices remain separate
  so this trust/clutter correction stays reviewable.

---
Previous checkpoint:

# GARMIN-005 — eaten vs burned

- **Objective / authority:** Gavin approved [GARMIN-005](GARMIN-005.md) on 2026-10-22 ("Approved.
  Make it amazing"). PROTECTED: new Health Connect read permissions and new TODAY numbers. Builder
  Claude Code handed the objective to Codex to finish.
- **Branch:** `claude/garmin-005`, [PR #271](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/271)
  against master. GARMIN-004 PR #269 merged with owner approval as `35c9f17` after its exact-head
  CI passed; this branch includes that master integration.
- **Built:** helper 0.6.0 exports hourly total/active calories in compatible activity format 2;
  BEYOND accepts formats 1 and 2 without old imports erasing calories. TODAY shows a conditional
  CALORIES tile, eaten-vs-burned sheet, Garmin freshness/stale notice, 7D/4W/1Y comparisons and
  Weekly's measured Garmin average. No Engine, target, advice, net/remaining or schema change.
- **Finished in handoff:** corrected the 4W expectation to 27 completed measured days; 5/5 focused
  browser tests pass at 320/390 px; refreshed four screenshots; added the brief/wording table and
  UX_DECISIONS ruling. Independent review then found that a newer export with calorie access denied
  could erase stored values or make them look fresh, and active-only data could expose an unusable
  tile. Codex fixed the import to preserve each calorie field with its actual source-export time;
  the tile and its freshness now require total calories. Focused import tests pass 14/14 and focused
  browser tests pass 5/5. The renewed full gate passed architecture and 2,870 tests / one skip, then
  failed six legacy `classifyRisk` subprocess cases at their 5-second limit plus one unrelated
  mode-pin browser timing assertion; earlier attempts likewise timed out only under full-suite load,
  while the affected risk group passed 18/18 in isolation. The production build passes. Required PR
  CI is the clean full gate.
- **Limits:** no Android SDK here, so helper compilation/permission packaging awaits CI. Physical
  phone permission/export, Safari and screen readers remain unverified.
- **Next:** run the renewed full gate and exact-head CI, then renew independent exact-head review.
  Gavin alone decides merge.

---
Previous checkpoint:

# GARMIN-004 — Garmin numbers you can see

- **Objective:** [GARMIN-004](GARMIN-004.md), approved 2026-10-22. Builder: Claude Code. Branch
  `claude/garmin-004`, PR #269 against master after FIELD-AUTHORITY-001 (#268) merged as `e2661cc`.
- **Built:** STEPS and RESTING HR tiles with your usual; detail sheets for steps, resting heart rate
  and sleep (hypnogram, stages, 7D/4W/1Y, table view). Display only.
- **Owner:** Gavin approved merging #269 and #270 on 2026-10-22, wording included.
- **Next:** GARMIN-005 (calories burned, eaten vs burned; new permission, needs a yes).

---
Previous checkpoint:

# FIELD-AUTHORITY-001 — one next thing, one red

- **Objective:** Gavin's PROTECTED brief [FIELD-AUTHORITY-001](FIELD-AUTHORITY-001.md), approved
  2026-10-22. Builder: Claude Code. Branch `ccr-18eb6d33-pxewfy` from master `b3879ac`; PR to follow.
- **Before it:** REDESIGN-001 merged as #261 (`b3879ac`). Independent review PASS at `8211f96`, CI green.
- **Built:** TODAY state machine (real next thing leads, otherwise logging leads with a calm line);
  at most one red, none when calm; check-in said once; no STATUS echo of NOT CHECKED IN; number
  tiles without coaching; compact mode band when the schedule is silent; TRAIN gate as one line
  with neutral QUICK CHECK-IN; COMMAND as search plus eight job rows. Rulings in UX_DECISIONS.
- **Unchanged:** Engine, recommendation selection, schema, events, backup, Garmin semantics, sheets
  and their 2-tap paths, the four tabs and every COMMAND destination.
- **Verified:** full suite 286 files / 2,854 passed / one existing skip; architecture OK; build
  OK; REDESIGN production acceptance passes at 320/360/390/412 with offline reload. 360px FIELD
  evidence in `docs/screenshots/field-authority-001/`.
- **Risks:** the COMMAND browse is new muscle memory; physical phones, Safari and screen readers
  remain unverified.
- **Next:** green CI, independent exact-head review, Gavin's merge decision. SUIT-ALIVE is not started.

---
Previous checkpoint:

# REDESIGN-001 — merged as #261

- **Builder / objective:** owner-approved PROTECTED [REDESIGN-001](REDESIGN-001.md).
  Branch `codex/redesign-001`; [PR #261](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/261).
  Codex built items 1–8. On 2026-10-22 Gavin asked Claude Code to finish it; Claude Code
  completed the final gate with a single test-only fix.
- **Baseline:** started at master `9f0f2c23efadb7925051172e5eeac48f5882f70f`; integrates master
  `cb4f0df7f1c35843f7aa8d5dc53b42050fd4969e` with its Garmin import/share-target/source behavior.
- **Done:** frozen attachments committed unchanged; items 1–8 implemented, with the locked
  rulings recorded in UX_DECISIONS.
- **Approved exception:** Gavin's “Yes, I approve” on 2026-10-22 authorizes the bounded canonical
  meal/provenance extension for one-off meals and fractional servings. [Ruling](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/261#issuecomment-6330409263).
  No schema, backup format, migration, Engine rule, dependency or protected-fixture change.
- **Final fix:** CI at `4d26418` had one failure (2,851 passed). The LAST TIME `recordedAt` test
  read `getPerformedSets(...)[0]`, which comes back in random id order, instead of set 1. The
  test now selects set 1. CI at `74b44c1` then hit two meal-test races (route checked before the
  sheet rendered; axe mid entry animation; a read failure injected before the sheet's own
  saved-meal read finished). Each now waits for its precondition. Test-only.
- **Verified:** `npm run verify` passes locally: architecture OK, 286 files / 2,852 passed /
  one existing skip, build OK. Built production acceptance (`scripts/verify-redesign-001.mjs`)
  passes at 320/360/390/412 px with offline cold reload; screenshots and
  `final-acceptance.json` refreshed in `docs/screenshots/redesign-001/`.
- **Next:** green required CI on the final head, then an independent exact-head review by a
  reviewer that did not build this PR. Gavin alone decides merge.
- **Preservation / limits:** unrelated daily-operations work remains in stash
  `e1396c8e7ab549dec117e0f631a0c7e1144af309` (Codex's machine); do not apply it here. Synthetic
  test data only. Physical phones, Safari and screen-reader/device-keyboard testing remain
  unverified; the existing bundle-size warning remains.

---
Previous checkpoint (historical; Garmin is not this objective):
# GARMIN-003 — Garmin fills in your record

The owner approved this on 2026-10-22: brief [GARMIN-003.md](GARMIN-003.md), rulings in
UX_DECISIONS → GARMIN-003. GARMIN-002 is complete (#262, #263, #264), with SEND TO BEYOND
verified on the phone.

Current: PR 1 (history) on `ccr-83cf6ed8-ug1ym9` from master:
- the helper's READ FULL HISTORY with "Access past data" (0.5.0);
- both file formats and SEND TO BEYOND accept up to 366 days / 8 MiB.

PR 1 is #265. PR 2 (Garmin sleep becomes a sleep entry, approach A, plus baselines) is stacked on it. Display
changes and advice wording wait for #261 (REDESIGN-001, Codex). Each PR needs an independent
review and the owner's merge.

---
Previous checkpoint:

# GARMIN-002 — Garmin steps and heart rate in BEYOND

Owner-approved PROTECTED objective; brief [GARMIN-002.md](GARMIN-002.md). Builder: Claude Code.
#262 merged at 0f288f9 after two independent exact-head PASS reviews. The owner verified it on
the phone: helper 0.3.0 installs, reads 73 hours of steps/heart rate plus sleep, and BEYOND
(schema 15) imports both files and shows them under BODY → MEASURED · GARMIN.

Follow-up A (#263) merged at 614ed17: lived-day cards are capped at 24 hours, stretches with no
BEYOND day show separately, sleep times are readable, and heart rate never shows "?".

Current: follow-up B, **SEND TO BEYOND**, on branch `ccr-83cf6ed8-ug1ym9` from 614ed17:
- The helper shares its files to the installed BEYOND app through Android's share sheet (0.4.0).
- BEYOND is a Web Share Target; a small handler loaded into the service worker parks the files.
- COMMAND → IMPORT HEALTH DATA previews both; nothing imports until each is confirmed.

Phone check after merge: if BEYOND doesn't appear in the share sheet, re-add it to the home
screen. #261 (REDESIGN-001, Codex) is still open. Every PR needs owner merge approval.

---
Previous checkpoint:

# GARMIN-001 — physical-phone installation diagnosis

#258 merged at 8581af586facf1b08a29347c28787b5e4810db3a after owner approval.
Reviewed source 3d73cdeb; 2741 tests pass/1 skipped; app/Android build and packaged permission
checks passed. The delivered APK is verified against its original CI checksum/signature.

The owner cannot install it on Android 16 / Nothing OS 4.1: only a generic not-installed
toast. Chrome and Files by Google already have installation permission. Cause unconfirmed.
Do not repeat the same install instructions or claim the physical phone is validated.

Builder Codex; branch codex/garmin-001-install-diagnosis from 8581af586facf1b08a29347c28787b5e4810db3a. The branch's draft PR
adds a time-bounded Android 16 emulator probe of the exact original APK. No app/data/
permission changes. [Current bounded brief](GARMIN-001.md), phone follow-up section.
Verified (run 39274986894): the original APK installs and opens on a clean Android 16 emulator, so the
file is sound and the rejection is phone-side; signature conflict with an earlier helper build is
the leading hypothesis. Next: owner runs the uninstall/extract/adb steps in GARMIN-001.md
("Probe result"); correct only what that demonstrates. ADB success cannot validate
Nothing's user-facing installer/security policy. #257 remains open; every new PR still needs
owner merge approval. #254 remains separate.

---
Previous checkpoint:

# GARMIN-001 — local sleep import, PR #258

Owner authorized the sleep-only implementation in [#257](https://github.com/gavinlohnes/neo-beyond-lohnes/issues/257).
Builder: Codex. Protected. Starting master: a6d315dd83f7f540782a540d37a32c9a5224a1f2.
Branch: `codex/garmin-001-sleep-import`. [PR #258](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/258)
is the active review/delivery record. [Bounded brief](GARMIN-001.md).

Built: foreground READ_SLEEP-only Android helper, local file transfer, COMMAND preview and
explicit confirmation, BODY source evidence. Additive v14 stores latest pointers, immutable
source revisions and atomic receipts. Source timestamps retain nanosecond revision order.
Optional explicit existing-day association; no automatic day assignment, canonical events,
manual log changes or Engine input. Native backup roundtrip; old native/legacy replacements
clear external evidence; failed replacements roll back. No other health categories/sync.

Verification: parser/source/limit/stage tests; import duplicate/concurrent/revision/rollback
and canonical primary/supplemental preservation; old database upgrade; native and legacy
restore tests; browser preview/cancel/confirm/focus/retained navigation/axe/320–412 px.
The isolated Android workflow runs unit tests, lint, APK build, packaged permission checks,
and emits source SHA/checksum/signing identity. Existing required PR Verification is unchanged.
Check [the PR's live checks and final review](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/258)
for execution results and exact current head; this checkpoint is committed before final CI.

Independent source review at 0e915fac found no blocking findings after fixing the source
version precision issue. The final Android compile correction uses AndroidX's heading API;
final exact-head review and green app/Android checks remain the delivery gate. The local
managed proxy is unreachable and dependencies are absent: GitHub CI supplies execution
proof. Never infer a pass from a cancelled or superseded run.

APK and phone steps: [android/health-bridge/README.md](../../android/health-bridge/README.md).
The phone-test artifact is attached to the passing Health Bridge run for the exact reviewed
PR head. It is debug-signed; later builds may require uninstalling the helper only before
installing again. No production signing keys are stored in Git. Real phone, Health Connect
permission/save behavior, Safari and a screen reader remain unclaimed until tested.

Next: resolve any final CI/review findings, deliver the verified artifact, obtain this PR's
owner merge approval, then run the brief phone smoke test. Implementation authorization is
not merge approval. #254 remains separate; TONIGHT #255/#256 are already merged.

---
Previous checkpoint (retained):

# Current checkpoint

## Current preparation — workflow command and Garmin discovery

Owner instruction, 2026-10-19: "Lets get to a good point to start work". Codex is preparing
the existing approved workflow PR #254 and the next discovery brief.

**Released:** master a6d315dd83f7f540782a540d37a32c9a5224a1f2.
- #255 merged at ea03c7266157f60c3bcc13f80063323a0df9259b: idle rollover plus deadline retry.
- #256 merged at a6d315dd83f7f540782a540d37a32c9a5224a1f2: the TODAY shift loop and headline fixes.
- Both have independent exact-head PASS. Final required CI [39250635029](https://github.com/gavinlohnes/neo-beyond-lohnes/actions/runs/39250635029):
  272 files, 2,700 passed, 1 skipped; architecture, TypeScript and production build pass.
- Physical-device, Safari and screen-reader checks remain unclaimed.

**Current PR:** [#254](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/254),
codex/advance-beyond-command. Original owner-approved PROTECTED workflow objective, Builder Codex.
One shared DEV-FLOW-002 protocol, thin Claude/Codex skills, AGENTS/roadmap routing and governance
classification for .agents/. No application, dependency, CI or protection change.
Reconciled with released TONIGHT master, preserving both histories. The prior reviewed head
78650e7 is historical; the current head needs fresh independent review and green required CI.
Then it awaits owner merge approval. This preparation instruction does not authorize that merge.

**Next discovery:** [GARMIN-001 proposal, #257](https://github.com/gavinlohnes/neo-beyond-lohnes/issues/257).
Prepared for review; integration implementation is not approved. First collect phone model/OS,
Garmin watch model, and actual Garmin Connect permissions/recent records in Health Connect.
Verify current official support and the deployed PWA's access constraints, then recommend one
route and present a bounded implementation brief. No native wrapper/backend/provider/schema
or Engine integration has started.

**Environment:** connected GitHub tools work. The local workspace has partial review-fix files,
no complete checkout or app dependencies, and its configured proxy was unreachable. Do not
treat those partial files as a fresh checkout or claim local full verification.

The sections below preserve the previous checkpoint. This summary and live PR evidence
supersede their pending-review/merge wording.

## Previous objective — TONIGHT-001 (merged 2026-10-19)

Gavin approved TONIGHT after the product discovery proposal. Brief: [TONIGHT-001.md](TONIGHT-001.md);
rulings in UX_DECISIONS → TONIGHT-001. Builder: Claude Code. Branch `ccr-83cf6ed8-ug1ym9`; [PR #255](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/255).
Starting master: `d042a1f7c54a8e50dcf045a76f62a4a819d00504` (the #253 merge; no open PRs).
POLISH-001 and POLISH-002 are merged (#251, #252, #253). The POLISH-001 handoff below is history.

**PR 1 — no frozen days (this branch).** A due 16:30 rollover no longer waits on a workout with
nothing recorded for 2 hours. The workout stays ACTIVE and resumable on its own day, and TODAY
labels it "WORKOUT STILL OPEN · started Thu 06:52". A workout in use, explicit END DAY and the
new-day-start fallback keep the CONTINUITY-001 guard. No schema, event type/payload, dependency or
recommendation change. Files: `engine/dayRollover.ts` (pure `workoutHoldsRollover`),
`application/commands.ts` (rollover reads the workout's sets in its transaction),
`ui/screens/today/ActiveWorkoutCard.tsx`, the TODAY stale note copy.

**Verification:** full suite 270 files: 2,683 passed and 1 existing skip. The two failures it found
were tests whose setup needed a workout to defer the rollover: `modePinExpiry` and
`ConnectedHealth`'s read-only browsing test. Their workouts sat idle for hours, so I made them
recently active and kept the assertions unchanged. The browser `ModePinExpiry` test has the
same premise and failed under full-suite load (a rollover timing race); its workout is now in use
at 16:30 too. Both pass. Architecture (269 files),
TypeScript and the production build pass. The three new idle-release integration tests fail on
the old code and pass with the fix. `check:risk` confirms the change is PROTECTED.

**Remaining risks:** physical-device, Safari and screen-reader checks are unclaimed. A workout
that started before a rollover still records its completion on its original day. That's
intended: day-scoped readers of workout events count that completion on the old day.

**PR 2 — the shift loop on TODAY** (branch `claude/tonight-001-pr2`, stacked on #255; Gavin
approved starting it on 2026-10-19).
- **Morning call:** RECOVER asks one question: train / short / sleep first. On a day off the wake
  card asks start / later / not today. Answers go through the existing PLANNED_WORK_SET, and TRAIN
  opens with the chosen variant.
- **QUICK LOG and the MEAL sheet:** recent saved meals and the last water amount, each one tap
  through the canonical commands with UNDO. MEAL opens a searchable sheet on TODAY.
- **Night closed, briefing, headline, protein:** the night's totals; the briefing's "Tonight so
  far"; the honest all-clear headline; ADD WEIGHT instead of NO TARGET.
- **Week Ahead:** off days plus the morning after a block's last shift.
- **Declutter:** online food lookup, Minimum Day and Small Steps reached through COMMAND.
- **Rulings:** all recorded in UX_DECISIONS → TONIGHT-001.
- **Unchanged:** no schema, event type, Engine rule or dependency change.

New: `application/tonightQueries.ts` (read-only) and `today/WorkoutCall.tsx`, `QuickLog.tsx`,
`NightClosed.tsx`. TRAIN gains the `WORKOUT_STANDARD` / `WORKOUT_REDUCED` destinations.
**Tests changed:** about 20 existing browser files encoded the old TODAY layout. They're updated
to the approved behavior and keep their guarantees (single guidance, focus return, drafts, row
cap, no stray writes). A shared `helpers/mealSheet.ts` opens BODY through the MEAL sheet.
**Acceptance:** [`screenshots/tonight-001`](../screenshots/tonight-001/README.md),
`scripts/verify-tonight-001.mjs`; 320/360/390/412 px with no overflow, axe violations or page
errors. The capture found focus dropping to the page after a QUICK LOG tap; it's fixed and
covered by a test.

**Review fixes (2026-10-19, Codex; owner: "Fix them"):** PR 2 is
[#256](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/256), stacked on #255.
Codex owns only the bounded follow-up repairs to Claude's implementation.
- #255 includes the existing labelled-section fixture repair and now schedules the held day's
  next check at the workout's idle deadline. The existing transaction revalidates any later
  activity; a new logged/skipped set postpones release. Added integration and mounted-App
  regressions. This branch incorporates #255's fix commit `20c0427442bc3c00a709a73f6eea2cf4c85f92f3`.
- #256 now shares day-keyed reactive question state between TODAY's headline and WorkoutCall.
  CHANGE reopens both together; LATER updates both immediately. Editing/deferment does not
  rewrite the canonical plan. Added after-shift change/re-answer and day-off change/LATER
  regressions, retaining the existing no-write assertions.
- #255 head `20c0427442bc3c00a709a73f6eea2cf4c85f92f3` has green required CI:
  2,690 passed, 1 skipped; architecture, TypeScript and production build pass. #256 now targets
  master so required CI can verify the combined tree before integration.
- Local dependency/browser runs remain unavailable (configured proxy unreachable, no supplied
  checkout). Node syntax checks and isolated checks of the actual scheduling query/shared
  state hook pass with in-memory dependencies; these are not browser/Dexie verification.
- Gavin authorized integration if ready: "Just merge it you think it\'s ready". A separate
  Reviewer is assigned to the exact repaired heads; the implementing session supplies no
  self-review PASS. Merge #255 first, then #256, only after independent review and green CI.
  #254 remains untouched. Physical phone, Safari and screen reader are unclaimed.
  After TONIGHT: Gavin's 5-minute Health Connect check, then a Garmin brief.

## Previous objective — POLISH-001 (2026-10-18, PROTECTED, merged)

Gavin approved the attached brief, committed unchanged as [POLISH-001.md](POLISH-001.md).
Builder: Codex. Branch `codex/polish-001`; [PR #251](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/251).
Fresh starting master: `82e923453e8634e89fccf7feee02edb6ad0eb161`; #250 was open (checkpoint only).
Master `b293472b0d7a839bc5b1d7c799592fcfefb9f2ea` (including #250) is now merged into this
branch; the checkpoint preserves its merged-session history below.
All 13 items implemented; the brief and each item were pushed separately. Rulings are in
UX_DECISIONS. Acceptance fixes preserve the water More-route focus and active-workout fold.
The skyline has its own band, real-clock sky/windows, and recommendation-gated beam.
TODAY has one persistent Engine card, numbers, action row, mode rows and Tools. Water logs
in place with canonical undo. SAVE & LOG retains the saved meal on log failure. Late RECOVER
asks about main sleep using the existing draft. Copy, return context and HH:MM are updated.

**Verification:** `npm run verify` passes: architecture, 269 test files / 2,676 tests passed,
one existing skip, TypeScript and production PWA build. Thirteen new browser cases cover
canonical log/undo double taps, water retry/repeat, SAVE & LOG failure recovery, late sleep
prompt/draft boundaries and no-write NOT YET, scene gating, order and fold. Existing navigation,
focus/drafts, browser Back, privacy, backup and protected-fixture regressions pass.
Built PWA passes 320/360/390/412: four modes, source/name separation, one action-red button,
390×844/360×800 fold, 23:40/11:00 sky, water/undo, offline save and cold reload. Synthetic
screenshots and reproduction: [polish-001/README.md](../screenshots/polish-001/README.md).
The inherited stealth test used the real clock; minute 42 falsely matched the hidden total.
Only Date is pinned in that test fixture; its privacy assertions and production stealth stay.
No Engine, phase derivation, schema, command/event semantics, backup or dependency changes.
Chromium automation only; physical-device/Safari/screen-reader checks are unclaimed. The
existing bundle-size advisory remains. The final PR Handoff binds published SHA and CI.

**Review follow-up (2026-10-19):** Claude blocked `57631dba553f6355d3bf581dcdb98558a2bb7bde`
on two test-only P2 timing races; no product defects were found. The sleep-prompt test now
awaits the pinned header mode, then polls for prompt absence. Water double-undo now awaits
the visible UNDO button before taking its DOM element and clicking twice. Assertions and
production behavior are unchanged. The focused POLISH browser suite passes all 13 cases.

**Next:** stop for Claude Code’s renewed independent exact-head review against POLISH-001, then
Gavin’s separate merge decision after green required CI. No merge or deployment by Builder.

The sections below are historical starting-checkpoint content. Read live PRs for status.

## Previous state — merged session work (2026-10-19)

Everything from the 2026-10-18 session is merged on Gavin's approval ("Merge all 6"), in this
order. Each Protected PR had an independent exact-head PASS from Codex and green required CI.
After each merge the next branch took master in; the only conflicts were append-only
(`REVIEW-001.md` delivery notes, one CSS block), resolved by keeping every section, then the full
gate ran on the combined tree before pushing.

| PR | What | Lane | Review |
|---|---|---|---|
| [#242](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/242) | SUIT-001: stealth, four glitch signals, SYSTEMS line and readout ([SUIT-001.md](SUIT-001.md)) | PROTECTED | Codex PASS at `9501e30` after one BLOCK round (stealth writes left BODY/SYSTEMS stale; a keyboard Enter after a real long-press was swallowed) |
| [#245](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/245) | REVIEW-001 monthly review (every 4th week from the first saved review; 28-lived-day body composition) | PROTECTED | Codex PASS at `569badf` after two BLOCK rounds (a hidden photo could show after a failed, then a pending, re-read) |
| [#246](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/246) | REVIEW-001 optional photo framing guide (in-app camera, last same-pose photo as a ghost) | PROTECTED | Codex PASS at `d88b85a` after two BLOCK rounds (capture didn't match the 3:4 preview crop; a just-hidden photo could be the ghost during a pending/failed read) |
| [#247](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/247) | REVIEW-001 Body questions in the Review hub (#9, #16, #20, #21) | PROTECTED | Codex PASS at `2181a48` |
| [#248](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/248) | REVIEW-001 weight answer: rate, usual swing, goal date, weigh-in timing | PROTECTED | Codex PASS at `ffd1584` |
| [#249](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/249) | BODY hold-to-DELETE on water, sleep and bodyweight entries (field report: three accidental 16 oz logs; correcting to 0 silently failed) | FEATURE | Owner merge; existing void commands, no event/schema change |

**Verification:** full local gate on all six combined: 268 files, 2,663 passed, one existing
skip; architecture, TypeScript and production build pass. Required CI green on every merged head.

**Remaining risks / unclaimed:** physical-device, Safari and screen-reader checks for all of the
above, including a real phone camera for the framing guide. `scripts/verify-suit.mjs`'s offline
step depends on the runtime reporting `navigator.onLine` false after an emulated offline reload;
some Chromium runtimes don't (Codex's network-blocked checks covered the same ground).
`ModePinExpiry` (#243's test) flaked once at 412 px under full-suite load.

**Next (historical, before POLISH-001):** Gavin picks the next objective. Suggested: a field pass on the phone through a real
shift using SYSTEMS, stealth, BODY delete and the review hub, then fix what it finds. The first
monthly review lands four weeks after the first saved weekly review.

## Previous objective — BODY-PROGRESS-001 (2026-10-18, merged in #244 at `118bd89`)

Gavin approved BODY Progress: clearer overview, dated measurements, and progress photos.
Builder: Codex; branch `codex/body-progress-001`; [PR #244](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/244).
Brief: [BODY-PROGRESS-001.md](BODY-PROGRESS-001.md). PROTECTED. Starting master `9f9100a`;
reconciled with owner-merged #243 at `85db25bbc9e6937007cffd88c34c74c3b197600c`.
Complete: recorded overview; retained Trends / Measurements / Photos; canonical dated saves,
measurement correction provenance, explicit photo capture/import/save, same-pose comparison,
metadata correction and confirmed hide/delete. Existing trends/source navigation stay.
Full verification exposed and repaired the inherited slow meal-read focus handoff; the existing
regression now reproduces its failing ordering deterministically. Saves and undo are unchanged.
Verified source head: `21932d9f23b7a4be3682aa2f0dfa4d20cc351dac`. Full gate: 255 files,
2,582 tests passed, one existing skip; architecture (247 files), TypeScript and production build
pass. Built PWA passes 320/360/412: keyboard/focus, retained measurement/photo drafts, canonical
writes/corrections, offline cold reload/reads/saves, 44 px controls, unclipped labels, zero axe
violations and page errors. [Reproduction/screenshots](../screenshots/body-progress-001/README.md).
No Engine, schema, command/event semantics, backup or dependency change. No SUIT/TODAY/global
style edit. PR #242 stays with Claude. Physical camera/iOS/Safari/virtual-keyboard/screen-reader
and large-library checks are unclaimed; the existing bundle-size advisory remains.
Next (historical): Claude's independent exact-head review passed at `14f3c1c` with green CI;
Gavin approved and it merged at `118bd89` (2026-10-18).

The #243 handoff below is historical: Gavin merged it at `85db25b`; its pending-review/merge
lines are superseded. This objective changes BODY only and includes that released fix as base.

## Previous objective — fix mode pin expiry at 16:30 (2026-10-18, merged in #243 at `85db25b`)

Gavin approved the bounded follow-up to the [reproduced PR #241 finding](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/241#issuecomment-6247508068).
Brief: the follow-up section in [COMMAND-CENTER-001.md](COMMAND-CENTER-001.md).
Builder: Codex; branch `codex/fix-mode-pin-expiry`; [PR #243](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/243). Starting master:
`9f9100ade1d54f4f4368759fb73afcb7f1201a20`. Conservative PROTECTED review lane.
Repair only: presentation pins reset at 16:30 even if the canonical day remains open for a
workout. Preserve all records, Engine authority, drafts, backup contracts and manual control.
Implemented: timestamped local UI pins with released phase-only compatibility; calendar-boundary
expiry independent of canonical rollover; live TODAY/direct-launch/visibility/pageshow refresh; mode tokens
published before paint; retained deadlines survive delayed renders. All forms, records and Engine authority remain.
Verification: 254 test files / 2,570 passed / one existing skip; architecture (244 files),
TypeScript and production build pass. Built PWA passes at 320/360/412: retained workout day,
Capture focus/draft and set draft, zero canonical expiry writes, direct offline expiry, offline
save and cold reload without duplicate records. Final CI and independent review bind the exact
published head in the follow-up PR. Physical-device/Safari/screen-reader testing is not claimed.
Next (historical): Gavin merged #243 at `85db25b`.
PR #242 (SUIT-001) and #204 remain separate and untouched by this Builder.

The previous #241 handoff below is historical: its final implementation head `259d139` received
independent PASS and green CI, then Gavin merged #241 at `9f9100a`. Its pending-merge lines no
longer describe live state.

## Previous objective — COMMAND-CENTER-001 (merged #241 at `9f9100a`)

Gavin authorized GPT Work to complete the existing objective on branch `ccr-8a82e4b3-4ub4x2`,
[PR #241](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/241). No merge authorized.
Brief: [COMMAND-CENTER-001.md](COMMAND-CENTER-001.md). Starting master remains `4fda717`.
Arrival head: `c717801` (slices 0–3 done, slice 4 WIP). Only other open PR is isolated lab #204.

**Implementation complete: slices 0–5.**
- Modes, placement-only day pins, optional separate work-day record, WATER / MEAL / LOG and
  searchable COMMAND were already implemented. Engine identity and canonical commands stay.
- Finished navigation: retained tabs/subviews, browser Back/Forward, open-sheet dismissal on
  Back, visible focus restoration, COMMAND query and settings-draft retention. TRAIN re-tap
  returns to its canonical session/root without discarding workout/set input.
- A manual pick now pins even when it currently agrees with the schedule; only Follow schedule
  clears it. Foreground Minimum Day hydration suppresses duplicate Advisory water shortcuts,
  while preserving the advisory evidence and existing log/undo commands.
- Identity: one-cut action surfaces, header reticles/ruler, original gray skyline and real-time
  windows/crimson sky, recommendation-gated searchlight, one mode-change sweep, mode tokens,
  live-mode boot and once-per-lived-day fuel-reading decrypt. Reduced motion keeps static
  scenery and skips animated feedback/decrypt; hidden TODAY spends no animation work.
  RECOVER quiets ruler/bars and slows motion without hiding factual sleep guidance.
- Display-only recommendation reason copy; WHY ends in user choice. No Engine text changed.

**Verification:** `npm run verify` passes: architecture, 252 test files, 2,556 passed / one
existing skip, TypeScript and production PWA build. Added coverage for same-as-schedule pin
continuity, retained settings input, mode identity/contrast at 320/360/412 and clock-driven city.
Built PWA acceptance passes at all three widths: modes, COMMAND/Weekly Review, browser Back and
Forward, both native sheets on Back, draft continuity (meal, sleep, workout set, Capture, Journal,
Plan Today), exactly-once writes, recurrence/release preservation, offline cold reload and writes.
Synthetic screenshots + acceptance JSON: `docs/screenshots/command-center-001/`.

**Review/CI:** independent exact-head verdict and required CI belong to PR #241 at its final
commit. Read the live PR before integration; no self-review or merge. Publication uses connected
GitHub tools because local Git has no push credential; published Git tree hashes are checked
against the staged local tree. No new branch/PR, dependency, schema, backup or Engine change.

**Limitations:** automated Chromium, not physical-device/Safari/screen-reader testing. The
existing production bundle-size advisory remains. Small phones may scroll; header effects add
no height. SUIT-001, CHRONICLE, TRAIN expansion, BODY redesign and reuse audit are not begun.
**Next (historical):** Gavin merged #241 at `9f9100a` on 2026-10-18.

## Previous objective — REVIEW-001 Weekly Review dashboard (2026-10-18, PROTECTED, merged in #240 at `4fda717`)

Gavin approved making MORE → REVIEW's weekly section match the Ultimate prototype's Weekly Review
("approve, Claude Code builds it", 2026-10-18). Builder: Claude Code. Started at master `8e5dbab`.
Scope and rules: "Weekly Review dashboard" in [REVIEW-001.md](REVIEW-001.md). Read only apart from
#238's existing save-review form; no schema, event, backup, Engine-evaluation or dependency
change. Merged on Gavin's approval at `4fda717`.

## Previous objective — REVIEW-001 weekly review loop (2026-10-17, PROTECTED, merged in #238 at `8e5dbab`)

Gavin authorized shipping the connected foundation, then building the weekly review loop.
Builder: Codex, on `codex/review-001-weekly-loop` from master `554b557`. Scope, event/backup
semantics, validation and deferred work are in the weekly-loop delivery section of
[REVIEW-001.md](REVIEW-001.md). One additive review event, no schema change. Integrated master
`5a54a1f` after #239; a delayed week-refresh draft-loss bug was found and fixed with a browser
regression. Verification and independent review are recorded in
[PR #238](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/238). Merged at `8e5dbab`.

> **Status correction, 2026-10-18:** #232 (`fda45c2`), #236 (`4404b01`), #237 (`554b557`),
> #238 (`8e5dbab`), #239 (`5a54a1f`) and #240 (`4fda717`) are all merged. "Next" lines in the
> older sections below are historical handoffs, not open actions.

## Previous objective — REVIEW-001 Phase 1a storage slice (merged #239) (2026-10-17, PROTECTED)

Builder: Claude Code. Starting master `4404b01` (RESTORE-COMPAT #236 merged); branch
`ccr-f27681c1-sb8gif`; PR linked from the branch. Scope and evidence are in the "storage slice"
section of [REVIEW-001.md](REVIEW-001.md).
- Body measurements as dated, correctable events.
- A `progressPhotos` table at schema v13. Photos are re-encoded so their metadata is stripped,
  and they travel in the normal backup.
- Hide or delete a photo permanently (Gavin, 2026-10-17).
- Measured backup sizes.
- The #236 review's follow-ups: a pre-v4 restore test and a guard for an unversioned backup.

No UI, Engine, TODAY or dependency change. Independent exact-head review passed at `7f2cf39`;
Gavin merged #239 at `5a54a1f`. Measurement and photo screens remain a later slice.

## Previous objective — RESTORE-COMPAT (2026-10-17, PROTECTED, merged in #236 at `4404b01`)

Gavin asked to keep moving after REVIEW-001's plan (#231) and its photo-backup ruling (#235,
option (a): photos in the normal backup) merged. Builder: Claude Code. Starting master `ca67da6`;
branch `ccr-f27681c1-sb8gif`; PR linked from the branch.

Found while starting Phase 1a's storage slice, and fixed first on its own: restoring any native
backup exported from an older schema failed with "Database version differs" (dexie-export-import
refuses any version but the live one). That affects every native backup made before schema v12.
Phase 1a's own acceptance needs older backups to restore after its schema bump.

The fix is in `persistence/backup.ts`:
- An older backup restores, still replace-only. Tables it predates are cleared, and missing
  settings rows read as their defaults.
- A newer backup is refused at preview with a plain message, before anything is cleared.

No schema, event, Engine, fixture, dependency or CI change; the legacy `BEYOND_BACKUP` path is
untouched. Independent exact-head review: PASS at `a1a7408`, renewed at `4a6fd7d` after
`origin/master` was merged in (#232 and #237). Merged on Gavin's approval at `4404b01`.


## Parallel objective — REVIEW-001 read-only hub slice (Codex, merged in #237) (2026-10-17, PROTECTED)

Gavin directed major progress after #232. The approved REVIEW-001 Phase 1a plan has merged;
Codex is building its first read-only question/evidence hub slice on `codex/review-001-readonly-hub`,
starting master `ca67da629628520ab1026d9d03114648e7bcb588`. Scope, floors, exclusions and
remaining Phase 1a work are recorded in the delivery section of [REVIEW-001.md](REVIEW-001.md).
Full local verification: 235 files / 2,432 tests passed / one existing skip, architecture,
TypeScript and production build pass. Two additional protected-fixture read-only cases and
final-copy browser checks pass (7 focused cases). Built PWA passes at 320/360/412 including
canonical save/rollover, source History/focus return and offline cold reload. Final head and
independent review are tracked in the active PR linked from that branch.
No storage/backup/TODAY change; #236 is separate. #232 now has independent exact-head PASS
at `742a2e4` and green required CI; Gavin approved shipping it, and #232 merged at
`fda45c2`. #237 is now reconciled with that master; independent review and CI must bind its new head. Next: verify this slice, independent exact-head review, then owner merge decision.
## PR #232 B1 follow-up and master integration (2026-10-17)

Gavin authorized fixing B1, merging latest master into #232, verification, push and a new
independent exact-head review. Builder: Codex. Started at `aa95684`; B1 fixed in this follow-up.
Merged `origin/master` at `ca67da629628520ab1026d9d03114648e7bcb588` with a merge commit,
not a rebase. The only conflict was this checkpoint; both branches' entries are preserved below.
That master includes REVIEW-001 plan #231, Training Record #233 and follow-up #234, and
photo-backup ruling #235. #236 has not merged at the integration check. The older status notes
below describe their original handoffs; the merged master state in this paragraph supersedes them.
ROADMAP_1.0 and UX_DECISIONS auto-merged; #232's entries remain under Active priority and the
Connected Health Record decision alongside the preserved REVIEW-001/photo-backup decisions.

B1: FUEL button names now include the displayed protein amount/optional target and water amount,
plus “explore records”. Visible text/layout/placement and round-trip behavior are unchanged.
New browser coverage checks both target/no-target names and updates after canonical UI protein
and water logging. N1–N3 remain unchanged; they are nonblocking and outside this repair.
Verification and review request for the new head are recorded on PR #232. The prior independent
BLOCK at `aa95684` is historical evidence, not approval of this head. Next: independent review
of the pushed head and Gavin's separate merge decision. No merge/deployment of #232 authorized.

## Previous objective — ULTIMATE-FOUNDATION-001 (2026-10-17, PROTECTED, merged in #232)

Gavin approved the Connected Health Record proposal ("Approved.", 2026-10-17).
Brief: [ULTIMATE-FOUNDATION-001.md](ULTIMATE-FOUNDATION-001.md). Sole Builder: Codex.
Fresh starting master `8c8b25feb90fd49f30e40d283547e90a6f4dd65a` (PHONE-FIT-001 #230 merged).
Branch: `codex/ultimate-foundation-001`; [PR #232](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/232), open, not merged.

Implemented: BODY readings open their existing metric explorer; recent/older lived-day browsing
is read-only and groups early-ended/restarted segments. A raw water series reuses ledger truth.
Exact observation/day/root references open effective source records, existing current-day
correction controls, and the complete History day focused on the canonical event. Return retains
metric/range/point, position, focus and unfinished forms. TODAY's existing FUEL readings link to
that evidence in their existing placement; no new row, guidance or recommendation.

Queries are application-only, read-only and source-linked. Same-time weigh-ins retain canonical
order/identity; missing remains missing, ambiguous main sleeps stay separate, old day ownership
is preserved. History re-reads on re-entry and ignores superseded requests. Retained progress
keeps exploration state but performs no hidden progress reads after quick logs.

Verification: full local gate 232 files / 2,417 passed / one existing skip; architecture (215
files), TypeScript and production build pass. The ignored local config only selects system
Chromium; full Node/browser selection and assertions remain enabled. Final-code production PWA
passes at 320/360/412 px: source/History focus and return, retained draft, canonical correction,
offline exploration/writes/reload, no browsing writes, no page errors/overflow and one main.
The 12 new browser cases also cover reduced motion/axe on sources and History, hidden-query
cost, explicit metric entry after a retained timeline, same-head History reopening and active
workout-deferred rollover. Required CI and independent review are tracked on the final PR head.
Evidence: [screenshots and reproduction](../screenshots/ultimate-foundation-001/README.md).

Unchanged: Engine/rules, schema/domain/events/commands, persistence/backup contracts, dependencies,
protected fixtures, CI/protections, primary tabs, laboratory #204. REVIEW-001 #231 is separate;
no Review hub, weekly/monthly/focus/measurement/photo or Phase 1b/C2 implementation is included.
Its docs touch UX_DECISIONS/ROADMAP too; check the merge diff and serialize shared implementation.

Limits: physical iPhone/Safari/Android keyboard and screen-reader testing unrun. Drafts remain
session-local; browser process eviction/reload clears them under existing warnings. Existing
single-browser-tab write limitations and bundle-size advisory remain. No historical repair.
Next: confirm required CI on the final pushed PR head, then assign independent qualified
exact-head review against the brief. The PR binds the exact SHA and records CI. Gavin alone approves merge/deployment;
no merge or deployment is authorized here. Other carried-forward unapproved work below stays separate.

## Previous objective — ULTIMATE-FOUNDATION-002 review follow-up (2026-10-17, ROUTINE, merged in #234)

The four nonblocking findings from #233's review were fixed in #234, merged at `5e0f86d` on
Gavin's instruction. REVIEW-001's plan merged in #231 (`69f9538`), and its Decision 2 ruling
(photos in the normal backup) merged in #235 (`ca67da6`).

## Previous objective — ULTIMATE-FOUNDATION-002 Training Record (2026-10-17, PROTECTED, merged in #233)

Gavin approved the Training Record slice ("approve, Protected, Claude Code, defer pause",
2026-10-17). Builder: Claude Code. Brief: [`ULTIMATE-FOUNDATION-002.md`](ULTIMATE-FOUNDATION-002.md).
It adds TRAIN → HISTORY, a session record and lift history during a workout, all read only, plus
one shared volume rule. Pause/resume is deferred.

PR #233 merged at `48e7b54` on Gavin's instruction. Merged head
`be49052149978b38fed9ac1a35b6c00e00750129` had green required PR Verification and an independent
Claude Code exact-head PASS review on PR #233. Four nonblocking findings from that review are
handled by the follow-up above. No deploy.

Open work alongside it:
- #232 (ULTIMATE-FOUNDATION-001, Codex) is blocked on review finding B1 (TODAY FUEL button
  names hide their values). Codex fixes it, then it needs a new exact-head review.
- After #232 merges, the session record gets a link to its History day using #232's History
  focus plumbing.
- #231 (REVIEW-001 plan) merged at `69f9538`.

## Previous objective — PHONE-FIT-001 (2026-10-14, ROUTINE, merged in #230)

Gavin approved fixing review leftovers R3 and R4 from PR #228 ("start option 1", 2026-10-14).
Builder: Claude Code. Starting master `53fcf68`; branch `claude/phone-fit-001`; PR linked from the
branch. Scope: the Obligation EDIT Due/Planned row reuses the create form's responsive
`.intent-dates` (stacks at ≤360 px), and BODY counts an open correction or saved-meal editor as
unsaved input only when a value differs from the saved record it opened with. UI only; no Engine,
schema, event, backup, fixture, dependency or CI change. Evidence and verification are in the PR.
Next action: Gavin's merge decision after green required CI.

## State before PHONE-FIT-001 (2026-10-14)

PR #228 (DAILY-EXPERIENCE-001) merged at `910c436` with Gavin's approval. Merged head
`5a4c33bdd3ab3211150130b81724e5a2e22ac8a5` had green required PR Verification and an independent
Claude Code exact-head PASS review recorded on PR #228. Housekeeping PR #227 merged earlier at
`644aae5`. No deploy. Only isolated prototype #204 remains open. Next action: on "let's work",
propose the next owner-prioritized objective; none is approved.

Open, unapproved: owner decision D1 (see COMMAND-ATOMICITY-002 below; merged default saves nothing
and suggests RELEASE); an after-the-fact independent review of PR #226's `99b8f70` if Gavin wants one.

Carried forward from the PR #228 reviews, nonblocking and unapproved:
- R3 and R4 are being fixed by PHONE-FIT-001 above.
- R3 (pre-existing on master): the Obligation EDIT Due/Planned row is an inline flex row; the page
  is 369 px wide at 320/360 px, and at 320 px the bottom nav is pushed below the viewport. Likely
  fix: use the create form's `.intent-dates`. Plan Today makes this editor easier to reach.
- R4: BODY counts an open but unchanged correction editor as unsaved input, so reload/update
  prompts can fire spuriously (Intent editors already compare against the saved record).
- Plan Today groups by calendar date, so during an overnight shift "planned today" items move at
  midnight, before the 16:30 BeyondDay boundary (existing semantics, not a regression).
- Hidden retained panes keep their timers running; retained TRAIN briefly shows its previous
  headline until its activation re-read finishes.

Also carried forward, unapproved: review notes N1–N4 from PR #220 (count-start churn on re-entry,
destination-guide descriptions, Search Capture result skipping discard confirmation, stale Capture
message); operator stage 6 consolidation (waits for field evidence); VCC-001 stays paused; F1 field
stop runs to about Oct 25. A reviewer once saw a non-reproducing local `MealRoundTrip.test.tsx:80`
scroll-poll failure under combined load; watch for it in CI.

## Historical objective — DAILY-EXPERIENCE-001 (merged PR #228)

Gavin authorized the complete PROTECTED objective on 2026-10-13; brief in
[DAILY-EXPERIENCE-001.md](DAILY-EXPERIENCE-001.md). Starting master `e145cd16`; branch
`codex/daily-experience-001`; [PR #228](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/228), merged at `910c436`.
Builder: Codex (`d962b6f`, `54aaf8a`); Gavin reassigned the review corrections to Claude Code after
Codex ran out of usage (`73abb55`, `9cb2ace`, `4177b91`, `34a17e4`, `5a4c33b`).

Implemented: session-local meal/sleep/workout-set/Journal/Capture/planning input retained across
tabs and feature links (never persisted; drafts clear on reload/process eviction); reload and
UPDATE NOW warnings for unfinished input; origin/position/focus return; compact Day Line TODAY with
separate recorded Status and Engine guidance; focused canonical water/meal and quick Capture; Plan
Today over explicit existing dates/Missions/recurrence with canonical detail resolution; compact
MORE with on-demand guidance, complete Backup/Recovery access and one main landmark. No Engine,
schema, event/backup contract, historical fixture, dependency, backend or CI change.

Review history: Claude review of `54aaf8a` BLOCKED on B1 (a TODAY shortcut's focused BODY view and
stale RETURN leaked into primary navigation). Codex review of `54aaf8a` BLOCKED on Plan Today A → B
→ A edits being lost and Intent/Plan-composer drafts missing reload/update protection. Claude review
of `34a17e4` confirmed those fixed and BLOCKED on R1 (retained TRAIN showed a stale variant under
SUGGESTED WORKOUT after a check-in; master showed REDUCED for YELLOW). `5a4c33b` re-derives
unchosen template/variant on return and clears a stale Capture return (R2).

Evidence on merged head `5a4c33b` (independent re-review): typecheck, architecture (212 files) and
build pass; full Node + Chromium suite 229 files / 2,393 passed / 1 existing skip; production
acceptance (`scripts/verify-daily-experience.mjs`) passes at 320/360/412 px; required PR
Verification green. Synthetic phone evidence: [README](../screenshots/daily-experience-001/README.md).
Untested: physical iPhone/Safari/Android keyboards and screen readers. Existing bundle-size
advisory and single-tab limitations remain.

## Historical objective — COMMAND-ATOMICITY-002 (issue #225, merged PR #226)

Gavin explicitly approved COMMAND-ATOMICITY-002 on 2026-10-13 as a bounded PROTECTED objective;
brief in [issue #225](https://github.com/gavinlohnes/neo-beyond-lohnes/issues/225). Sole Builder:
Claude Code; branch `claude/command-atomicity-002`; [PR #226](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/226). Fresh
starting master: `e635643` (PR #224 merge, checkpoint already reconciled for #223; #221 closed).
Only prototype #204 is otherwise open.

Implemented: `src/application/atomicWrite.ts` is the one transaction helper (per-family table
lists, plus events/checkIns/recommendations for `nextSeq`'s cold-start read; nested calls join the
caller's transaction). Wrapped, with guard reads inside: `startDay`, `endDay`, rollover,
`submitCheckIn` (check-in + recommendation + both events), `rateOutcome`, `setWorkContext`,
`markWorkEnded`; every Mission/Obligation command incl. recurring next occurrence and Capture
conversion; Journal create/modify/review; TRAIN now uses the same helper. Signatures, validation,
events and payloads unchanged. Diagnostics: `recordIntegrityQueries.ts` reads one read-only
snapshot, tolerates null/malformed payloads, uses local dates, and adds days, check-ins (row side),
recommendations, missions, obligations and journal entries; MORE shows "Record mismatches".
Not covered (unreliable on old data): work context, outcome ratings, Capture conversion, WAITING/OPEN.

Owner decision D1, still open (default implemented and merged): satisfying a recurring obligation whose mission is
archived used to save SATISFIED, skip the next occurrence and still show a "cannot link" error;
now nothing is saved and the error says so and suggests RELEASE. Alternative: satisfy and stop
the recurrence silently.

Evidence: 20 new Node atomicity cases (16 fail on the old commands; the 4 cold-start cases fail
when `checkIns` is dropped from the helper), 5 new diagnostics cases (both protected backups
clean and byte-identical), 5 new real-Chromium cases (rollback, IntentScreen failure → error →
single retry save, D1 copy, MORE listing at 320/412 with axe, no writes). Full local suite,
TypeScript, architecture (209 files), build and whitespace pass; counts in the PR. Production PWA
at 320/360/412 px: day + check-in, mission, obligation satisfy, journal review, offline cold
reload, offline satisfy, Record mismatches 0 ([evidence](../screenshots/command-atomicity-002/README.md)).

Limits: rolled-back writes leave `seq` gaps (ordering only). `seq` is assigned per tab in memory,
so two tabs writing at once could still share a value (pre-existing, unchanged). Single-event
corrections keep their read-then-append shape; UI busy guards still prevent double submits.
Merged; see the current state above.

The PR #223 review notes (cold-start test, payload null guard, UTC dates) are addressed here.

## Historical objective — WORKOUT-ATOMICITY-001 (issue #221, merged PR #223)

Gavin approved [issue #221](https://github.com/gavinlohnes/neo-beyond-lohnes/issues/221) on
2026-10-13 ("Approve #221 with option A"). Sole Builder: Claude Code; branch
`claude/workout-atomicity-001`; PR linked in GitHub. Lane: PROTECTED (command/event write
behavior, data integrity). Fresh starting master: `a0aae6865` (PR #220 merge). Housekeeping docs PR
#222 merged afterwards and was merged into this branch (checkpoint-only conflict); only prototype
#204 is otherwise open.

Implemented: `startWorkout`, `logSet`, `skipSet`, `completeWorkout` and `abandonWorkout` (so also
`completeRecoverySession`) write their row and event in one Dexie read-write transaction over
workoutSessions, performedSets, events, checkIns and recommendations (`nextSeq`'s cold-start
read). Signatures, validation, idempotency/in-flight and RED-override guards, event types and
payloads are unchanged. Option A: read-only `getWorkoutRecordMismatches()` compares session/set
rows with their events both ways; MORE → Diagnostic detail shows the count and plain messages.
It writes and repairs nothing.

Evidence: eight new Node cases (failure injection per command, row failure, undo pairing, every
split kind, read-only, empty DB and protected fixture B report zero). The four rollback cases fail
without the transaction. Five new real-Chromium cases cover rollback in real IndexedDB, readout
0, split listing at 320/360/412 with axe and no writes. TRAIN-OPERATOR-001's partial-failure test
asserted the old half-saved row; it now asserts the rollback, unchanged reconciliation (no replay,
honest re-read) and a single row/event after a manual second LOG. Full local suite: 221 files,
2,321 passed, one existing skip. TypeScript, architecture (207 files), build and whitespace pass.
Production PWA at 320/360/412 px: start, log, skip, undo, offline cold reload, offline log,
COMPLETE hold, start/stop, diagnostics 0, no overflow ([evidence](../screenshots/workout-atomicity-001/README.md)).

Limits: rolled-back writes can leave seq gaps (ordering only, as with day rollover). Non-workout
commands that write twice are out of scope. Merged; see the current state above.

## Historical objective — Guided MORE + Low-Energy TODAY (issue #219, merged PR #220)

PR #220 review correction, 2026-10-13: an independent Claude Code review of
`72b735082ceb39fbae1aec39743a0111f1c6f783` issued BLOCK on B1 only. The retained (hidden-mounted)
Journal kept its last opened entry, so re-entry from the MORE menu or a Search result showed a stale
detail instead of the list. Builder: Claude Code (taking over from Codex). Fix: Journal resets to
its list on each activation; creation drafts are separate state and stay retained. A new browser
regression fails on the reviewed head and passes with the fix. Full local Node+browser suite
(219 files, 2,308 passed, one existing skip), TypeScript, architecture (206 files), build and
whitespace pass. Nonblocking N1–N4 are left unchanged to keep this correction bounded. Prior-head
CI/review do not apply; corrected-head CI and renewed independent exact-head review belong in PR #220.

Owner authorization: [issue #219](https://github.com/gavinlohnes/neo-beyond-lohnes/issues/219)
and Gavin's direct implementation assignment. Sole Builder: Codex; branch
`codex/guided-more-low-energy`; [PR #220](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/220).
Lane: PROTECTED — bounded MORE/TODAY presentation
and navigation composition, not new Engine or Minimum Day behavior. Fresh starting master:
`4b6cf819bfc494f2283270b277a504f5197e22e2`, verified merge of BODY PR #218 at corrected
head `830dcb143815401ee6e7ff3a047cfa625868248d`. Clean worktree; only prototype #204 open,
untouched and unintegrated. The previous BODY checkpoint below is historical, not active work.

Scope: hybrid MORE index with exactly two optional record-grounded destination suggestions,
stable reflection/direction slots and generic fallback; optional destination guide and guided
existing Journal/Mission/Obligation starts; retain free notes in Capture and in-memory writing
drafts across MORE inspection/return. TODAY adds user-chosen session-local Small Steps, direct
access to existing Minimum Day/Capture, focused tool operation and explicit all-tools/return.
Preserve status, work context, active operations, one Engine recommendation/WHY, all existing
routes, manual entry, decisions/confirmation, correction/undo, data and offline reliability.

BUILD OWNED the small read-only canonical-query composition and native React focus/disclosure;
reuse operator components/current forms. No dependency. The locked omission of fixed summaries
on named index rows remains; readable explanations live in a separate optional destination guide.
No locked UX or doctrine revision is assumed. Plain memories stay Capture, not invented journal
records; changing decision-required Journal semantics would need a separate owner ruling.

Excluded: Engine/priority/capacity/Minimum Day rules, commands/events, domain/schema, persistence/
backup formats, primary tabs, AI/diagnosis/inference, new dependencies, notifications/Pulse,
streaks or forced check-ins, silent plans, CI/protections, prototype, merge/deploy.
Acceptance: exactly two truthful/stable starts; archived-Mission eligibility; loading/error/retry;
guides never write without explicit existing save; free/manual paths and draft/focus/return;
normal/unknown/GREEN/YELLOW/RED/active operations and all essentials preserved; real offline PWA,
320/360/412 px screenshots, accessibility/reduced motion, regression/architecture/type/build,
whitespace/links/risk and green required CI. Independent exact-head review and Gavin's separate
merge decision remain required.

Implemented: canonical count-based reflection/direction starts, exactly two, with explicit generic
pending/failure fallback and read-only retry. No date rotation, urgency ranking or inference. The
full MORE index/recovery/settings remain. Optional destination descriptions and writing prompts
reuse existing forms; free memories remain Capture. Creation drafts stay mounted across MORE
inspection/return/search navigation; the new Capture exit explicitly asks before discarding them.
List reads distinguish unavailable from empty and retain manual starts. Small Steps is chosen in
the existing TOOLS toolbar, leaving closed-TOOLS TODAY's previous layout intact. Active Small Steps
offers Minimum Day/Capture, one-tool inspection, all-tools escape and predictable focus/return.
Essentials, active operations, phase/Attention policies, Engine guidance/WHY/decisions, Minimum Day
rules/enable and canonical commands are unchanged. Capture failure retains input; a known committed
save followed by failed refresh is disclosed without inviting a duplicate write.

Verification: full Node, 145 files / 1,545 passed / one existing skip. Seventeen new browser cases
cover guides/drafts/confirmation, write/read failures, explicit saves, GREEN/YELLOW/RED and unknown/
active states, unchanged recommendation/Minimum Day authority, hydration/undo, meal round-trip,
keyboard/focus, axe/reduced motion and mobile widths. Final affected TODAY/new/meal suites pass
120 tests. Earlier complete browser run passed 760 and exposed two 320px toolbar overflow cases;
the toolbar label/wrap correction passes both unchanged assertions in that final 120-case rerun.
An earlier meal-return regression caused by the inactive entry layout was corrected by moving
opt-in to existing TOOLS, not weakening the untouched meal suite. No final full local browser rerun
is claimed; required native CI runs the complete final-head suite. Architecture (206 files),
TypeScript/build, whitespace and ten local documentation links/anchors pass.
[Thirty actual mobile captures](../screenshots/guided-more-small-steps/README.md) document canonical
native restore, guided/free drafts/return, 320/360/412 px, real BODY water/undo, offline cold reload,
and explicit task/Capture saves; no horizontal overflow. Exact-head risk/CI/review evidence belongs
in the active PR. Committed baseline risk detects no automatic Protected path trigger; semantic
judgment keeps this owner-approved objective PROTECTED, with independent review required.
Engine/domain/persistence/commands/backup formats/dependencies/App navigation/CI/
protections/protected fixtures/prototype are untouched.

Limits: Chromium automation, not physical-device/iOS/native assistive-technology certification;
no arbitrary-large-history or cross-tab guarantee. Draft retention is in-memory MORE inspection,
not reload or ordinary primary-tab persistence; new guided Capture navigation confirms discard.
Small Steps is session-local, not a stored preference/plan. Existing bundle warning and command
integrity opportunities are unchanged. No additional owner ruling needed for implemented scope;
general-memory Journal semantics, new persistence or Engine/Minimum Day rules remain separate
owner decisions. Next: green required exact-head CI, independent review, then Gavin's separate
merge decision. No merge/deployment.

## Historical objective — BODY Insights & Progress Intelligence (merged PR #218)

Owner-requested PR #218 review correction, 2026-10-13: Claude Code independently reviewed
`f8274f07512895431c3d901175d6d2cfc865eb12` and issued BLOCK on B1 only. Chart extrema now
explicitly say High and Low, not apparent chronological endpoints. Focused assertions verify
both labels at 320/360/412 px. No calculations, chart interactions, accessibility, history or
other functionality changed. All 61 focused BODY/cleanup browser cases, architecture (203 files),
TypeScript, production build and whitespace pass. Nonblocking read coupling, ribbon disclosure,
selection retention, workout units and naming observations were reviewed and left unchanged to
avoid expanding this correction. Existing screenshots predate the label fix. Corrected-head CI
and renewed independent exact-head review belong in PR #218; prior-head approval does not apply.
No merge/deploy; Gavin retains separate final merge authority.

Gavin approved this bounded objective on 2026-10-13. Sole Builder: Codex; branch
`codex/body-insights-progress`; [PR #218](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/218).
Risk: PROTECTED — meaningful BODY interpretation/
presentation and the explicitly approved narrow chart exception recorded in the UX register.
Fresh starting master: `ea0c26f26d05991811676378174c21b3139805fc`, verified PR #217 merge.
Initial worktree was clean; only isolated prototype #204 is open, untouched and unintegrated.

Scope: enrich existing BODY progress with read-only selectable weight, nutrition, reliable
main-sleep and finished-workout series, useful ranges, truthful comparisons/coverage, accessible
point inspection and supporting records. Preserve Daily Record/meal entry, drafts/focus/return,
corrections/undo, accomplishments/ribbon/timeline/baselines and existing goals/targets.
Reuse canonical correction-aware queries and shared operator readouts; BUILD OWNED small
domain-specific read composition and native SVG/range/disclosure, no dependency or new chart system.
Excluded: Engine/recommendation/medical authority, new inference/correlations, commands/events,
domain/schema/persistence/backup formats, navigation, dependencies, CI/protections, prototype,
merge/deploy. Fiber is absent, not estimated; missing/partial records never become zero intake.
Acceptance: accurate window/coverage/zero/missing/comparison calculations; historical correction/
void integrity; read/loading/failure/retry; existing journeys; 320/360/412 px, accessible keyboard/
contrast/reduced motion, production offline PWA, architecture/type/build, regressions, mobile
evidence and green required exact-head CI. Independent exact-head review and Gavin's separate
merge approval remain required.

Implemented: selectable 7/28/90-day weight, meal calories, protein, reliable main-sleep and
finished-workout series; means/prior-period changes with denominators; native pointer/keyboard
point inspection; dated records and calculation/coverage disclosures; meal carb/fat details and
explicit unavailable fiber. Nutrition is recorded intake, not total intake; ambiguous multiple-main
sleep days are excluded, not combined; co-recording never implies causation. Existing goal/milestone/
projection rules remain. Daily Record/manual/meal handlers are unchanged; accomplishments, ribbon,
timeline and baselines remain reachable. Selectable charts lead, while the established last-recorded
weight SVG remains inspectable when the latest record is older than all recent ranges. Its existing
facts remain; timeline opening still hides both charts.

Evidence so far: all 144 Node files pass (1,542 tests, one existing skip). All 70 targeted real-
Chromium cases across BODY/progress/cleanup pass, including six new UI cases and seven new
calculation/canonical-history cases in Node. Architecture (203 files), TypeScript/build and
whitespace pass. A preservation test caught a new hint pushing water controls below the first
viewport; it was removed, not the assertion. Existing chart tests now assert the new graph while
retaining goal/milestone/no-warning/timeline safeguards, with deterministic dates.
Actual 320/360/412 px PWA native restore, point inspection, offline reload/local exploration,
return focus and manual water/undo pass. [Mobile evidence](../screenshots/body-insights-progress/README.md)
records synthetic fixtures and limitations. Final full browser passes 73 files / 744 tests. A final
source-date annotation distinguishes existing all-history weight facts/projection from range means;
all 71 final focused cases pass, including a seventh new UI regression proving older-history graph
access and timeline suppression. Thirty-four local documentation links/anchors pass.
Required exact-head CI is recorded in the PR. Committed baseline risk reports PROTECTED;
independent review is required before Gavin's separate merge decision. No merge/deploy.

## Historical objective — MORE-OPERATOR-001 control center (merged PR #217)

Gavin approved this bounded Protected stage on 2026-10-10, with no merge/deploy authorization.
Builder: Codex, sole implementation Builder; branch `codex/more-operator-001`;
[PR #217](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/217).
Fresh baseline: `d3386f3d9901e0fa41a10f03e5dc4536578ebc96`; GitHub confirms PR #216 merged
at exactly that commit. Clean starting worktree; sole open PR #204 remains isolated and untouched.
Brief: [Stage 5](BEYOND_OPERATOR_EXPERIENCE.md#active-stage-5-brief--more-operator-001).

Implementation: records/review lead, Direction and Training tools stay distinct, and the identity
zone has an immediate backup/recovery jump. Existing export/share/replace-only restore remain
visible; automatic preferences/file check and time capsules use deliberate native disclosure.
All nine destinations, settings, Findings/Weekly depth and correction/manual routes are retained.
The menu stays mounted during inspection, retaining local settings/capsule drafts, disclosures,
position and focus on explicit return; primary-tab/reset semantics are unchanged. Diagnostics,
History, Review and Weekly distinguish unavailable reads from empty/zero and provide read-only
retry. Backup export failures are surfaced; synchronous UI guards preserve one in-flight safety
operation and existing backup-before-replace/preview/confirmation semantics. No Engine, application,
domain, schema, persistence, events, backup formats, dependencies, CI, protections or prototype edits.

Verification: full Node suite passes 143 files / 1,535 tests, one existing skip; full Chromium
suite passes 72 files / 736 tests. All 24 final focused operator tests pass, including added restore
failure-ordering and computed minimum-text checks (one additional test after the full local run).
Architecture passes (201 files); TypeScript, production PWA build and whitespace pass.
Actual 320/360/412 px PWA offline reload, History/events, record search/result navigation, settings
save/reload, real backup download/preview/cancel/file check and return focus pass at every width.
[Twenty-one synthetic mobile captures](../screenshots/more-operator-001/README.md) record actual
production behavior, not prototype sample rules. Eight local documentation links and heading
anchors pass; committed baseline risk reports PROTECTED. Exact-head CI/review results
belong in the linked PR rather than a self-referential checkpoint SHA.

Limits: Chromium-only automation, no physical-device/iOS/native-screen-reader or OS share-sheet
certification. Draft continuity is session-local menu inspection, not new persistence or cross-tab
draft authority. Existing bundle-size warning and excluded workout command atomicity opportunity
remain. Environment reuses the existing setup and temporary system-Chromium browser override;
no tracked runner changes or new configuration needed. Next: green required exact-head CI,
independent review, then Gavin's separate merge decision. Do not merge/deploy.

Owner-requested PR #217 follow-up, 2026-10-10: Weekly clears its last successful summary when
a fresh read begins. Pending reads show Loading; failure shows the error and RETRY WEEKLY without
old figures. A gated regression covers successful load → failed refresh → pending retry → successful
recovery and unchanged canonical events; it failed against `a664d92c94dfdbaf532411545984e8881e83d354`
before the correction. This is UI read-state repair only, reusing existing query/cancellation state;
no command, domain, persistence or authority change. All 76 focused MORE/Review browser cases
pass, including the new recovery sequence; architecture, TypeScript/build, whitespace and eight
local documentation links/anchors pass. Corrected-head native CI and renewed
independent exact-head review belong in PR #217; prior-head CI/review is not approval of this update.

## Historical objective — TRAIN-OPERATOR-001 operating surface transformation (merged PR #216)

Gavin approved this bounded Protected stage on 2026-10-10. Builder: Codex, sole implementation
Builder; branch `codex/train-operator-001`; [PR #216](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/216). Starting master is the freshly verified
`173b9f930764e99b7d03d36d14d21aa4f3f57a49`, merging PR #215. Initial working tree was clean;
initial public open-PR inspection showed only isolated prototype #204. GitHub API access initially
failed with network Forbidden (including sandbox escalation); after saving missing destinations
in the environment draft, authenticated API access and PR creation succeeded. No required CI
success is claimed here. Full concise brief:
[TRAIN stage 4](BEYOND_OPERATOR_EXPERIENCE.md#active-stage-4-brief--train-operator-001).

Implementation: preparation leads with the chosen session, prescribed exercise/set totals and
START; the full prescription and unchanged WHY evidence remain deliberately inspectable. Active
TRAIN shows canonical session progress, current lift/prescription, known or explicitly unknown
last performance and current set inputs before progression/substitution. Gym Mode, rest,
exercise navigation, undo, finish/partial/stop confirmation and all pre-session library, template,
history and record routes remain accessible. A finished lift has an explicit CONTINUE route to
the existing first unfinished lift; chosen substitutions remain visible outside inspection.
Completion uses truthful recorded/skipped metrics and keyboard focus follows completion/return;
read retry never restarts a workout, and LOG feedback distinguishes an unconfirmed command from
a successful commit whose subsequent read failed. An uncertain command failure requires read-only
reconciliation before another LOG is possible. No protected data/rule/command layer changes.

Verification: all 143 Node files pass, 1,535 tests and one existing skip. Final full browser project
passes 71 files / 713 tests, including 15 operator tests and a real performed-row-present/event-
failed injection without duplicate recording. Architecture passes (201 files); TypeScript,
production PWA build, whitespace and 25 local documentation links pass. Actual production
PWA offline reload, canonical resumption, offline recording and hold-to-finish pass at 320/360/412
px. Eighteen synthetic mobile captures and limitations are in
[TRAIN evidence](../screenshots/train-operator-001/README.md). No physical-phone/iOS, native
assistive-technology, hardware haptic or wake-lock acceptance is claimed. Existing bundle-size
warning remains. Committed baseline risk classification reports PROTECTED; required exact-head CI
and independent review are pending. The pushed branch is recoverable in PR #216. Environment
network corrections are saved; successful live API requests do not establish a published setup
snapshot. Next: obtain independent exact-head review and successful required CI, then Gavin's
separate merge decision. Do not merge/deploy.

Separate owner decision required, not implemented: existing workout commands can write a row and
its event separately. UI recovery reconciles an uncertain result and never blindly repeats LOG;
it cannot provide transactional row/event integrity or repair policy without crossing the
excluded command/application boundary. Recommend a separately approved atomicity/recovery objective.

## Historical objective — TODAY-OPERATOR-001 command surface transformation (merged PR #215)

Gavin explicitly approved this bounded Protected objective on 2026-10-09. Freshly fetched
`origin/master` and the starting commit are
`1d83756b2ba971144365714d7450fb1091b9f2dc`, the verified merge of PR #214. Builder: Codex;
branch `codex/today-operator-001`; merged as [PR #215](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/215). Public GitHub inspection showed PR #204 was the only
other open PR; it remains an isolated interaction prototype and is neither modified nor integrated.

Scope: transform TODAY's production composition into one operator command surface ordered around
current phase/context, truthful System Status/capacity, the one canonical Engine recommendation,
immediate existing operations, earned attention and deliberate inspection. Reuse `OperatorHeader`
and existing application queries, commands, recommendation evidence, State/shift context and
presentation primitives. Preserve every existing TODAY journey, manual control, confirmation,
draft, recovery, focus, offline, exactly-once and correction path. No Engine, recommendation,
domain, schema, persistence, backup, event, command, navigation, dependency, CI, protection or
prototype change. Full concise brief: [BEYOND operator experience migration](BEYOND_OPERATOR_EXPERIENCE.md#active-stage-3-brief--today-operator-001).

Delivered implementation: TODAY identifies CURRENT STATE and its authoritative phase,
separates SYSTEM STATUS from context, labels the canonical Engine result PRIMARY RECOMMENDATION,
and places WATER / MEAL / SYSTEM after that recommendation as IMMEDIATE OPERATIONS. Foreground
operations still retain precedence; phase rows, capped Attention and the complete TOOLS disclosure
remain reachable below. No new inference, score, urgency, command or data path is introduced.

Verification: the full real-Chromium project passes 70 files / 698 tests, including the complete
TODAY journey, GREEN/AMBER/RED/NO READ, NO ACTION REQUIRED, recommendation/WHY, manual commands,
confirmations, failures/retries, focus return, drafts, workout continuity, reduced motion, axe and
320/360/412 px containment. All 143 Node files pass: 1,535 tests and one existing skip.
Architecture passes (201 files); TypeScript, production PWA build and whitespace pass. The built
PWA retains the synthetic day and current command surface through an offline service-worker reload
at 360 px. Synthetic production-build captures are in `docs/screenshots/today-operator-001/`.
The existing bundle-size warning remains. Final committed risk classification, required exact-head
CI and independent exact-head review remain pending. No merge or deployment is authorized.

## Historical objective — shared operator shell and primitives

Gavin approved stage 2 of the BEYOND-wide operator experience migration on 2026-10-09 after PR
#213 merged at `61b27232881f246c3e0038c9a8b1492a76b3dace`. Risk lane: PROTECTED because shared
primary-surface presentation can affect identity, hierarchy and accessibility. Builder: Codex;
branch `codex/operator-shell-primitives`; merged as PR #214. PR #204 remains an isolated prototype.

Scope: extract the already-common primary destination identity header and BODY's proven small
read-only fact matrix into constrained shared components; adopt them only with exact copy, glyph,
focus, data and layout parity. No TODAY/TRAIN/MORE redesign, behavior relocation, generic card
system, Engine/application/domain/persistence/event/schema/backup/dependency/fixture/CI/prototype
or deployment change. Acceptance and full brief: [BEYOND operator experience migration](BEYOND_OPERATOR_EXPERIENCE.md#active-stage-2-brief--shared-shell-and-primitives).

Implementation: `OperatorHeader` now owns the already-identical destination glyph/heading/rule
frame across the four primary screens while preserving each caller's exact copy and focus handoff.
`ReadoutGrid`/`Readout` extract BODY's daily read-only fact matrix with an explicit non-card,
non-action contract. Existing `health-*` hooks remain for compatibility; no query, state or control
moved. New browser coverage checks heading semantics/focus, long values, 320/360/412 px containment,
axe and reduced motion. Focused final sets: 46 passed before a full-gate compatibility finding;
the preserved hooks and affected BODY/protein/primitive subset then passed 21/21. Node suite: 143
files, 1,535 passed and one existing skip. Architecture passed (201 files); TypeScript, production
PWA build and whitespace passed. The existing bundle-size warning remains. Required exact-head CI,
independent review and Gavin's merge approval are pending.

## Historical objective — BEYOND-wide operator experience migration contract

Gavin explicitly approved evolving all of BEYOND toward the Insights Phase A prototype's
operator-console experience and directed Codex to start on 2026-10-09. BODY Daily Health Record is
already merged in PR #212. This first follow-on objective is documentation-only: establish the
shared screen grammar, semantic boundaries, preservation matrix and staged production sequence
before TODAY, TRAIN or MORE changes.

Risk lane: PROTECTED because the contract governs a future primary-information-architecture
migration. Starting master: `c0f0d3c1c171aa0aac301141e3ea4c1e5e7a2d47`. Builder: Codex;
branch `codex/beyond-design-system`; active PR [#213](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/213). Prototype PR #204 remains isolated and
untouched. Full brief: [BEYOND operator experience migration](BEYOND_OPERATOR_EXPERIENCE.md).

Scope is this contract and checkpoint only. No production source, runtime behavior, Engine,
events, schema, persistence, backup, dependencies, fixtures, CI, protections, prototype integration,
deployment or merge. Acceptance: authority consistency, resolving links, clean whitespace,
Protected classification, green required CI and independent exact-head PASS. Every later
production stage requires its own bounded owner-approved Protected brief.

## Historical objective — BODY Daily Health Record

Gavin explicitly approved this cohesive Protected objective on 2026-10-09, including amendment of
BODY's four-tracker presentation and latest-entry sleep summary. Fresh master:
`bb36ffbf12116cc1e29d27bac1fa549744101e8a` (#211 integrated). No overlapping Builder;
only prototype PR #204 was open and remains untouched. Builder: Codex; branch
`codex/body-daily-record`; active PR [#212](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/212).

Scope: daily calories/protein orientation, secondary nutrition details, separate main sleep/naps,
canonical record inspection/correction, immediate meal/water entry and existing progress without a
weigh-in gate. Reuse canonical forms/commands/read models; keep four tabs and all meal/undo/draft/
recovery/offline/workout safeguards. No Engine, event, schema, persistence, backup, dependency,
one-off meal or unrelated changes. UX amendments are in the existing Decision Register.
Leverage: REUSE existing BEYOND tools/queries; USE PLATFORM native disclosures; BUILD OWNED the
small connective presentation. Do not add a library or another logging architecture.

Acceptance: real mobile 320/360/412 px; effective totals and corrections; main/nap and lived-day
ownership; progress without weight; draft/focus/return/error recovery; exactly-once logging and
existing regressions; offline built PWA; architecture/type/build; green required CI and independent
exact-head PASS. Verification: architecture passed (199 files), TypeScript/production PWA build and whitespace passed.
Full local suite covered 212 files: 2,220 passed / one existing skip; six legacy presentation selectors
needed updating for the authorized layout. All affected suites were corrected and rerun successfully
(112 tests across the final focused sets), with no assertions weakened. The 10 new daily-record cases
cover all three phone widths with full contrast/axe checks, overnight main/nap ownership, canonical
meal/water inspection, retained correction drafts, read-only recovery/focus, local draft/return and
same-tick write guards. Final timeline/recovery subset: 14 passed. Existing meal/workout/rollover,
Engine, provenance and historical restore regressions remain. Actual synthetic browser screenshots
are in `docs/screenshots/body-daily-record/`; all quick water controls fit above navigation at
320/360/412 px, with no horizontal overflow. Built-PWA offline preset save/log/return/reopen/undo/
correction/cold reload passed. Required exact-head CI and independent review are pending in the PR.
Initial independent review found one minor missing inspect glyph. It is replaced with the existing
LineIcon/ArrowUpRight SVG, and affected real screenshots were recaptured. A subsequent manual
read-retry timing defect is corrected with a post-commit enabled-control handoff; the regression
uses a gated read. New layout tests load the real local production fonts before measuring rather
than relying on platform fallback fonts. Final daily/meal/focus correction set: 41 tests passed;
architecture/build pass. Renewed independent exact-head review and required CI are requested.
Limitations: Chromium verification; existing memory-only drafts/undo windows; no canonical fiber
field; existing bundle warning. No merge or deployment authorized.

## Historical objective — Delta removal and intelligence preservation

Gavin explicitly authorized this bounded Protected cleanup on 2026-10-09. Fresh master:
`1170a13bbbd96627665087cef203e45d662f3a86`, the verified merge of #210. The meal milestone
#209 is already merged; only prototype PR #204 is open and stays untouched. Builder: Codex;
branch `codex/delta-removal`; active PR [#211](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/211)
carries exact-head evidence and independent review.

Audit: current tracked production navigation/App/MORE/SYSTEM, runtime source, package manifest and
lockfile, Vite/PWA/deployment configuration, environment declarations, event/storage types and
native/legacy restore contracts contain no active Delta assistant, model integration, AI-specific
prompt/configuration/dependency or Delta storage contract. Mathematical variables named `delta`
are unrelated. Optional USDA food lookup is non-AI and remains. Local chrono-node/Compromise date
parsing, MiniSearch retrieval/relevance, advisory composition, baselines, analytics and the canonical
Engine are useful non-AI capabilities, not deletion targets. No Delta-specific compatibility shim
is needed; existing legacy importers and native backup/restore remain necessary and unchanged.

Scope: remove misleading active future-cleanup requirements and record the verified intelligence
strategy in existing documents. No invented runtime deletion, migration, dependency removal or
replacement abstraction. Production source, data, commands, schemas, backups, tests, packages,
CI/protections and historical evidence remain unchanged. Leverage: REUSE existing deterministic
capabilities; REJECT unnecessary replacement infrastructure. Acceptance: preservation regressions,
architecture/type/build, document consistency, required CI and independent exact-head review.
Verification: 18 preservation test files passed (331 tests, one existing skip), covering Engine,
advisory/date/baseline/progression intelligence, canonical nutrition/hydration, meal drafts/recovery,
SYSTEM, TRAIN and historical restore fixtures. Architecture passed (196 files), TypeScript/build,
whitespace and 38 local document links passed. Built PWA in an isolated synthetic Chromium profile
passed offline preset save, exactly-once log, explicit return/focus/reopen, undo, correction and
cold reload retaining canonical totals. No new tests are needed for documentation-only changes;
required full CI and independent exact-head review belong in the PR before owner merge approval.
Existing Chromium-only verification, memory-only drafts, undo windows and bundle warning remain.
No merge/deployment authorized.

## Historical objective — product direction and creative freedom transition

Gavin explicitly authorized this bounded Protected governance transition on 2026-10-09.
Freshly fetched master: `5a021de81d73520c3ed3a32d47ca5e5d85e69a76`; PR #209 is merged at
that commit, so no active meal Builder overlaps this objective. PR #204 is the only open prototype
PR and is untouched. Older pending meal/catalog pointers below are historical.
Builder: Codex; branch `codex/product-direction-transition`; active PR [#210](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/210).

Scope: one concise Product Direction reference and necessary links/authority reconciliation;
creative independence within approved outcomes, complete experiences, existing leverage gate,
historical-decision amendment path and smart-by-design/AI-optional direction; classify the new
product-direction authority as Protected with a focused regression. Preserve DEV-FLOW-002
review/CI/merge safeguards, locked behavior until amended and all engineering/data protections.
No product code, Delta removal, dependencies, settings, CI/protection changes, deployments or merges.
BUILD OWNED concise repository direction; reuse the current workflow and leverage gate.
Verification: 30 local document links resolve; identified authority conflicts are reconciled;
CLAUDE's router and the engineering contract are byte-unchanged. Architecture passed (196 files),
whitespace passed, and all 26 risk-classifier cases passed. The new Product Direction case failed
before path recognition and passes after it. Changes are governance documents plus the classifier
path and its regression; production code, dependencies, historical Drops/fixtures and CI stay intact.
Required CI and independent exact-head review belong in the PR. Independent PASS/BLOCK must be
recorded in GitHub before owner merge approval. No unrelated objective is activated.

## Historical objective — focused meals, Product Experience Milestone 3

Gavin approved the read-only assessment's bounded Protected recommendation on 2026-10-09.
Starting freshly fetched master: `97103b5235ff02b07fffdc7d0b5727470f2abcdb`; PRs #205–#208
are merged (older pending pointers below are historical). Builder: Codex, sole Lead Builder;
branch `codex/focused-meal-m3`; active PR [#209](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/209). PR #204 is the sole open prototype PR and stays untouched.

Scope: focused meal presentation within BODY; shared existing fields/commands/state; saved LOG
first, secondary preset management/online lookup, direct offline manual entry, local all-tracker
access. Preserve separate preset save/consumption, direct BODY workflow, four tabs, drafts,
synchronous guards, recovery/focus, undo/correction, canonical totals/history and workout continuity.
No Engine, schema, persistence, backup, new dependency, hydration redesign, progress consolidation,
VCC-001 or prototype changes. BUILD OWNED small presentation; USE PLATFORM native disclosures.
Acceptance: actual mobile 320/360/412 px, draft/return/focus and recovery, exactly-once records,
management snapshot integrity, existing regressions, architecture/type/build and required CI.
Verification: full local gate 211 files / 2,218 passed / one existing skip; 31 focused meal/journey
cases passed, including eight new presentation tests. Architecture, TypeScript/build and whitespace
passed. Actual synthetic mobile screenshots at 320/360/412 px are in
`docs/screenshots/focused-meals-m3/`. Built PWA offline preset save (no consumed record), exactly-once
log, explicit return/reopen/focus, undo, correction and cold reload all passed. Local tracker choices
supersede the delayed initial handoff. Accessibility tests finish finite entrance effects before
contrast inspection; waiting on hidden retained-screen animations cannot settle while hidden.
Required CI/exact head belong in the PR. Chromium-only evidence, memory-only drafts, existing undo
windows and the existing bundle-size warning remain. Next: independent exact-head review, then
Gavin's merge decision. No merge or deployment authorized.


## Historical objective — searchable SYSTEM catalog milestone 2

Owner authorization: Gavin's bounded implementation instruction, 2026-10-09; Protected navigation
integration. Starting freshly fetched master: `9b2e62417d639eb541b1de47e1b52ff9f5502845`, merged
PR #207. Builder: Codex, sole Lead Builder; branch `codex/system-catalog-m2`; active PR [#208](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/208).
PR #204 is the only existing open PR and remains untouched. Prior milestone handoffs below are
historical; their pending review/merge pointers do not describe current master.

Scope: the approved 18 existing destinations, browsable groups and local names/aliases in SYSTEM;
existing App navigation handlers and MORE subviews; separate record search. BUILD OWNED small
navigation metadata; USE PLATFORM native dialog/input/buttons. No new dependency, storage,
commands, Engine/schema/backup changes, tab replacement, prototype integration or unrelated work.
Keep meal drafts, synchronous guards, canonical logging/undo/correction, read recovery, explicit
return, workout continuity, accessibility and offline behavior. VCC-001 stays paused.

Acceptance: every destination and all four tabs accessible; navigation/search performs no domain
writes; alias/empty/clear behavior; destination/focus return; guarded cancellation and recovery;
canonical exactly-once meal logging and workout continuity; mobile 320/360/412 px and constrained
keyboard space; architecture, build, proportional regression and required CI. Verification: 76 targeted cases passed; final full suite 210 files / 2,201 passed / one existing
skip; architecture, TypeScript/production build and whitespace passed. Forty-one new tests
(34 browser, seven discovery cases) cover the catalog and real journey safeguards. Built PWA
offline passed preset creation/log, cold reload, catalog/aliases, meal return, History, separate
record search, water/undo and focus return. Ten actual synthetic-fixture screenshots are in
`docs/screenshots/system-catalog-m2/`. A constrained-height regression failed before chrome
refinement and now keeps a full matching result visible at 320/360/412 px with 420px height.
Final label audit distinguishes REVIEW's recommendation/decision/rating ledger from Weekly's
progress views; eight affected discovery/destination cases, build and offline PWA passed again.
Required CI/exact head are recorded in the PR. Chromium-only automation, memory-only drafts,
existing undo windows and the existing bundle warning remain; no physical/Safari/screen-reader
certification is claimed. Next: finish verification, independent exact-head review,
then owner review. No merge or deployment authorized.

Independent-review follow-up, 2026-10-09: Gavin authorized correction of the P2 BLOCK at
`75c5b7c73a62686f26003eaf7ca372a9f89e41f8`. Dialog capture prevents native search Escape
from clearing a populated query before dismissal; the existing close/focus path is reused.
Nine focused-query regressions cover empty, matching and no-result searches at 320/360/412 px,
closure after one press, stable trigger focus and clean reopen. Six populated cases failed before
the fix; all 85 targeted cases now pass, with architecture/TypeScript/build and whitespace green.
The review's unrelated meal-test readiness race is bounded to initial LOG availability: wait
before the unchanged same-tick dispatch sequence. CI also exposed the explicit-read-retry
test matching an earlier error while retry was pending; require its specific failure and enabled
control before restoring successful reads. No meal production code changed or assertions weakened.
Built PWA offline one-Escape/focus/reopen checks passed for all nine cases, alongside canonical
logging/return, record search, water/undo and cold reload. Corrected head and required CI belong
in PR #208. The prior BLOCK is not
independent approval of the corrected head; renewed exact-head review is required before owner
approval. No further milestone, merge or deployment authorized.

## Historical objective — Command Console production milestone 1

Gavin authorized this bounded Protected milestone and explicitly amended the placement rule for
persistent WATER/MEAL/SYSTEM controls (UX Decision Register, 2026-10-08). Builder: Codex, sole
Lead Builder; branch `codex/command-console-m1`; active PR [#207](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/207).
Starting fresh master: `db5bae3267ddd82e15f3038f65dc7ba3412893ff`; PR #206 is integrated with
its reviewed head and green CI. PR #204 remains the sole overlapping open prototype PR, untouched.

Scope: compact production TODAY composition, one canonical RecommendationCard retaining existing
dominant/attention/support authority, existing work context/System Status, visible workout resume,
canonical BODY water/meal entry, and a native SYSTEM chooser over existing workspaces/TODAY Tools.
The four tabs and all capabilities stay. Contextual phase rows retain their four-row cap, semantics
and timing; time-sensitive work controls keep precedence. No Engine, commands, persistence, schema,
backup, dependency, fixture, identity-asset or prototype changes. VCC-001 remains paused and is not
implemented; complete searchable launcher/Milestone 2 is deferred. BUILD OWNED composition over
existing components/commands; USE PLATFORM native dialog with explicit focus containment/return.

Evidence: 17 new real-browser console cases, including a deterministic wider-font context
control regression; console/phase/visual/motion coverage retains overflow, touch-target and
resume visibility assertions. Status context safely wraps at 320 px; touch targets stay at least
44 px. Full local regression: 208 files passed, 2,169 tests passed and one existing skip. Final
TypeScript/build, architecture, whitespace, offline and exact-head required CI results are recorded
in PR #207. Actual synthetic-fixture screenshots at 320/360/412 px,
status/evidence, logging, SYSTEM and resume are in `docs/screenshots/command-console-m1/`.
Built PWA checks cover offline save/log, cold reload, meal return, SYSTEM navigation,
water logging/undo, canonical totals and keyboard focus return.
Independent exact-head review and Gavin's final merge approval
remain required. Chromium automation is not physical-device/Safari or screen-reader testing;
memory-only meal drafts, existing undo windows and the existing bundle-size warning remain.
No merge or deployment is authorized. Next: independent review, then owner review.

## Historical objective — post-merge meal recovery focus correction

Updated 2026-10-08 by Codex. Gavin authorized a bounded accessibility follow-up to merged
PR #205. Fresh master is `22fa8c5af134088bdb0c9391914cea4282fa6a61`; open PRs #201 and
#204 are untouched. Builder: Codex; branch `codex/meal-recovery-focus`; corrective PR linked
from this branch's GitHub PR. Risk: ROUTINE accessibility repair, with independent exact-head
review explicitly requested before owner approval. BUILD OWNED: complete the existing native
focus handoff; no dependency, navigation, command, Engine, schema or persistence changes.

The delayed-read regression reproduced focus loss on master. BODY now completes the return-control
handoff after automatic recovery enables it, without stealing focus from a chosen visible control.
Deterministic gated-read tests also preserve the draft, canonical totals/history, correction access
and exactly one log. Verification: 99 browser tests passed across meal/App/BODY; both final focus
variants passed separately (21 unselected cases skipped). Architecture, TypeScript/production
build and whitespace passed. Built PWA passed offline save/log, offline cold reload, and offline
TODAY meal return with refreshed totals. Existing memory-only drafts and five-second undo remain.
Browser verification used Chromium. Required CI and exact head are recorded in the corrective PR.

Next: independent review of the exact corrective head, then Gavin's merge decision. No merge or
deployment authorized. VCC-001 remains paused. The prior milestone handoff below is historical;
its pending-merge pointers are superseded by PR #205's verified merge.

## Historical milestone 1 handoff

Updated 2026-10-08 by Codex, Lead Builder for Product Unification milestone 1.
This is a handoff, not merge authorization. Exact head and CI are recorded in the linked PR.

## Current objective — complete the meal-logging round trip

- **Authorization:** Gavin explicitly approved this bounded implementation following the Unified
  Product Blueprint. Product Unification takes priority; VCC-001 is paused, not canceled or
  superseded. No State Rail implementation or PR #204 integration is authorized.
- **Risk:** FEATURE UI handoff; conservative PROTECTED review lane because the roadmap records
  Gavin's explicit priority instruction (no workflow/authority rules changed). Independent exact-head
  review is required before merge. No primary navigation,
  doctrine, Engine, application commands, schemas, persistence, backups, dependencies or identity
  assets changed. BUILD OWNED: small React presentation state over existing canonical meal commands;
  native confirmation/focus/scroll behavior, no new infrastructure.
- **Starting state:** fresh `origin/master` = `8035dfbc0011bed03fb668e100aa8794cda4a8e7`;
  PR #203 is merged and DEV-FLOW-002 adopted. Open PRs #201 and #204 remain untouched.
- **Builder / branch:** Codex; `codex/unify-meal-round-trip`. Active PR: [#205](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/205).
- **Scope:** existing TODAY meal entry -> real BODY workflow -> explicit return with TODAY
  disclosures/position/focus retained; in-memory draft preservation; busy/discard guards; canonical
  confirmation, undo/correction and totals; near-control errors and duplicate-tap latch.
- **Exclusions:** new logger/persistence path, Engine/data/backup changes, navigation redesign,
  VCC-001, prototype changes, deployment and merges.
- **Acceptance evidence:** 115 targeted browser tests passed across seven files; follow-up
  browser/canonical nutrition/correction tests: 69 passed, one existing skip across six files
  (includes the 13 new round-trip cases again). Final repeated-return refinement: all 13
  round-trip cases pass; architecture, TypeScript/build and whitespace pass.
  Browser tests reuse installed Chromium through the existing temporary onboarding config, with
  no assertion or tracked configuration changes. Required full CI will be recorded in the PR.
- **Screenshots:** `docs/screenshots/unify-meal-round-trip/`, running app at 320/360/412 px,
  success/undo and returned TODAY; synthetic fixtures only, reduced-motion browser context.
- **Limitations:** drafts are session memory, not saved records; a supported browser warns on
  reload/close, but OS termination cannot preserve them. Existing five-second undo window is
  unchanged; later correction remains in TODAY'S MEALS. Primary tab navigation keeps its existing
  reset semantics after any needed discard confirmation. Only the existing TODAY meal entry
  gains this round trip; no new phase action is introduced.
- **Offline evidence:** built PWA passed offline preset save, canonical logging, TODAY -> BODY
  -> explicit return with updated totals, and service-worker cold reload with the meal retained.
- **Next:** confirm green required CI at the final head, obtain independent exact-head review,
  then owner review. No merge or deployment authorized. No unapproved product boundary is crossed.

## Independent review corrections — PR #205

- Owner supplied a BLOCK review of `16cff0feb46bc80b9b0e8da7e5e5dbfe6a7b7ac7`:
  P2 same-tick navigation could abandon a pending meal write; P2 post-commit read failures
  did not recover through explicit return/reopen. The reviewer reported a Forbidden review POST;
  no GitHub review existed. This handoff records the findings, not a Builder-issued review verdict.
- Fixes: synchronous BODY in-flight reporting and shell guards; synchronous existing BODY action
  guards; failed read continuations retried on reopen or through RETRY READINGS. Retry runs only
  reads, including duplicate/same-food checks, preserving drafts, confirmation and undo.
- Evidence: three new assertions fail on the blocked head. Fixed tree: 122 browser tests pass
  across seven files, plus one additional duplicate-check recovery case (21 round-trip cases total);
  immediate LOG -> all navigation paths,
  committed-preset/log recovery and explicit retry preserving another draft. Architecture,
  TypeScript/production build and whitespace pass. Built PWA offline save/log/return and cold
  reload pass again. Required CI at the new head is pending.
- The prior BLOCK is not cleared by Builder verification. Next: green exact-head CI and renewed
  independent review; owner merge approval remains required. No merge or deployment authorized.

## Historical adoption handoff

The following checkpoint is preserved as historical evidence. Its pending-adoption/merge pointers
are superseded by the verified state above.

# Current checkpoint

Updated 2026-10-08 by Codex, assigned Primary Builder for DEV-FLOW-002 only.
This is a handoff, not implementation or merge authorization. Read the approved objective brief;
verify branch/PR/head/CI from Git and GitHub rather than assuming this checkpoint is live state.

## Verified starting state

- Fresh `origin/master` and starting checkout both matched
  `9cf48c07b4b4e1ff807983dbc845d06a2de6eedb` with a clean working tree.
- PR [#200](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/200) merged at that SHA;
  both Git history and the public PR page confirm it. The former pending-review pointer is stale.
- PR [#199](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/199) remains the historical
  standalone-activation prerequisite. Its implementation and evidence are preserved.
- PR [#201](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/201) is still open on GitHub;
  this objective does not modify or close it. PR #200 already contains the AutoBackup selector repair.
- `ACTIVE_DROP.md` still records WEEKAHEAD-001 as CLOSED and is untouched historical Factory state.
  It does not assign this adoption objective or authorize VCC-001 implementation.

## DEV-FLOW-002 adoption

- **Authorization / risk:** explicit bounded owner approval, 2026-10-08; PROTECTED governance.
- **Brief:** [`DEV-FLOW-002.md`](DEV-FLOW-002.md), including scope and hard exclusions.
- **Branch:** `codex/dev-flow-002-adoption`. Exact head is derived with `git rev-parse HEAD` and
  will be bound in the PR description/review; do not use a self-referential checkpoint hash.
- **PR:** [#203](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/203),
  `DEV-FLOW-002 — Simplify BEYOND Development Workflow`; opened, not merged.
- **Done:** central workflow charter; reconciled procedural instructions; preserved historical
  Drop skill with a supersession notice; Protected governance risk guidance and 25 CLI regression
  cases; VCC-001 procedural transfer retaining all product scope, acceptance evidence, six
  screenshots, and independent exact-head review. State Rail remains unimplemented/unstarted.
- **Local verification:** 206 files passed; 2,129 tests passed, one skipped. Architecture checks,
  TypeScript/production build, syntax and whitespace checks passed. Committed-diff risk guidance
  reports PROTECTED. Consistency checks confirm unchanged product doctrine, VCC scope/invariants/
  acceptance/review, historical skill body, Factory pointer, CI workflows, and dependency files.
  Browser tests used the ignored onboarding config selecting installed `/usr/bin/chromium`;
  no tests, assertions, or tracked browser configuration were bypassed or weakened.
- **Remaining:** confirm exact-head required PR Verification, obtain independent Protected review,
  and wait for Gavin's merge approval. No PR merge is authorized in this session.
- **Environment:** initial GitHub API requests were denied by the egress policy. Added only
  `api.github.com` to the cloud environment draft, preserving presets and setup instructions.
  PR creation and subsequent read-only API checks now succeed using the existing binding; no
  new token was requested. Draft publication is not claimed.
- **Next action:** inspect required CI on the final PR head, then assign an independent Protected
  Reviewer to that exact head and resolve any findings. Wait for Gavin's explicit merge approval.
  Do not modify PR #201, start VCC-001, activate Factory Phase 2, or integrate anything.
- **Authority conflicts:** none unresolved within the approved adoption scope. Historical procedure
  is explicitly superseded for new work only after this adoption merges with owner approval.

## DECISIONS FOR GAVIN

None. Independent Protected review and owner merge approval remain separate steps.


Final-review follow-up: direct installed TRAIN/BODY shortcuts now initialize the root suit from
the same read-only phase/pin derivation used by boot. The shell refreshes it on minute/resume/
rollover until TODAY mounts, then yields to TODAY's live state and cancels obsolete reads. Two
stored-pin shortcut regressions pass. The renewed full `npm run verify` passes (252 files,
2,556 passed / one existing skip), and built offline cold workout/water shortcut acceptance
passes at 320/360/412 with no duplicate workout set. The earlier exact-head review was superseded
by its shortcut finding; the new head requires a renewed verdict recorded on PR #241.

## MEAL-PLAN-001 — Codex, 2026-11-01 night campaign

- Authorization: #373/#375 and Gavin's continuation instruction: separate branches and prepared
  PR descriptions may proceed while GitHub API access is blocked. Lane FEATURE, Builder Codex.
- Branch `codex/meal-plan-001`, fresh baseline `744cdcf3b2e720bcadba0dfef9ed0261b8f06296`.
- Deterministic 3/7-day saved-meal draft in MEAL and meal tools; saved schedule work/off slots,
  current calorie/protein targets, swap/clear and updated totals. Confirmed grocery note only;
  no food log, table, dependency or provider. SavedMeal has no ingredient/notes fields, so the
  grocery list honestly uses meal names and serving counts. Search-only entry is append-only.
- REUSE: saved meals, nutrition targets, schedule/lived-day helpers, MEAL surfaces, captureItem.
  OWN: rotation/portions, slots, draft and confirmation UI. BUILD FROM SCRATCH: bounded allocation
  rule not present in current queries; no dependency. Claude-reserved source files untouched.
- Typecheck PASS; focused planner/catalog 21/21 PASS; harness/meal acceptance 77/77 PASS;
  app-route/focus/target regression run 93/93 PASS. Complete system-Chromium `npm run verify`
  PASS after fixing a wrong catalog route and planner placement that affected focus recovery.
- Test support: optional BEYOND_BROWSER_EXECUTABLE; Android launch isolated to same-document
  navigation inside Sync002's desktop iframe; async substitution list checked after it loads.
  Existing assertions and the real fallback link remain. No production Garmin/Engine change.
- PR description: `/workspace/shared/beyond-night-campaign/meal-plan-001-pr.md`. No PR or review
  claimed. Git writes now also fail authentication after reconnection; commits are preserved
  locally and will be packaged for recovery. Next: #377 from fresh master, then #376.

- MEAL-PLAN-001 fresh-master follow-up: #374 is merged as #391; its Codex branch is frozen by
  owner instruction. Meal branch rebased onto freshly fetched master including FREE-BRIEF-001.
  Typecheck PASS; fresh focused checks26PASS; latest targeted8PASS; complete
  `BEYOND_BROWSER_EXECUTABLE=/usr/bin/chromium npm run verify` PASS:403 files passed/one skipped,
  3,408 tests passed/two skipped, production/PWA build PASS. Common fixture corrections wait for
  food lookup's initial focus and TODAY's fixed-time mode read before acting; TodayRun's rotation
  locator is exact after the free brief began repeating that text. All original assertions remain.
  Ready PR creation/push is attempted next; GitHub API and Git write access remain unverified.

---

# WALKTHROUGH-002 — phone-size check of #499–#503 (Gavin, 2026-11-13: "Walkthrough") — Routine

Report: [WALKTHROUGH-002.md](WALKTHROUGH-002.md). Branch `ccr-88f5c085-walkthrough-002`.

- **Fixed:**
  - the SINCE label's WCAG AA contrast failure (from #503);
  - WEEK AHEAD opening below the fold on a work day.
- **Findings awaiting Gavin:**
  - the run fact appears three times on TODAY (recommendation: drop the hero's "scheduled:" line while the band
    shows);
  - "NEXT Next …" wording (after #502);
  - the state stack at the fold;
  - the length of WEEK AHEAD in place.
- **Still a field test:** #402.
- **TODAY-CLARITY-001** (branch `ccr-88f5c085-today-clarity`) does findings 3–4:
  - the hero no longer repeats the run while the band shows;
  - "NEXT Next" is now "NEXT Shift: …";
  - the screenshots were refreshed.
- **Still open from the walkthrough:**
  - the state stack (moment + state) at the fold;
  - a compact WEEK AHEAD on TODAY.

---

# DAY-MAP-001 — the lived-day map (Gavin, 2026-11-13: "top tier improvements") — Feature, slice 1

Brief: [DAY-MAP-001.md](DAY-MAP-001.md). Branch `ccr-88f5c085-day-map`.

- **Slice 1:** TODAY's hero bar draws what was recorded on the lived day: Garmin sleep, work, a lift, meals, water and
  the check-in. Read only; it steps aside during operations.
- **Next slices:**
  1. planned blocks ahead;
  2. tap to act;
  3. outline new marks;
  4. Alfred.
- **Also open:** #502.
- **DAY-MAP-001 slice 1** merged in #506.
- **Slice 2** (branch `ccr-88f5c085-day-map-plan`): the sleep plan's windows are outlined on the bar, and SLEEP PLAN ›
  opens ROUTE. This amends SHIFT-SLEEP-PLAN-001, per Gavin's "A".
- **Next:** tap to act; outline new marks; Alfred.
- **Slice 2** merged in #507, with the post-merge review PASS. Its review notes are in #508 (review PASS, CI green).
- **Slice 3** (branch `ccr-88f5c085-day-map-tap`): THE NIGHT SO FAR lists the map's marks, each opening its own screen.
- **Next DAY-MAP step:** outline new marks since the last look.
- **Slice 3** merged in #509, and #508 merged.
- **New-mark outline** (branch `ccr-88f5c085-day-map-fresh`): marks new since the last look are outlined and named
  NEW.
- **Next:** WEEK STRIP.

---

# BODY-DASH-001 — DATA opens on the numbers (Gavin, 2026-11-14) — Protected, approved

Brief: [BODY-DASH-001.md](BODY-DASH-001.md). Branch `ccr-88f5c085-body-dash`.

- **What it adds:** a numbers-first dashboard above DATA's shortcuts and the cave. Hydration, sleep, weight, nutrition,
  steps, resting HR and lifestyle each show their source and freshness and link to their existing logging and history.
- **Verification:** typecheck, the architecture check, the node and browser suites and the build; screenshots at 360,
  412 and 1024 px.
- **Next:**
  1. independent exact-head review;
  2. Gavin merges.
- **Open decisions for Gavin:**
  - trim the cave's NUMBERS tab (it repeats the dashboard);
  - a shared D/W/M/Y metric page (BODY-DASH-002).

---

# Post-BODY cleanup (Gavin, 2026-11-14) — two sequential PRs

- **#512 (BODY-DASH-001)** merged at `4403ca4e`; its last two CI jobs finished green.
- **Objective 1, NUMBERS-CLEANUP-001** (branch `ccr-88f5c085-numbers-cleanup`):
  - NUMBERS' copy of today's tiles and the Weight card folds into one closed "Today's readings" disclosure;
  - click tests added for the Lifestyle links.
- **Objective 2, the shared shortcut grid:** starts from fresh master only after Objective 1 merges with Gavin's
  approval.
- **Not started:** BODY-DASH-002 and the visual-foundation mission wait for authorization.
- **Objective 1 (NUMBERS-CLEANUP-001)** merged in #513.
- **Objective 2 (SHORTCUT-GRID-001,** branch `ccr-88f5c085-shortcut-grid`): shortcut grids follow their own width;
  verified at 320, 360, 412, 768 and 1024 px.
- **Then:** stop and report. The visual-foundation mission waits for authorization.
- **Objective 2 (SHORTCUT-GRID-001)** merged in #514.

---

# VISUAL-FOUNDATION-001 — BEYOND's visual foundation, slice 1 (Gavin, 2026-11-14)

Brief and design language: [VISUAL-FOUNDATION-001.md](VISUAL-FOUNDATION-001.md). Branch
`ccr-88f5c085-visual-foundation`.

- **What it does:** BODY-DASH-001's language is extracted into `src/ui/foundation/` (tokens, command bar, panels,
  source tags, sparklines, meters). BODY uses it with no visual change. The guide covers colour roles, cut corners,
  numerals, and the emblem and skyline rules.
- **Verification:** typecheck, the architecture check, the node and browser suites and the build. BODY's element-only
  dashboard screenshots match master byte for byte at 320, 360, 412, 768 and 1024 px.
- **Next:**
  1. independent exact-head review;
  2. Gavin merges.
- **Later slices, each needing Gavin's go:** TRAIN, then TODAY, then MORE and the cave.
- **Noted, outside scope:** two habits created in the same millisecond can swap order between runs.
- **#515** merged at `5a7338bd`; independent review PASS at `2b8f0f60` and `008f440d`.

---

# VISUAL-FOUNDATION-002 — TRAIN's first view on the foundation (Gavin, 2026-11-14: "Start. Keep last session")

Brief: [VISUAL-FOUNDATION-002.md](VISUAL-FOUNDATION-002.md). Branch `ccr-88f5c085-train-foundation`.

- **What it does:**
  - TRAIN opens on the command bar.
  - The suggested workout is unchanged in substance, with numeral counts.
  - LAST SESSION, THIS WEEK and NEWEST RECORD sit under the suggested workout.
  - The Accessibility size rule is amended (Gavin).
  - The habit-order tiebreak is fixed.
- **Verification:** typecheck, the architecture check, the node and browser suites and the build; TRAIN screenshots
  at 320 to 1024 px.
- **Next:**
  1. independent exact-head review;
  2. Gavin merges.
- **Waiting for Gavin's go:** TODAY on the foundation, then MORE and the cave, and BODY's sub-16 px captions and
  buttons.
- **#516** merged at `e1209287`; independent review PASS at `e8445e23`. Its two non-blocking notes ride in
  VISUAL-FOUNDATION-003.

---

# VISUAL-FOUNDATION-003 — TODAY's first view on the foundation (Gavin, 2026-11-14; Protected, approved)

Brief: [VISUAL-FOUNDATION-003.md](VISUAL-FOUNDATION-003.md). Branch `ccr-88f5c085-today-deck`.

- **What it does:**
  - the date sits on the skyline header;
  - the band, the next step and the numbers are framed panels, with the numbers moved under the next step;
  - Garmin captions are in Garmin blue;
  - the empty preparation frame is fixed;
  - BODY is brought up to 16 px;
  - there is no training panel (Gavin).
- **Also:** #516's notes (THIS WEEK's empty-week wording, the second habit list's tiebreak).
- **Next:**
  1. independent exact-head review;
  2. Gavin merges.
- **Later, each with Gavin's go:** MORE and the cave's headers on the command bar.

---

# VISUAL-FOUNDATION-004 — MORE and THE CAVE on the foundation (Gavin, 2026-11-14: "Amaze me")

Brief: [VISUAL-FOUNDATION-004.md](VISUAL-FOUNDATION-004.md). Branch `ccr-88f5c085-more-cave`.

- **What it does:**
  - MORE opens on the command bar, and its status cards are framed panels;
  - the cave's head is a command bar, its tabs are mono capitals with the chosen one in red, and its blocks are
    framed panels;
  - sentences are 16 px, except FILE's run table, MONTH's grid and the rotation map, which are recorded as an
    exception.
- **Next:**
  1. independent review;
  2. Gavin merges after VISUAL-FOUNDATION-003 (#517).
- **CHP-001 (Capability Harvest Protocol, Gavin):**
  - **First harvest:** the numbers subsystem.
  - **Recommended mission:** METRIC-PAGE-001, one metric page used everywhere, with a 90-day direction line.
  - **Status:** awaiting Gavin's go.



---

# Historical comparison handoff before integration

# Current objective — 4.0-b slice 3a: weekly training and recovery evidence

- Builder Codex; branch `codex/4b-recovery-comparison` from fresh master `2bbceb73` (coach card merged). Gavin delegated the next decision and resumed work; [bounded brief](BEYOND-4.0-B.md). No competing active implementation PR found.
- Optional read-only comparison within Weekly TRAINING: two seven-finished-lived-period windows, canonical weighted volume/counts, Garmin sleep/resting readings and existing personal-range interpretation/sample counts. No readiness score, causal verdict, new coaching rule/threshold, Engine/Garmin authority change, write, schema, dependency, provider or TODAY ranking change.
- The lighter-week suggestion remains outside this slice: it would require a separately settled rule consistent with Garmin watch-only authority. Do not claim this evidence view delivers that coaching rule.
- Verification/review/CI pending; final results maintained in the PR handoff without invalidating exact-head review. Gavin alone merges.
