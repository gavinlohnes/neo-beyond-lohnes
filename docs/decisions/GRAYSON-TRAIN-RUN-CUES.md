# GRAYSON-TRAIN-RUN-CUES — spoken run and walk cues, and a buzz, with the phone locked (owner go, 2026-11-24)

Gavin's merge of the [brief](../agent/GRAYSON-TRAIN-RUN-CUES-001.md) approves these defaults and the new Health
Bridge permissions.

- **Health Bridge, not the web app:** a PWA's timers and `speechSynthesis` stall when the screen locks, so the cues
  come from Health Bridge 0.12.0's foreground service. Its moment alarms are inexact and can't do this job.
- **Foreground service type `health`, not `mediaPlayback`:** Android names exercise trackers for `health`.
  `mediaPlayback` would skip the runtime prompt, but it describes a different job. Ask Gavin before switching.
- **One source of truth:** BEYOND hands the Bridge the whole run on each of his taps (START, PAUSE, RESUME, END, the
  pain control, and a change to VOICE CUES mid-run). The payload includes each cue's time, his words, and whether to
  speak or buzz it. The Bridge holds no wording, speaks only what BEYOND sent, never writes the run back, and keeps
  nothing on disk. Two-way control from the lock screen is C7.5.
- **Same clock:** both apps work the time out from `startedAt + pausedMs`, frozen at `pausedAt`. A late cue is said
  late only while its interval is still running. Otherwise it's skipped, never said out of order.
- **What speaks and buzzes:** every cue in RUN-001's timeline. The buzz comes before a run (long double) and before a
  walk (one short), and only while the screen is off or locked, so he never feels two. Music ducks under the voice.
- **When it's on:** the VOICE CUES switch on the running screen. It defaults to on once BEYOND holds a Health Bridge
  import receipt, otherwise off with an install line. Once he sets it, his choice is remembered (`on` in
  `beyond.runCues.v1`).
- **Stops by itself:** 10 s after FINISH, on END in BEYOND, on END CUES, or 4 h after start. It never restarts after a
  reboot.
- **His to change:** the switch; voice and buzz separately; each cue's words, with `{minutes}`/`{seconds}`; which
  cues speak; RESET; MUTE for a run. All of it is stored in `beyond.runCues.v1` and travels with his settings and
  backup as "Run cue words and voice". He can't change the voice or speed here; they follow Android's text-to-speech
  settings.
- **Not installed:** nothing breaks. The run carries on with RUN-001's on-screen cues, and the switch says so once.
