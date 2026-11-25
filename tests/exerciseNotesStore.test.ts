import { afterEach, describe, expect, it } from "vitest";
import { createCustomExercise } from "../src/application/exerciseLibraryCommands";
import { getCustomExercises } from "../src/application/exerciseLibraryQueries";
import { applySettingsBlock, parseSettingsBlock, readTravellingSettings, TRAVELLING_SETTINGS } from "../src/persistence/settingsTransfer";
import {
  clearExerciseNote, EXERCISE_NOTE_MAX, EXERCISE_NOTES_KEY, noteFor, noteKeyFor, readExerciseNote, saveNote, writeExerciseNote,
} from "../src/ui/screens/train/exerciseNotesStore";

/** GRAYSON-TRAIN-NOTES-001: one note per exercise, shared by a built-in and its library entry; his own exercises keep theirs. */
afterEach(() => { localStorage.clear(); });

describe("GRAYSON-TRAIN-NOTES-001 exercise notes", () => {
  it("a note on the library id shows for the built-in template id, and the other way round", () => {
    writeExerciseNote("lib-machine-chest-press", "Seat 4, handles at chest height");
    expect(readExerciseNote("machine-chest-press")).toBe("Seat 4, handles at chest height");
    writeExerciseNote("leg-press", "  Feet high and wide ");
    expect(readExerciseNote("lib-leg-press")).toBe("Feet high and wide");
    expect(noteKeyFor("leg-press")).toBe("lib-leg-press");
    expect(Object.keys(JSON.parse(localStorage.getItem(EXERCISE_NOTES_KEY)!))).toEqual(["lib-machine-chest-press", "lib-leg-press"]);
    expect(readExerciseNote("lib-pec-deck")).toBeNull();
  });

  it("his own exercise reads and writes its own notes field, never the shared key", async () => {
    const own = await createCustomExercise({ name: "Hammer Strength Row", muscleGroup: "Back", equipment: "Machine", repRangeLow: 8, repRangeHigh: 12 });
    await saveNote(own.id, "Chest pad on 3");
    const customs = await getCustomExercises();
    expect(customs.find((c) => c.id === own.id)!.notes).toBe("Chest pad on 3");
    expect(noteFor(own.id, customs)).toBe("Chest pad on 3");
    expect(localStorage.getItem(EXERCISE_NOTES_KEY)).toBeNull();
    await saveNote(own.id, "");
    expect(noteFor(own.id, await getCustomExercises())).toBeNull();
  });

  it(`refuses ${EXERCISE_NOTE_MAX + 1} characters; bad stored JSON reads as no note; clear removes the key`, () => {
    expect(() => writeExerciseNote("pec-deck", "x".repeat(EXERCISE_NOTE_MAX + 1))).toThrow(/140 characters/);
    writeExerciseNote("pec-deck", "x".repeat(EXERCISE_NOTE_MAX));
    expect(readExerciseNote("pec-deck")).toHaveLength(EXERCISE_NOTE_MAX);
    localStorage.setItem(EXERCISE_NOTES_KEY, "{not json");
    expect(readExerciseNote("pec-deck")).toBeNull();
    localStorage.setItem(EXERCISE_NOTES_KEY, JSON.stringify({ "lib-pec-deck": { text: "y".repeat(200), updatedAt: "x" }, "lib-leg-curl": { text: "Pad above heels", updatedAt: "2026-11-24T14:00:00.000Z" }, "lib-leg-press": 7 }));
    expect(readExerciseNote("pec-deck")).toBeNull();
    expect(readExerciseNote("leg-curl")).toBe("Pad above heels");
    clearExerciseNote("leg-curl");
    expect(JSON.parse(localStorage.getItem(EXERCISE_NOTES_KEY)!)).toEqual({});
  });

  it("travels with his settings and native backup as \"Exercise notes\"", () => {
    expect(TRAVELLING_SETTINGS[EXERCISE_NOTES_KEY]).toBe("Exercise notes");
    writeExerciseNote("lat-pulldown", "Thigh pad snug", new Date("2026-11-24T14:00:00Z"));
    const block = parseSettingsBlock(JSON.parse(JSON.stringify(readTravellingSettings())));
    localStorage.clear();
    expect(readExerciseNote("lat-pulldown")).toBeNull();
    applySettingsBlock(block);
    expect(readExerciseNote("lib-lat-pulldown")).toBe("Thigh pad snug");
  });
});
