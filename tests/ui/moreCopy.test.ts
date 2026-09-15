import { describe, expect, it } from "vitest";
import { formatReminderHour } from "../../src/ui/screens/more/moreCopy";

describe("formatReminderHour", () => {
  it("formats midnight as 12:00 AM", () => {
    expect(formatReminderHour(0)).toBe("12:00 AM");
  });

  it("formats noon as 12:00 PM", () => {
    expect(formatReminderHour(12)).toBe("12:00 PM");
  });

  it("formats a morning hour", () => {
    expect(formatReminderHour(9)).toBe("9:00 AM");
  });

  it("formats an evening hour", () => {
    expect(formatReminderHour(20)).toBe("8:00 PM");
  });

  it("formats the last hour of the day", () => {
    expect(formatReminderHour(23)).toBe("11:00 PM");
  });
});
