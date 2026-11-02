import { expect, it } from "vitest";
import { ALFRED_PROMPTS, placeholderFor } from "../src/ui/components/AlfredSheet";

/** ALFRED-VOICE-001: the message box speaks in Alfred's voice, one line per lived day. */
it("keeps one line through a lived day and changes at 16:30", () => {
  const evening = placeholderFor(new Date(2026, 10, 2, 17, 0));
  expect(ALFRED_PROMPTS).toContain(evening);
  expect(placeholderFor(new Date(2026, 10, 3, 4, 0))).toBe(evening); // same night shift
  expect(placeholderFor(new Date(2026, 10, 3, 16, 29))).toBe(evening);
  expect(placeholderFor(new Date(2026, 10, 3, 16, 31))).not.toBe(evening);
  expect(ALFRED_PROMPTS.join(" ")).not.toMatch(/McGriddle|CPAP/);
});
