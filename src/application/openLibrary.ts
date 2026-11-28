import { EXERCISE_LIBRARY } from "../domain/workout/exerciseLibrary";
import {
  mapOpenExercises, OPEN_REP_HIGH, OPEN_REP_LOW, visibleOpenExercises, type OpenExercise, type OpenExerciseFile,
} from "../domain/workout/openLibrary";
import { WORKOUT_TEMPLATES } from "../domain/workout/types";
import type { CustomExercise } from "../domain/workout/customExercise";
import { createCustomExercise } from "./exerciseLibraryCommands";
import { getCustomExercises } from "./exerciseLibraryQueries";

/**
 * GRAYSON-OPEN-LIBRARY-001: the open exercise library, loaded only when he searches the library or the routine picker
 * (a dynamic import, so Vite puts the file in its own chunk and the first screen doesn't grow; the service worker
 * precaches that chunk with the other scripts, so it works offline once loaded).
 *
 * His choices (hidden exercises, show stretches) live in one setting that travels with backups.
 */
let loaded: Promise<OpenExercise[]> | null = null;

/** Every open exercise, mapped. Loads the bundled file once. */
export function getOpenLibrary(): Promise<OpenExercise[]> {
  loaded ??= import("../data/openExercises.json").then((mod) => mapOpenExercises((mod.default ?? mod) as unknown as OpenExerciseFile))
    .catch((error) => { loaded = null; throw error; });
  return loaded;
}

/** The pinned source, for the library screen's credit line. */
export async function getOpenLibrarySource(): Promise<{ commit: string; licence: string; source: string }> {
  const mod = await import("../data/openExercises.json");
  const file = (mod.default ?? mod) as unknown as OpenExerciseFile;
  return { commit: file.commit, licence: file.licence, source: file.source };
}

export async function getOpenExercise(id: string): Promise<OpenExercise | undefined> {
  return (await getOpenLibrary()).find((ex) => ex.id === id);
}

export const OPEN_LIBRARY_KEY = "beyond.openLibrary.v1";
export interface OpenLibraryPrefs { hidden: string[]; showStretches: boolean }

export function getOpenLibraryPrefs(): OpenLibraryPrefs {
  try {
    const raw = JSON.parse(localStorage.getItem(OPEN_LIBRARY_KEY) ?? "null") as Partial<OpenLibraryPrefs> | null;
    return {
      hidden: Array.isArray(raw?.hidden) ? raw.hidden.filter((id): id is string => typeof id === "string") : [],
      showStretches: raw?.showStretches === true,
    };
  } catch { return { hidden: [], showStretches: false }; }
}

function savePrefs(prefs: OpenLibraryPrefs): void {
  try { localStorage.setItem(OPEN_LIBRARY_KEY, JSON.stringify({ hidden: [...new Set(prefs.hidden)], showStretches: prefs.showStretches })); }
  catch { /* Storage may be unavailable: nothing is hidden. */ }
}

/** HIDE: gone from every search until he shows hidden ones again. */
export function hideOpenExercise(id: string): void {
  const prefs = getOpenLibraryPrefs();
  savePrefs({ ...prefs, hidden: [...prefs.hidden, id] });
}

/** Brings back every open exercise he hid. */
export function showHiddenOpenExercises(): void { savePrefs({ ...getOpenLibraryPrefs(), hidden: [] }); }

export function setShowStretches(show: boolean): void { savePrefs({ ...getOpenLibraryPrefs(), showStretches: show }); }

/** The names that win over an open exercise of the same name: his 55, A, B and C, and his own exercises. */
async function ownNames(): Promise<string[]> {
  const mine = await getCustomExercises({ includeArchived: true });
  return [
    ...EXERCISE_LIBRARY.map((ex) => ex.name),
    ...Object.values(WORKOUT_TEMPLATES).flatMap((t) => t.exercises.map((ex) => ex.name)),
    ...mine.map((ex) => ex.name),
  ];
}

/** What search can show now: his choices applied, his own names first. */
export async function getVisibleOpenExercises(): Promise<OpenExercise[]> {
  const [all, names] = await Promise.all([getOpenLibrary(), ownNames()]);
  const prefs = getOpenLibraryPrefs();
  return visibleOpenExercises(all, { hidden: new Set(prefs.hidden), showStretches: prefs.showStretches, ownNames: names });
}

/**
 * EDIT: copies an open exercise into his own exercises (8–12 reps, the open steps as its note), which he can then
 * change freely, and hides the original.
 */
export async function copyOpenExerciseToMine(id: string): Promise<CustomExercise> {
  const ex = await getOpenExercise(id);
  if (!ex) throw new Error("OPEN_EXERCISE_NOT_FOUND: That exercise isn't in the open set.");
  const mine = await createCustomExercise({
    name: ex.name, muscleGroup: ex.muscleGroup, equipment: ex.equipment, repRangeLow: OPEN_REP_LOW, repRangeHigh: OPEN_REP_HIGH,
    ...(ex.steps.length ? { notes: ex.steps.join("\n") } : {}), libraryExerciseId: ex.id,
  });
  hideOpenExercise(id);
  return mine;
}
