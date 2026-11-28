# GRAYSON-GARMIN-WORKOUTS-001 — Garmin runs and workouts come into GRAYSON

- **Authorization:** Gavin, 2026-11-27, 21:26 CT, in his main chat: **"I think we do 1 for now and differ the rest for
  later. 1 is really the most beneficial and the most inline with what I was thinking."** He was answering "On 1, do you
  mean brief Garmin runs into 1.0 now, so they're in before the Dec 7 block?", where gap 1 of the Nov 28 rescore was
  "Garmin runs and workouts don't come in, so a run has no distance or pace to compare over time." The rest alert and
  a label photo scan move to 1.1; food search, recipes and micronutrients wait. His standing rule: **"I should be able
  to edit and tweak or correct everything in this app."** Merging this brief approves the defaults below.
- **Lane: PROTECTED.** A Health Bridge (Android) change, a new Health Connect read permission, a new imported table
  (Dexie v29) and a new interchange file. Gavin merges after green CI and a fresh-context reviewer's exact-head PASS
  posted on the PR.
- **Starting commit:** latest `origin/master` with #753 (the X3 follow-up) merged. Re-fetch before starting. Written
  against `051a6e22` (X3 merged as #751).
- **Builder:** Claude Code, TRAIN lane (the "Project GRAYSON TRAIN builder" chat), which built the run cues and the
  Health Bridge foreground service (GRAYSON-TRAIN-RUN-CUES-001). Branch `claude/grayson-garmin-workouts-001`.
  **Reviewer:** a fresh-context reviewer.
- **Order:** row X5 in the Launch 1.0 table of [GRAYSON-BUILD-ORDER](GRAYSON-BUILD-ORDER.md), after #753. It is the
  only Health Bridge change open while it's built. PR #694 (ASKS-COUNT, out of 1.0) must renumber its Dexie version
  again after this merges.

## Objective and benefit
Garmin data already reaches GRAYSON through Health Bridge and SYNC GARMIN: sleep, plus hourly steps, heart rate and
calories (`android/health-bridge/.../ActivityExport.kt` schema 2, `application/externalActivityCommands.ts`,
`application/healthSync.ts`). Workouts don't. The Bridge holds no exercise permission
(`android/health-bridge/app/src/main/AndroidManifest.xml` lists sleep, steps, heart rate, resting heart rate, total
and active calories, history and background only). So:

- A Couch to 5K run he does with GRAYSON open records time and segments only (`application/runningQueries.ts`
  `RunningHistoryEntry`: no distance, pace or heart rate).
- A run, walk or lift he records only on his Garmin never shows in GRAYSON.
- There's no timed run to compare over time, which was scorecard row C14 and the 1.5-mile standard.

Garmin sends each workout to Health Connect one way after it ends, with distance, speed, heart rate, elevation gained,
steps and calories. It does not send running power, cadence or sweat loss (Garmin's support list as reported by
[Android Central, 2025-06-30](https://www.androidcentral.com/wearables/garmin/heres-everything-garmin-will-and-wont-share-with-google-health-connect)
and [Tom's Guide, 2025-07-01](https://www.tomsguide.com/wellness/fitness-trackers/garmin-clarifies-what-data-its-sharing-with-google-health-connect-heres-the-full-list)).
Health Connect stores these as an exercise session with an exercise type, plus distance, speed and heart rate records
over the same time ([Health Connect data types](https://developer.android.com/health-and-fitness/health-connect/data-types)).
The exact record types Garmin fills are assumed and are the first thing the build confirms on his phone.

After this, his Garmin workouts land in TRAIN, a GRAYSON run gains its distance and pace, and he can see his runs side
by side over the 4-week block.

## Recommended defaults (approved when Gavin merges this brief)
1. **What the Bridge reads.** Exercise sessions from the last 90 days on first sync, then anything newer: type, start,
   end, title, and over the session's own time, total distance, average speed, average and max heart rate, elevation
   gained and active calories, each only if present. Only sessions whose data origin is Garmin Connect. No route, no
   GPS points, no per-second samples.
2. **What comes in.** Every Garmin workout kind: runs, walks, strength and other. Runs and walks show in TRAIN's
   running history; strength and other show in TRAIN's history. Each kind has an on/off switch, all on.
3. **Units.** Miles and minutes per mile, as the rest of GRAYSON uses pounds and miles.
4. **The same workout is never counted twice.** A Garmin session that overlaps a GRAYSON running session or strength
   workout by at least half of the shorter one's time is the same workout. GRAYSON adds Garmin's numbers to its own
   entry (distance and pace on a run; heart rate on both) and shows "with Garmin". No second entry appears.
5. **A Garmin-only run counts as a run, not as a plan step.** It shows in running history as "Garmin run" with its
   time, distance and pace. It never advances his Couch to 5K plan, which still moves only on his tap (the approved
   running default). He can tap **COUNT AS** to mark it as the plan's next run, which is the same tap as today.
6. **Runs over time.** A RUNS view in TRAIN's PROGRESS: one line per run in the last 8 weeks with date, distance,
   time, average pace and average heart rate, newest first, with the best pace among runs of 1.5 miles or more marked
   "best". The 1.5-mile standard reads its time from that pace and says "from your average pace". Nothing is scored.
7. **Calories are never added twice.** Garmin's hourly calories already include his workouts (GARMIN-005), so the
   burn estimate (F4), expenditure and day targets keep their current inputs. A workout's calories are shown on it as
   information only.
8. **Evidence only.** Like GARMIN-002 and GARMIN-003, Garmin data never logs a workout he didn't do, never advances a
   rotation, plan or progression, never changes a target, and never starts anything. Nothing is sent to his phone.
9. **He wins.** He can change a Garmin workout's kind, hide it, remove it, or unlink it from a GRAYSON entry. A
   removed one never comes back on a later sync. A field he corrected is never overwritten by Garmin.
10. **One tap, as today.** It arrives with SYNC GARMIN (SYNC-002). The sync line adds "and N workouts".

## Everything is his to change
Defaults 1 to 6 and 10 live in a GARMIN WORKOUTS card in settings beside the other Garmin settings, with **RESET**:
the history window (30, 90 or 365 days), each kind's switch, the overlap rule (a half, or any overlap), units, the
8-week RUNS window, and whether the 1.5-mile standard reads Garmin pace. Each workout's own edits are per item, with
UNDO.

## Design principles check (Vision, Nov 24)
It asks nothing new of him: his watch already records the workout. It gets better as data arrives, never asks for a
score or streak, and nothing changes without his tap.

## Scope
- **Health Bridge (Android):** add the exercise, distance, speed and elevation read permissions; read sessions and
  their summary values as default 1; write a new versioned file, `BEYOND_HEALTH_CONNECT_WORKOUTS` schema 1, beside the
  activity file (leave the activity and sleep formats unchanged). Show on the Bridge's own screen "Found N Garmin
  workouts in the last 90 days" before sending, so the phone check can confirm the data exists.
- **GRAYSON import:** a parser and an atomic, evidence-only import into a new `externalWorkouts` table (Dexie v29),
  keyed by Health Connect's record id, newer exports replace older ones, removals by him are kept as tombstones.
- **Matching:** a pure `matchGarminWorkouts(garmin, runningSessions, strengthSessions, settings)` for default 4.
- **TRAIN:** "with Garmin" numbers on running and strength history entries, Garmin-only entries, COUNT AS, the RUNS
  view in PROGRESS, the settings card, edits with UNDO.
- **Export and backup:** Garmin workouts in the records CSV and in backups.
- **Tests:** the parser accepts schema 1 and rejects bad files; overlap matching at exactly half, under half and
  across midnight; a Garmin-only run never advances the plan; COUNT AS advances it once; calories never reach the
  burn estimate or expenditure; a removed workout doesn't return; his correction survives a newer export; old
  backups without the table load; the RUNS view at 320, 360 and 412 px with axe; Kotlin unit tests for the reader
  with a fake Health Connect client, including a session with no distance.

## Excluded
Routes and maps, splits, running power, cadence, training load or effect, writing anything back to Health Connect or
Garmin, non-Garmin sources, and any change to the burn estimate, targets or progression.

## Acceptance
- On his phone, the Bridge shows a count of Garmin workouts that matches what Garmin Connect shows for the last 90
  days.
- After SYNC GARMIN, a run he did with GRAYSON open shows its distance and pace, and no second entry.
- A Garmin-only run shows in running history and in RUNS, and his Couch to 5K plan is unchanged.
- A Garmin strength workout during a TRAIN workout adds heart rate to that workout and nothing else.
- Today's calories, burn estimate and targets read the same before and after the sync.

## Decision record
Add a line to `docs/decisions/` with the defaults above and Gavin's authorization line.

## Stop and ask Gavin if
- Health Connect on his phone has no Garmin exercise sessions, or they carry no distance. Then stop and report what
  the Bridge found; don't build GRAYSON screens on data that isn't there.
- Matching would need to change a GRAYSON entry's own recorded time or status.
- Reading workouts needs any permission beyond the reads in Scope, or a background schedule beyond today's.

## Risks
- **Garmin's Health Connect list is from mid-2025** and may have changed. The Bridge's count on his phone is the check.
- **Installing the new Bridge.** The phone check includes installing the new Bridge build and granting the new
  permissions. Say so in the PR's phone-check steps.
- **Two writers to Health Connect.** If another app also writes his runs, only Garmin-origin sessions come in.
