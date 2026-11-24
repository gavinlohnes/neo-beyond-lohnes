import { ACE_LIBRARY_PREFIX, howToFor, type HowTo } from "../../../domain/workout/exerciseHowTo";

/**
 * GRAYSON-TRAIN-HOWTO-001: his own edits to an exercise's how-to, on this device (closeStore.ts's pattern). Only his
 * changes are stored, keyed by exercise id; his version wins over the bundled text; RESET deletes his entry. Travels
 * with the backup as "Exercise how-to edits". The role line and the alternative aren't editable yet.
 */
const KEY = "beyond.exerciseHowTo.v1";

export interface HowToEdit {
  setup?: string;
  cues?: string[];
  mistakes?: string[];
  /** "" clears the link; undefined keeps the bundled one. */
  videoUrl?: string;
}

function readAll(): Record<string, HowToEdit> {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null") as unknown;
    return raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, HowToEdit>) : {};
  } catch { return {}; }
}
const strings = (v: unknown, max: number) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim() !== "").slice(0, max) : undefined);

export function readHowToEdit(exerciseId: string): HowToEdit | null {
  const raw = readAll()[exerciseId];
  if (!raw || typeof raw !== "object") return null;
  const edit: HowToEdit = {};
  if (typeof raw.setup === "string" && raw.setup.trim()) edit.setup = raw.setup;
  const cues = strings(raw.cues, 3);
  if (cues?.length) edit.cues = cues;
  const mistakes = strings(raw.mistakes, 2);
  if (mistakes?.length) edit.mistakes = mistakes;
  if (raw.videoUrl === "" || isHttpsUrl(raw.videoUrl)) edit.videoUrl = raw.videoUrl as string;
  return Object.keys(edit).length ? edit : null;
}

export function isHttpsUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try { return new URL(value).protocol === "https:"; } catch { return false; }
}

/** The guide as he sees it: the bundled one with his edits on top. Null when no guide exists. */
export function effectiveHowTo(exerciseId: string): (HowTo & { edited: boolean; bundledVideo: boolean }) | null {
  const bundled = howToFor(exerciseId);
  if (!bundled) return null;
  const edit = readHowToEdit(exerciseId);
  const videoUrl = edit?.videoUrl !== undefined ? edit.videoUrl : bundled.videoUrl;
  const { videoUrl: _bundled, ...rest } = bundled;
  return {
    ...rest,
    ...(edit?.setup ? { setup: edit.setup } : {}),
    ...(edit?.cues ? { cues: edit.cues } : {}),
    ...(edit?.mistakes ? { mistakes: edit.mistakes } : {}),
    ...(videoUrl ? { videoUrl } : {}),
    edited: edit !== null,
    bundledVideo: Boolean(videoUrl && videoUrl === bundled.videoUrl && videoUrl.startsWith(ACE_LIBRARY_PREFIX)),
  };
}

/** Saves his version (only what differs from the bundled guide). Returns false if storage refused. */
export function writeHowToEdit(exerciseId: string, edit: HowToEdit): boolean {
  const bundled = howToFor(exerciseId);
  if (!bundled) return false;
  const diff: HowToEdit = {};
  if (edit.setup !== undefined && edit.setup.trim() && edit.setup.trim() !== bundled.setup) diff.setup = edit.setup.trim();
  const cues = edit.cues?.map((c) => c.trim()).filter(Boolean);
  if (cues && cues.length && JSON.stringify(cues) !== JSON.stringify(bundled.cues)) diff.cues = cues.slice(0, 3);
  const mistakes = edit.mistakes?.map((c) => c.trim()).filter(Boolean);
  if (mistakes && mistakes.length && JSON.stringify(mistakes) !== JSON.stringify(bundled.mistakes)) diff.mistakes = mistakes.slice(0, 2);
  if (edit.videoUrl !== undefined && edit.videoUrl.trim() !== (bundled.videoUrl ?? "")) diff.videoUrl = edit.videoUrl.trim();
  const all = readAll();
  if (Object.keys(diff).length) all[exerciseId] = diff; else delete all[exerciseId];
  try { localStorage.setItem(KEY, JSON.stringify(all)); return true; } catch { return false; }
}

export function resetHowTo(exerciseId: string): boolean {
  const all = readAll();
  delete all[exerciseId];
  try { localStorage.setItem(KEY, JSON.stringify(all)); return true; } catch { return false; }
}
