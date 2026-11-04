import { expect, it } from "vitest";
import { routineDraftKeys, validRoutineMinutes, withDraftMinutes } from "../../src/ui/components/routineDraft";

it("keeps estimate edits with stable ids across reorder and separates duplicate new words", () => {
  const a = { id: "a", text: "Synthetic A", minutes: 2 }, b = { id: "b", text: "Synthetic B" };
  expect(withDraftMinutes([b, a], { a: "5" })).toEqual([b, { ...a, minutes: 5 }]);
  expect(withDraftMinutes([a], { a: "" })).toEqual([{ id: "a", text: "Synthetic A" }]);
  const keys = routineDraftKeys([{ text: "Synthetic duplicate" }, { text: "Synthetic duplicate" }]);
  expect(new Set(keys).size).toBe(2);
  expect(withDraftMinutes([{ text: "Synthetic duplicate" }, { text: "Synthetic duplicate" }], { [keys[1]!]: "3" })).toEqual([{ text: "Synthetic duplicate" }, { text: "Synthetic duplicate", minutes: 3 }]);
  expect(validRoutineMinutes([{ minutes: 0 }])).toBe(false);
  expect(validRoutineMinutes([{ minutes: 1.5 }])).toBe(false);
  expect(validRoutineMinutes([{ minutes: 240 }, {}])).toBe(true);
});
