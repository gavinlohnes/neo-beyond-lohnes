import type { PerformedSet } from "../domain/workout/types";
import type { WorkoutSession } from "../domain/common/types";
import { getActiveWorkoutSession, getPerformedSets } from "./trainQueries";
import { logSet, skipSet, startRest } from "./trainCommands";
import { restSecondsFor } from "./restMemory";

/**
 * GRAYSON-TRAIN-LOCKSCREEN-001 (Gavin, 2026-11-24): the current set on the lock screen, with DONE and SKIP.
 *
 * BEYOND's own service worker (public/lockscreen-sw.js) shows the notification from the plan built here, and parks
 * each DONE or SKIP tap in Cache Storage. When BEYOND next runs it applies the parked taps in tap order through the
 * one logSet / skipSet command, with the tap's time and a "from lock screen" mark (Gavin, 08:50 CT: "Extend
 * options"), so the lock screen never has its own way of writing a set. Nothing leaves the phone.
 */

export const LOCKSCREEN_CACHE = "beyond-lockscreen";
export const LOCKSCREEN_TAP_PREFIX = "lockscreen-tap-";
/** A workout older than this with no taps closes the notification. */
export const LOCKSCREEN_STALE_MS = 4 * 60 * 60 * 1000;

export interface LockScreenSet {
  exerciseId: string;
  name: string;
  /** What the LOG button would pass for a swapped machine. */
  substitutedName?: string;
  setNumber: number;
  total: number;
  weight: number;
  reps: number;
}

/** What the worker shows: every planned working set not yet recorded, in order, and the rest it would start. */
export interface LockScreenPlan {
  v: 1;
  sessionId: string;
  startedAt: string;
  /** BEYOND's own address, opened by a tap on the notification body. */
  home: string;
  showSkip: boolean;
  sets: LockScreenSet[];
  /** The rest running now, if any (a clock time is shown; a web notification can't count down). */
  restEndsAt?: string;
  /** Rest after DONE for each exercise, the length the app would use. */
  restSeconds: Record<string, number>;
}

/** One planned set, as the LOG button would save it now. */
export interface PlannedSet { exerciseId: string; name: string; substitutedName?: string; setNumber: number; total: number; weight: number; reps: number; /** GRAYSON-ROUTINE-EDIT-001: the routine's rest for this exercise, when set. */ restSeconds?: number }

/** Pure apart from the rest lookup: the snapshot for the worker, leaving out sets already recorded (logged or skipped). */
export function buildLockScreenPlan(input: {
  session: Pick<WorkoutSession, "id" | "startedAt" | "activeRestEndsAt">;
  planned: readonly PlannedSet[];
  recorded: readonly Pick<PerformedSet, "exerciseId" | "setNumber" | "setKind">[];
  home: string;
  showSkip: boolean;
  now?: number;
  restFor?: (exerciseId: string) => number;
}): LockScreenPlan {
  const done = new Set(input.recorded.filter((s) => s.setKind !== "WARMUP" && s.setKind !== "DROP").map((s) => `${s.exerciseId}#${s.setNumber}`));
  // A set with no reps yet (nothing to repeat) stays in the plan; the notification asks for it in BEYOND, no DONE.
  const sets = input.planned.filter((p) => !done.has(`${p.exerciseId}#${p.setNumber}`));
  const restFor = input.restFor ?? restSecondsFor;
  const restSeconds: Record<string, number> = {};
  for (const s of sets) restSeconds[s.exerciseId] ??= s.restSeconds ?? restFor(s.exerciseId);
  const now = input.now ?? Date.now();
  const rest = input.session.activeRestEndsAt;
  return {
    v: 1, sessionId: input.session.id, startedAt: input.session.startedAt, home: input.home, showSkip: input.showSkip,
    sets: sets.map((s) => ({
      exerciseId: s.exerciseId, name: s.name, setNumber: s.setNumber, total: s.total, weight: s.weight, reps: s.reps,
      ...(s.substitutedName ? { substitutedName: s.substitutedName } : {}),
    })),
    ...(rest && Date.parse(rest) > now ? { restEndsAt: rest } : {}),
    restSeconds,
  };
}

/** A DONE or SKIP the worker parked: what the notification showed, and when he tapped. */
export interface ParkedTap {
  key: string;
  sessionId: string;
  exerciseId: string;
  setNumber: number;
  weight: number;
  reps: number;
  substitutedName?: string;
  kind: "DONE" | "SKIP";
  tappedAt: string;
}

export interface LockScreenInbox {
  list(): Promise<ParkedTap[]>;
  remove(key: string): Promise<void>;
}

function isTap(v: unknown): v is Omit<ParkedTap, "key"> {
  const t = v as Partial<ParkedTap> | null;
  return !!t && typeof t.sessionId === "string" && typeof t.exerciseId === "string" && Number.isInteger(t.setNumber)
    && typeof t.weight === "number" && typeof t.reps === "number" && (t.kind === "DONE" || t.kind === "SKIP")
    && typeof t.tappedAt === "string" && Number.isFinite(Date.parse(t.tappedAt));
}

