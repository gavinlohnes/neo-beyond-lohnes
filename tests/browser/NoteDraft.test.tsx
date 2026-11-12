import { afterEach, beforeEach, expect, it } from "vitest";
import { clearNoteDraft, readNoteDraft, writeNoteDraft } from "../../src/ui/dailyNoteDraft";

/** Review of #479/#480: one key per day holds the draft and the stored text it began from. */
beforeEach(() => sessionStorage.clear());
afterEach(() => sessionStorage.clear());
// Other files share this browser's session storage, so count only this helper's keys.
const draftKeys = () => Object.keys(sessionStorage).filter((k) => k.startsWith("beyond.daily-note.draft."));

it("reads an older plain-text draft without a base, and round-trips a draft with its base", () => {
  sessionStorage.setItem("beyond.daily-note.draft.d1", "old plain draft");
  expect(readNoteDraft("d1")).toEqual({ draft: "old plain draft", base: undefined });
  writeNoteDraft("d1", "new draft", "saved text");
  expect(draftKeys()).toEqual(["beyond.daily-note.draft.d1"]);
  expect(readNoteDraft("d1")).toEqual({ draft: "new draft", base: "saved text" });
  // A draft that happens to be JSON-looking text but not our shape stays plain text.
  sessionStorage.setItem("beyond.daily-note.draft.d2", "[1,2]");
  expect(readNoteDraft("d2")).toEqual({ draft: "[1,2]", base: undefined });
  clearNoteDraft("d1");
  expect(readNoteDraft("d1")).toBeNull();
});
