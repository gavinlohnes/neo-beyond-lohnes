import { describe, expect, it } from "vitest";
import { formatReminderHour } from "../../src/ui/screens/more/moreCopy";

describe("formatReminderHour", () => {
  it("formats midnight as 00:00", () => {
    expect(formatReminderHour(0)).toBe("00:00");
  });

  it("formats noon as 12:00", () => {
    expect(formatReminderHour(12)).toBe("12:00");
  });

  it("formats a morning hour", () => {
    expect(formatReminderHour(9)).toBe("09:00");
  });

  it("formats an evening hour", () => {
    expect(formatReminderHour(20)).toBe("20:00");
  });

  it("formats the last hour of the day", () => {
    expect(formatReminderHour(23)).toBe("23:00");
  });
});