/** The worker's parking place in Cache Storage: one entry per tap, so a tap parked while others apply is never lost. */
export const cacheInbox: LockScreenInbox = {
  async list() {
    if (typeof caches === "undefined") return [];
    const cache = await caches.open(LOCKSCREEN_CACHE);
    const taps: ParkedTap[] = [];
    for (const request of await cache.keys()) {
      if (!new URL(request.url).pathname.split("/").pop()!.startsWith(LOCKSCREEN_TAP_PREFIX)) continue;
      try {
        const body = await (await cache.match(request))?.json();
        if (isTap(body)) taps.push({ ...body, key: request.url });
        else await cache.delete(request);
      } catch { await cache.delete(request); }
    }
    return taps;
  },
  async remove(key) {
    if (typeof caches === "undefined") return;
    await (await caches.open(LOCKSCREEN_CACHE)).delete(key);
  },
};

/** A refusal that will never succeed on retry: the tap is dropped, never logged. */
const FINAL = /^(WORKOUT_NOT_ACTIVE|SET_ALREADY_RECORDED|SET_REPS_REQUIRED|SET_WEIGHT_INVALID|SET_NUMBER_INVALID|SET_TIME_INVALID|SET_TIME_OUTSIDE_WORKOUT|LOCKSCREEN_OTHER_SESSION)/;

export interface AppliedTaps { applied: number; dropped: number }

/**
 * Applies every parked tap in tap order through logSet / skipSet, then clears it. A tap for a finished or another
 * session, or for a set already recorded (a double tap), is dropped and cleared. After a DONE the rest starts from
 * the tap, at the length the app would use. A tap that fails for any other reason stays parked for the next try.
 */
export async function applyParkedTaps(inbox: LockScreenInbox = cacheInbox): Promise<AppliedTaps> {
  const taps = (await inbox.list()).sort((a, b) => a.tappedAt.localeCompare(b.tappedAt) || a.key.localeCompare(b.key));
  if (!taps.length) return { applied: 0, dropped: 0 };
  let applied = 0, dropped = 0;
  let lastDone: ParkedTap | null = null;
  let session = await getActiveWorkoutSession();
  for (const tap of taps) {
    try {
      if (!session || session.id !== tap.sessionId) throw new Error("LOCKSCREEN_OTHER_SESSION");
      if (tap.kind === "DONE") {
        await logSet(session.beyondDayId, session.id, tap.exerciseId, tap.setNumber, tap.weight, tap.reps,
          typeof tap.substitutedName === "string" && tap.substitutedName ? tap.substitutedName.slice(0, 80) : undefined,
          { setKind: "WORKING", at: tap.tappedAt, from: "LOCK_SCREEN" });
        lastDone = tap;
      } else {
        await skipSet(session.beyondDayId, session.id, tap.exerciseId, tap.setNumber, { at: tap.tappedAt, from: "LOCK_SCREEN" });
        lastDone = null;
      }
      applied += 1;
      await inbox.remove(tap.key);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!FINAL.test(message)) continue;
      dropped += 1;
      await inbox.remove(tap.key);
      session = await getActiveWorkoutSession();
    }
  }
  if (lastDone && session) await startRest(session.id, restSecondsFor(lastDone.exerciseId), lastDone.tappedAt);
  return { applied, dropped };
}

/** What a set says when it came from the lock screen. */
export const LOCKSCREEN_SET_NOTE = "from lock screen";

/** The live session's recorded sets, for building the plan. */
export async function getLockScreenInputs(): Promise<{ session: WorkoutSession; recorded: PerformedSet[] } | null> {
  const session = await getActiveWorkoutSession();
  if (!session) return null;
  return { session, recorded: await getPerformedSets(session.id) };
}

/**
 * The LOCK SCREEN switch and the SKIP button, per device: localStorage `beyond.lockScreenSets.v1`, validated on read
 * (anything unreadable is the default: off, SKIP shown), carried in the backup's settings block.
 */
export const LOCKSCREEN_PREFS_KEY = "beyond.lockScreenSets.v1";
export interface LockScreenPrefs { on: boolean; showSkip: boolean }
export const DEFAULT_LOCKSCREEN_PREFS: LockScreenPrefs = { on: false, showSkip: true };

export function readLockScreenPrefs(): LockScreenPrefs {
  try {
    const raw = JSON.parse(localStorage.getItem(LOCKSCREEN_PREFS_KEY) ?? "null") as unknown;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ...DEFAULT_LOCKSCREEN_PREFS };
    const v = raw as Partial<Record<keyof LockScreenPrefs, unknown>>;
    return {
      on: typeof v.on === "boolean" ? v.on : DEFAULT_LOCKSCREEN_PREFS.on,
      showSkip: typeof v.showSkip === "boolean" ? v.showSkip : DEFAULT_LOCKSCREEN_PREFS.showSkip,
    };
  } catch { return { ...DEFAULT_LOCKSCREEN_PREFS }; }
}

export function writeLockScreenPrefs(prefs: LockScreenPrefs): void {
  try { localStorage.setItem(LOCKSCREEN_PREFS_KEY, JSON.stringify({ on: prefs.on, showSkip: prefs.showSkip })); } catch { /* storage blocked */ }
}
