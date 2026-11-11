import { afterEach, expect, it } from "vitest";
import { clearNoteDraft, readNoteDraft, writeNoteDraft } from "../../src/ui/dailyNoteDraft";

/** Review of #479/#480: one key per day holds the draft and the stored text it began from. */
afterEach(() => sessionStorage.clear());

it("reads an older plain-text draft without a base, and round-trips a draft with its base", () => {
  sessionStorage.setItem("beyond.daily-note.draft.d1", "old plain draft");
  expect(readNoteDraft("d1")).toEqual({ draft: "old plain draft", base: undefined });
  writeNoteDraft("d1", "new draft", "saved text");
  expect(sessionStorage.length).toBe(1);
  expect(readNoteDraft("d1")).toEqual({ draft: "new draft", base: "saved text" });
  // A draft that happens to be JSON-looking text but not our shape stays plain text.
  sessionStorage.setItem("beyond.daily-note.draft.d2", "[1,2]");
  expect(readNoteDraft("d2")).toEqual({ draft: "[1,2]", base: undefined });
  clearNoteDraft("d1");
  expect(readNoteDraft("d1")).toBeNull();
});
