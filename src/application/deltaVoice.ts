/**
 * GRAYSON C1.6 · Delta's voice (Gavin, 2026-11-20): "Bruce → Terry by default, with Delta and Droid as switchable
 * voices." One copy library for every sentence Delta says on Orientation. A voice changes words only: every variant
 * states the same facts and the same Engine advice, adds no advice of its own, and never sounds more certain than
 * the records. The relationships are creative references (PROJECT_GRAYSON_VISION.md), so no names or catchphrases are
 * borrowed; Droid keeps only the "Observation: / Query:" rhythm.
 *
 * Hard days drop the act: Minimum Day, the Engine's STABILIZE and the sustained-mood sentence are PLAIN in every voice.
 */

/** PLAIN is the calm house voice (and the hard-day voice). MENTOR is Bruce → Terry, the default on screen. */
export type DeltaVoice = "PLAIN" | "MENTOR" | "DELTA" | "DROID";
export const DEFAULT_VOICE: DeltaVoice = "MENTOR";
export const VOICES: readonly { id: Exclude<DeltaVoice, "PLAIN">; label: string; hint: string }[] = [
  { id: "MENTOR", label: "MENTOR", hint: "Gruff, short, in your ear." },
  { id: "DELTA", label: "DELTA", hint: "Precise, formal, quietly on your side." },
  { id: "DROID", label: "DROID", hint: "Observation. Query. Statement." },
];

type Vars = { kind?: "WORK" | "OFF"; night?: string; since?: string; hm?: string; n?: number; where?: string };
type Line = Record<DeltaVoice, (v: Vars) => string>;
const same = (text: (v: Vars) => string): Line => ({ PLAIN: text, MENTOR: text, DELTA: text, DROID: text });
const plainKind = (k?: "WORK" | "OFF") => (k === "OFF" ? "a day off" : "a work day");
const mentorKind = (k?: "WORK" | "OFF") => (k === "OFF" ? "a day off" : "a work night");
const droidKind = (k?: "WORK" | "OFF") => (k === "OFF" ? "day-off" : "work-day");

