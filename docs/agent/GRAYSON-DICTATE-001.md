# GRAYSON-DICTATE-001 — say it where you already are: capture, meals and the check-in

- **Authorization:** Gavin, 2026-11-24. Backlog row **C7.1** (DELIGHT, ranked 15th): "Dictation in capture, the
  check-in, food and plans" (campaign plan C7.1, "Voice into capture everywhere"). At 05:03 CT: **"Yes. Start the next
  briefs"**; at 05:23 CT: **"Just keep pumping out work."** His rule: **"I should be able to edit and tweak or correct
  everything in this app."** Merging this brief approves the defaults below.
- **Lane: FEATURE.** UI only, on the existing free helper and confirm path. No new table, event, permission, network
  call, Engine input or notification. Nothing saves without his tap.
- **Starting commit:** `origin/master` `92f46cf3` (#667). Re-fetch before starting.
- **Builder:** Grok Bot. Branch `grok/grayson-dictate-001`. **Reviewer:** Claude Code (Codex is offline).
  **Active PR:** pending.
- **Order and overlap:** Grok Bot **#4** in [GRAYSON-BUILD-ORDER](GRAYSON-BUILD-ORDER.md) (2026-11-24), after
  TODAY-SPLIT-003, TODAY-CALM-001 and PLAN-FRESH-001, because its shared voice hook is a piece later features reuse. `RecordSheets.tsx` (meal list) and
  `CheckInSheet.tsx` may also change in Grok Bot's logging work (LOG-NUDGE, WINDOW-ALERT), so rebase on master first
  and keep these edits to the spots named below.

## Objective and benefit
Voice exists today in two places only: Drive Home (`ui/components/DriveHome.tsx`) and Alfred's sheet
(`ui/components/AlfredSheet.tsx`), each with its own copy of the Web Speech code. Coming off a 12-hour shift, the
places he actually opens are quick capture, the meal log and the check-in, and all three need typing or a row of taps.
After this, each has a **TALK** button: he says one sentence, sees exactly what BEYOND understood, and taps once to
save it. One sentence can become several records ("32 ounces of water, chicken bowl, remind me to call the vet
tomorrow"), the way Drive Home already does it, but on screen and without speaking back.

**Benchmark (cited, read 2026-11-24):**
- Todoist Ramble: you speak, tasks appear in a preview as you talk, and you confirm with "that's all" or Add tasks
  ([Todoist Help: Dictate to add tasks with Ramble](https://www.todoist.com/help/articles/dictate-to-add-tasks-with-ramble-P1Raq7vVF)).
  Scorecard P5.
- MacroFactor Describe: speak or type what you ate, review the items it found, then tap Log Items
  ([MacroFactor Help: Log foods with Describe](https://help.macrofactorapp.com/en/articles/216-log-foods-with-describe)).
  Scorecard F4.
- Drafts opens to a blank page ready for typing or dictation (scorecard K5, [App Store](https://apps.apple.com/us/app/drafts/id1236254471)).

What we copy: speak, see a preview of separate items, confirm once. What we don't: AI parsing or a server. BEYOND's
free helper (`application/helper/freeHelper.ts` `interpret`) already turns plain phrasings into the same confirm cards
Alfred makes, offline and free, and returns anything it isn't sure of as `unknown`, word for word.

**Why not just the keyboard mic:** Android's keyboard can already dictate into any text box. That fills one field. The
gain here is one sentence into several previewed records, the check-in's five chips filled by voice, and saved meals
found by name, which a keyboard can't do.

## Recommended defaults (approved when Gavin merges this brief)
1. **One shared hook.** `ui/speech/useDictation.ts` replaces both copies of the Web Speech code: `supported`,
   `listening`, `start({ interim, onWords, onDone })`, `stop()`. `lang` `en-US`, as today. It cancels any spoken reply
   before listening, stops on unmount, and on an error stops once and never loops (the #381 review rule). Drive Home
   and Alfred's sheet move onto it with **no change in behaviour** (their existing browser tests must pass unchanged).
2. **Quick capture (`FastCapture.tsx`).** A **TALK** button beside CAPTURE. While he talks, the words fill the text box
   (interim results on), and TALK reads **STOP**. When he stops:
   - The words go through `interpret(words, await readHelperContext())`.
   - If it found at least one card, the box is replaced by a preview headed **"I heard"**: one row per card, in
     `describeProposal` words, each with **REMOVE**. Anything it wasn't sure of becomes one note row, "Note: …", with
     the leftover words exactly as said (Drive Home's rule). Buttons: **SAVE ALL** (primary), **CHANGE WORDS** (puts
     the words back in the box to fix, then CAPTURE or TALK again), **KEEP AS ONE NOTE** (saves the whole sentence raw,
     today's behaviour).
   - If it found no cards, the words just stay in the box, and CAPTURE works as today. Raw stays the default for
     anything it doesn't understand.
   - A question ("what did I eat today?") is never turned into cards; it stays in the box.
   - **SAVE ALL** confirms each card through `confirmContextProposal`, with the context read when the preview was made
     and advanced by his own saves, exactly as Drive Home's `saveAll` does (extract that loop to one shared function,
     `confirmProposals(cards, ctx)` in `application/alfred/contextActions.ts`, and have Drive Home use it). A
     `CONTEXT_CHANGED` refusal says "Things changed since I heard that. Tap TALK and say it again." A card that fails
     stays on the preview with the rest unsaved; the ones that saved are listed as saved. The usual light haptic, and
     the message "Saved N." No undo beyond what each record already has (his Oct 29 rule: routine logs stay quiet).
   - Typed text is unchanged: CAPTURE still saves raw. Sorting happens only after TALK.
3. **Meal log (MEAL sheet list page in `RecordSheets.tsx`).** A **TALK** button on the "Search your meals and foods"
   row. When he stops:
   - Words that match a saved meal become `log_meal` cards in the same "I heard" preview, with the sheet's WHEN choice
     applied (`resolveWhen`, as the sheet's own save does). SAVE ALL, REMOVE and CHANGE WORDS as above.
   - Food words it didn't match go into the search box (via `foodQuery`, first unmatched item), so he can pick it from
     his foods or the free search with the taps he uses now. Other leftover words are shown as "Didn't catch: …" and
     dropped only when he closes the sheet.
   - TALK shows only when the sheet is logging to today. When he has picked an earlier day, TALK is hidden (the
     earlier-day rule needs an explicit time, and a voice card shouldn't guess one).
4. **Check-in (`ui/screens/today/CheckInSheet.tsx`, new check-ins only, not fix mode).** A **TALK** button at the top.
   "Energy 3, stress 2, mood 4, sore 1, urge 0" fills those chips; any field he didn't say stays as it was. Nothing
   submits: SUBMIT CHECK-IN stays the save, so he sees every chip before it goes. Export the helper's existing check-in
   reader as `readCheckInWords(text): PartialCheckInValues` (energy, stress, mood 1–5; soreness, urge 0–5; "craving"
   means urge, "sore" means soreness; numbers out of range are ignored). If nothing matched, a line says "Say each one
   with a number, like energy 3." Numbers as words ("three") count too.
5. **Plans.** No separate mic on PLANS in this brief: "remind me to … tomorrow" said into quick capture already makes
   an `add_reminder` card with a date. Noted as a later row if he wants TALK on PLANS itself.
6. **Where voice isn't available** (no Web Speech in the browser): TALK isn't shown. On an error or silence: "Didn't
   catch that. Tap TALK again or type it." The words heard so far stay in the box.
7. **Privacy line:** under the first TALK he ever taps, once: "Your phone's speech service turns your words into text.
   BEYOND only keeps what you save." (Chrome's Web Speech may send audio to the browser's speech service; we don't
   claim otherwise.)

## Everything is his to change
In MORE → Settings, a new **Voice** section (`<details id="command-voice">`):
- **TALK buttons** on or off (default on). Off hides TALK in quick capture, the meal log and the check-in; Drive Home
  and Alfred's sheet keep their own voice.
- **Sort what I say into logs** on or off (default on). Off means TALK only fills the box, like the keyboard mic, and
  CAPTURE saves raw.
Stored in `beyond.dictation.v1` (`{ talk: boolean, sort: boolean }`), validated, and added to `TRAVELLING_SETTINGS`.
Every previewed card can be removed, and CHANGE WORDS lets him fix what it heard before anything saves.

## Design principles check (Vision, Nov 24)
- **Yours to change:** both switches; every card removable; CHANGE WORDS before save.
- **Fix, don't ask:** what it understands becomes cards; what it doesn't stays as his words, never guessed.
- **One tap for the usual:** TALK, speak, SAVE ALL.
- **Built around shift:** made for the drive home and the first minutes after a shift.
- **Calm:** no spoken replies here, no sounds, no badge.
- **Always says why:** each card says in plain words what it will save; leftovers are shown, not hidden.
- **Simple first:** reuses the free helper, the confirm path and one hook.
- **Tap or say it:** this is that principle, on the three screens he uses most.

## Scope
- New `ui/speech/useDictation.ts`; `DriveHome.tsx` and `AlfredSheet.tsx` switched to it.
- New `ui/components/HeardPreview.tsx` (+ css): the "I heard" rows, REMOVE, SAVE ALL, CHANGE WORDS, KEEP AS ONE NOTE.
- `application/alfred/contextActions.ts`: `confirmProposals`, used by Drive Home and the preview.
- `application/helper/freeHelper.ts`: export `readCheckInWords` (built from the private `checkIn` reader; `interpret`
  unchanged).
- `ui/components/FastCapture.tsx`, the meal list in `ui/components/RecordSheets.tsx`, `ui/screens/today/CheckInSheet.tsx`.
- `ui/screens/more/MoreScreen.tsx`: the Voice section; `persistence/settingsTransfer.ts`: the key.

## Excluded
- On-device speech models (the campaign plan's Whisper fallback is a later, PROTECTED row if Web Speech fails offline
  on his phone), AI parsing, Alfred calls, spoken read-back, wake words, voice on the Health Bridge widget (C7.4),
  voice on PLANS, new proposal kinds, changes to what `interpret` understands.

## Acceptance
- `tests/freeHelper.test.ts`: `readCheckInWords` fills only the fields said; "craving" and "sore" map; words-as-numbers
  work; out-of-range numbers are ignored; `interpret` results are unchanged (existing tests pass).
- `tests/confirmProposals.test.ts`: saves in order and advances the context; stops at the first failure and reports
  which saved; passes `CONTEXT_CHANGED` through.
- `tests/settingsTransfer.test.ts`: `beyond.dictation.v1` travels and a bad value falls back to the defaults.
- Browser tests with a fake `SpeechRecognition`:
  - Quick capture: "32 oz water, chicken bowl, call the vet" with a saved "Chicken bowl" shows water and meal cards
    plus "Note: call the vet"; REMOVE drops one; SAVE ALL saves the rest and nothing else; CHANGE WORDS returns the
    words; KEEP AS ONE NOTE saves one raw capture; a question stays in the box; "sort" off only fills the box.
  - Meal log: a saved meal name becomes a card with the WHEN choice applied; an unknown food lands in the search box;
    TALK is hidden for an earlier day.
  - Check-in: spoken values select the chips; nothing submits until SUBMIT CHECK-IN; TALK isn't in fix mode.
  - No Web Speech: no TALK anywhere; an error shows the retry line and keeps the words.
  - `tests/browser/DriveHome.test.tsx` and Alfred sheet voice tests pass unchanged.
  - Keyboard only; axe clean; 320/360/412 px no overflow.
- Screenshots in `docs/agent/screenshots/GRAYSON-DICTATE-001/` at 360 px: quick capture preview, meal log with TALK,
  check-in after TALK, MORE → Voice.
- **Device check (Gavin):** on his phone, say one sentence with water, a saved meal and a reminder into quick capture
  and save it; fill a check-in by voice. Also try TALK once in airplane mode and say what happens: if it fails offline,
  that decides whether the on-device fallback row goes up the backlog.

## Decision record
- Preview, not auto-save: the free helper is narrow on purpose, and a voice mistake is easier to catch before it's a
  record. Drive Home reads back for the same reason.
- No spoken replies: these are screens he's looking at; Drive Home stays the eyes-free path.
- Typed capture stays raw: his capture habit ("raw by default") doesn't change because voice was added.
- The check-in is filled, not submitted: five numbers heard wrong would be a wrong check-in, so he sees the chips.

## Stop and ask Gavin if
- Moving Drive Home or Alfred's sheet onto the shared hook would change how either behaves.
- The meal sheet can't apply its WHEN choice to voice cards without a new rule for the time.
- Anything here would need Alfred, the network or a new stored record.

## Risks
- **Mishearing:** every card is shown in plain words before saving, and leftovers are kept as his words.
- **Browser speech differences:** Chrome on Android is the target; TALK hides where Web Speech is missing.
- **Offline:** Web Speech may not work without a signal; the device check tells us, and typing always works.
