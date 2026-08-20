import { describe, expect, it } from "vitest";
import {
  BODYWEIGHT_PLAUSIBLE_RANGE,
  describeBodyweightLogged,
  describeImplausibleBodyweight,
  describeImplausibleProtein,
  describeImplausibleSleep,
  describeProteinLogged,
  describeSleepLogged,
  describeWaterLogged,
  formatDuration,
  hoursAndMinutesToTotalMinutes,
  isImplausible,
  PROTEIN_PLAUSIBLE_RANGE,
  SLEEP_PRIMARY_PLAUSIBLE_RANGE,
  SLEEP_SUPPLEMENTAL_PLAUSIBLE_RANGE,
  totalMinutesToHoursAndMinutes,
  WATER_QUICK_ADD_OZ,
} from "../../src/ui/screens/body/bodyScreenCopy";

describe("hours/minutes conversion round-trips exactly", () => {
  it("converts hours+minutes to total minutes", () => {
    expect(hoursAndMinutesToTotalMinutes(6, 40)).toBe(400);
    expect(hoursAndMinutesToTotalMinutes(0, 45)).toBe(45);
    expect(hoursAndMinutesToTotalMinutes(8, 0)).toBe(480);
  });

  it("converts total minutes back to hours+minutes", () => {
    expect(totalMinutesToHoursAndMinutes(400)).toEqual({ hours: 6, minutes: 40 });
    expect(totalMinutesToHoursAndMinutes(45)).toEqual({ hours: 0, minutes: 45 });
    expect(totalMinutesToHoursAndMinutes(480)).toEqual({ hours: 8, minutes: 0 });
  });
});

describe("formatDuration — always human-readable, never raw minutes alone", () => {
  it("shows both hours and minutes when both are non-zero", () => {
    expect(formatDuration(400)).toBe("6 hr 40 min");
  });

  it("omits minutes when zero", () => {
    expect(formatDuration(480)).toBe("8 hr");
  });

  it("omits hours when zero", () => {
    expect(formatDuration(45)).toBe("45 min");
  });
});

describe("confirmation copy names the actual value, human-readable", () => {
  it("water", () => {
    expect(describeWaterLogged(12)).toBe("12 oz added.");
  });

  it("sleep — human-readable duration, not raw minutes", () => {
    expect(describeSleepLogged(400)).toBe("Sleep saved as 6 hr 40 min.");
    expect(describeSleepLogged(400)).not.toContain("400");
  });

  it("protein", () => {
    expect(describeProteinLogged(25)).toBe("25 g added.");
  });

  it("bodyweight", () => {
    expect(describeBodyweightLogged(180)).toBe("180 lbs logged.");
  });
});

describe("isImplausible — soft range check, never the value itself rejected", () => {
  it("bodyweight within range is plausible", () => {
    expect(isImplausible(180, BODYWEIGHT_PLAUSIBLE_RANGE)).toBe(false);
  });

  it("bodyweight far outside range is flagged", () => {
    expect(isImplausible(12, BODYWEIGHT_PLAUSIBLE_RANGE)).toBe(true);
    expect(isImplausible(900, BODYWEIGHT_PLAUSIBLE_RANGE)).toBe(true);
  });

  it("protein far outside a single-log range is flagged", () => {
    expect(isImplausible(30, PROTEIN_PLAUSIBLE_RANGE)).toBe(false);
    expect(isImplausible(5000, PROTEIN_PLAUSIBLE_RANGE)).toBe(true);
  });

  it("sleep uses a different plausible range per kind — a nap-length value is normal for SUPPLEMENTAL but not PRIMARY", () => {
    expect(isImplausible(30, SLEEP_SUPPLEMENTAL_PLAUSIBLE_RANGE)).toBe(false);
    expect(isImplausible(30, SLEEP_PRIMARY_PLAUSIBLE_RANGE)).toBe(true);
    expect(isImplausible(420, SLEEP_PRIMARY_PLAUSIBLE_RANGE)).toBe(false);
  });
});

describe("implausible-value copy invites confirmation, never states a hard refusal", () => {
  it("bodyweight", () => {
    const text = describeImplausibleBodyweight(900);
    expect(text).toContain("900");
    expect(text).toContain("log it anyway?");
  });

  it("protein", () => {
    expect(describeImplausibleProtein(5000)).toContain("log it anyway?");
  });

  it("sleep, in human-readable duration form", () => {
    const text = describeImplausibleSleep(30);
    expect(text).toContain("30 min");
    expect(text).toContain("log it anyway?");
  });
});

describe("WATER_QUICK_ADD_OZ", () => {
  it("is a small ascending set of common amounts", () => {
    expect(WATER_QUICK_ADD_OZ).toEqual([8, 12, 16]);
  });
});