export const DELTA_LINES = {
  // Hard days: plain in every voice.
  MINIMUM: same(() => "Minimum Day is on. Today is about the basics; nothing else is asked of you."),
  STABILIZE: same(() => "Your check-in says today is heavy. The advice is to protect the basics and nothing more."),
  SUSTAINED: same(() => " This has gone on for a few days, so it's worth deliberate attention, not just one bad day."),

  ASK_CHECKIN: {
    PLAIN: () => " Your check-in sets today's advice.",
    MENTOR: () => " Check in and I'll give you the call.",
    DELTA: () => " Your check-in will determine today's guidance.",
    DROID: () => " Query: will you check in? The guidance depends on it.",
  },
  SHORT_FACT: {
    PLAIN: (v) => ` Last night was under your usual for ${plainKind(v.kind)}.`,
    MENTOR: (v) => ` Last night came in short for ${mentorKind(v.kind)}.`,
    DELTA: (v) => ` Last night's sleep was below your usual range for ${plainKind(v.kind)}.`,
    DROID: (v) => ` Observation: last night's sleep fell short of your ${droidKind(v.kind)} norm.`,
  },
  SHORT_FACT_RECOVERY: {
    PLAIN: () => " Your sleep after the last shift was under your usual.",
    MENTOR: () => " Your sleep after the last shift came in short.",
    DELTA: () => " Your sleep after the final shift was below your usual range.",
    DROID: () => " Observation: post-shift sleep fell short of your norm.",
  },
  SLEEP_ERROR: {
    PLAIN: () => "I can't see last night's sleep, so I'm not reading anything into today.",
    MENTOR: () => "Can't see last night's sleep. I'm not guessing.",
    DELTA: () => "Last night's sleep record is unreadable. I will not speculate.",
    DROID: () => "Statement: last night's sleep record is unreadable. I decline to guess.",
  },
  SLEEP_NONE: {
    PLAIN: (v) => `No main sleep is recorded ${v.since}, so I can't say how rested you are.`,
    MENTOR: (v) => `No sleep on record ${v.since}, so I can't tell you how rested you are.`,
    DELTA: (v) => `No main sleep is recorded ${v.since}. I cannot assess how rested you are.`,
    DROID: (v) => `Observation: no sleep on record ${v.since}. Your restedness is unknown to me.`,
  },
  DRAFT_RECOVER: {
    PLAIN: (v) => `Two short sleeps${v.night}. Your check-in sets today's advice; until you answer, the draft below is the cautious read.`,
    MENTOR: (v) => `Two short sleeps${v.night}. Check in. Until then, we play it careful.`,
    DELTA: (v) => `Two consecutive short sleeps${v.night}. Until you check in, I'm treating today conservatively.`,
    DROID: (v) => `Observation: two short sleeps${v.night}. Query: will you check in, or shall I keep assuming caution?`,
  },
  DRAFT_POST_SHIFT: {
    PLAIN: () => "Last shift isn't shifted down from yet, so that's the draft below.",
    MENTOR: () => "You haven't shifted down from the last shift. That's the draft below.",
    DELTA: () => "The last shift has not been shifted down from. The draft below reflects that.",
    DROID: () => "Statement: you have not shifted down from the last shift. Hence the draft below.",
  },
  RECOVERY: {
    PLAIN: () => "The first day off after the run; sleep usually comes first.",
    MENTOR: () => "Run's over. Sleep usually comes first.",
    DELTA: () => "The run is complete. Sleep usually comes first on this day.",
    DROID: () => "Observation: the run is over. Sleep traditionally comes first.",
  },
  OFF_NONE: {
    PLAIN: () => "Nothing is due today. The day is open.",
    MENTOR: () => "Nothing's due. The day is yours.",
    DELTA: () => "No obligations are due today. The day is unallocated, which is acceptable.",
    DROID: () => "Observation: nothing is due. The day is yours to spend as you see fit. I will not object.",
  },
  OFF_ONE: {
    PLAIN: () => "One thing is due today; the rest of the day is open.",
    MENTOR: () => "One thing due today. The rest is yours.",
    DELTA: () => "One obligation is due today. The remainder is unallocated.",
    DROID: () => "Observation: one thing is due. The rest of the day is yours.",
  },
  OFF_MANY: {
    PLAIN: (v) => `${v.n} things are due today; the rest of the day is open.`,
    MENTOR: (v) => `${v.n} things due today. The rest is yours.`,
    DELTA: (v) => `${v.n} obligations are due today. The remainder is unallocated.`,
    DROID: (v) => `Observation: ${v.n} things are due. The rest of the day is yours.`,
  },
  FLIP: {
    PLAIN: () => "Your last day off before the run; you're back on shift tomorrow.",
    MENTOR: () => "Last day off. You're back on tomorrow.",
    DELTA: () => "This is your last day off before the run. You return to shift tomorrow.",
    DROID: () => "Statement: last day off before the run. Tomorrow, you return to duty.",
  },
  SLEEP_LEARNING: {
    PLAIN: (v) => `Slept ${v.hm}. BEYOND is still learning your usual, so there's no comparison yet.`,
    MENTOR: (v) => `Slept ${v.hm}. Still learning your normal, so no comparison yet.`,
    DELTA: (v) => `You slept ${v.hm}. I don't yet have enough history for a comparison.`,
    DROID: (v) => `Observation: ${v.hm} of sleep. Insufficient data for comparison. I am still learning you.`,
  },
  SLEEP_UNDER: {
    PLAIN: (v) => `Last night was under your usual for ${plainKind(v.kind)}.`,
    MENTOR: (v) => `Last night came in short for ${mentorKind(v.kind)}.`,
    DELTA: (v) => `Last night's sleep was below your usual range for ${plainKind(v.kind)}.`,
    DROID: (v) => `Observation: last night's sleep fell short of your ${droidKind(v.kind)} norm.`,
  },
  SLEEP_IN: {
    PLAIN: (v) => `Sleep is in your usual range for ${plainKind(v.kind)}.`,
    MENTOR: () => "Sleep's in your normal range.",
    DELTA: (v) => `Sleep was within your usual range for ${plainKind(v.kind)}.`,
    DROID: () => "Observation: sleep within normal parameters.",
  },
  EXEC_SHORT: {
    PLAIN: () => "You feel up for it. The last two sleeps were short, so the session is scaled down rather than skipped.",
    MENTOR: () => "You're up for it, but the last two sleeps were short. Session's cut down, not cancelled.",
    DELTA: () => "Your check-in says ready. Your sleep record disagrees. The reduced session is the logical compromise.",
    DROID: () => "Statement: you report readiness. Contradiction: your sleep log. Resolution: the session is reduced, not cancelled.",
  },
  EXEC_OK: {
    PLAIN: () => "You feel up for it, and there's planned work. The advice is to do it.",
    MENTOR: () => "You're up for it, and there's planned work. Go do it.",
    DELTA: () => "Your check-in supports the planned work. The guidance is to proceed.",
    DROID: () => "Statement: you are ready and work is planned. Proceed.",
  },
  NO_ACTION: {
    PLAIN: (v) => `Nothing in your records asks for more than the basics ${v.where}.`,
    MENTOR: (v) => `Nothing on record needs more than the basics ${v.where}.`,
    DELTA: (v) => `Nothing in your records requires more than the basics ${v.where}.`,
    DROID: (v) => `Observation: nothing requires more than the basics ${v.where}. I find this acceptable.`,
  },
  ENGINE_RECOVER: {
    PLAIN: () => "Your check-in points to recovery, so the advice is a lighter evening.",
    MENTOR: () => "Your check-in says recover. Keep tonight light.",
    DELTA: () => "Your check-in indicates recovery. The guidance is a lighter evening.",
    DROID: () => "Statement: your check-in indicates recovery. A lighter evening is advised.",
  },
  ENGINE_POST_SHIFT: {
    PLAIN: () => "Last shift isn't shifted down from yet. That comes before anything new.",
    MENTOR: () => "You haven't shifted down from the last shift. Do that before anything new.",
    DELTA: () => "The last shift has not been shifted down from. That precedes anything new.",
    DROID: () => "Statement: shift down first. Everything else can wait.",
  },
  ENGINE_OBLIGATION: {
    PLAIN: () => "Something you committed to is due. The advice puts it first.",
    MENTOR: () => "Something you committed to is due. It comes first.",
    DELTA: () => "A commitment is due. The guidance places it first.",
    DROID: () => "Observation: a commitment is due. It takes priority.",
  },
} satisfies Record<string, Line>;

export type DeltaLineKey = keyof typeof DELTA_LINES;
/** Renders one line in a voice. */
export const say = (voice: DeltaVoice, key: DeltaLineKey, vars: Vars = {}): string => DELTA_LINES[key][voice](vars);
