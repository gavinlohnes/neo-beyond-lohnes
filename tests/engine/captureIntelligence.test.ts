import { describe, expect, it } from "vitest";
import { suggestCaptureDueDate } from "../../src/engine/captureIntelligence";

/**
 * Capture Intelligence layer (2026-09-02) — pure unit tests for the
 * deterministic confidence/abstention gate, no Dexie, no fake-indexeddb,
 * matching every other engine/* test file's zero-I/O contract. `now` is
 * always passed explicitly, matching engine.md's "same inputs -> same
 * output, always" rule.
 */

const NOW = new Date("2026-09-02T09:00:00");

describe("suggestCaptureDueDate — abstention", () => {
  it("returns null when no date-like text is present", () => {
    expect(suggestCaptureDueDate("buy milk", NOW)).toBeNull();
  });

  it("returns null for blank/whitespace-only text", () => {
    expect(suggestCaptureDueDate("   ", NOW)).toBeNull();
  });

  it("returns null when negation is present, even alongside a date mention", () => {
    expect(suggestCaptureDueDate("do not need this by next week", NOW)).toBeNull();
    expect(suggestCaptureDueDate("don't forget dentist friday", NOW)).toBeNull();
  });

  it("returns null when multiple conflicting date candidates are found", () => {
    expect(suggestCaptureDueDate("call mom friday or maybe next tuesday", NOW)).toBeNull();
  });
});

describe("suggestCaptureDueDate — STRONG confidence", () => {
  it("resolves an explicit weekday to that date", () => {
    const result = suggestCaptureDueDate("renew car registration by friday", NOW);
    expect(result).not.toBeNull();
    expect(result?.dueAt).toBe("2026-09-04");
    expect(result?.confidence).toBe("STRONG");
    expect(result?.matchedText).toBe("friday");
  });

  it("resolves a relative day expression like 'tomorrow'", () => {
    const result = suggestCaptureDueDate("call the dentist tomorrow at 3pm", NOW);
    expect(result).not.toBeNull();
    expect(result?.dueAt).toBe("2026-09-03");
    expect(result?.confidence).toBe("STRONG");
  });

  it("resolves an explicit calendar date", () => {
    const result = suggestCaptureDueDate("meeting sept 10", NOW);
    expect(result).not.toBeNull();
    expect(result?.dueAt).toBe("2026-09-10");
    expect(result?.confidence).toBe("STRONG");
  });
});

describe("suggestCaptureDueDate — WEAK confidence", () => {
  it("surfaces a bare time-of-day with no identifiable day as WEAK", () => {
    const result = suggestCaptureDueDate("meeting at 3", NOW);
    expect(result).not.toBeNull();
    expect(result?.confidence).toBe("WEAK");
  });

  it("surfaces a vague window like 'this week' as WEAK", () => {
    const result = suggestCaptureDueDate("this week finish report", NOW);
    expect(result).not.toBeNull();
    expect(result?.confidence).toBe("WEAK");
  });
});
