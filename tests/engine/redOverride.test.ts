import { describe, expect, it } from "vitest";
import { assertRedOverrideConfirmed, requiresRedOverrideConfirm } from "../../src/engine/redOverride";

/**
 * Context & Safety Decisions (2026-08-19, locked): "RED-capacity override
 * requires an explicit confirm step EVERY TIME, one shared mechanism
 * app-wide." No consuming command exists yet in this checkpoint — TRAIN
 * (a later checkpoint) is the first real override point — so this tests
 * the shared primitive itself: the decision function and the enforcement
 * function every future override command must call.
 */

describe("requiresRedOverrideConfirm", () => {
  it("is true only for RED", () => {
    expect(requiresRedOverrideConfirm("RED")).toBe(true);
  });

  it("is false for YELLOW, GREEN, and no check-in yet", () => {
    expect(requiresRedOverrideConfirm("YELLOW")).toBe(false);
    expect(requiresRedOverrideConfirm("GREEN")).toBe(false);
    expect(requiresRedOverrideConfirm(null)).toBe(false);
  });
});

describe("assertRedOverrideConfirmed", () => {
  it("throws when capacity is RED and not confirmed", () => {
    expect(() => assertRedOverrideConfirmed("RED", false)).toThrow(/RED_OVERRIDE_NOT_CONFIRMED/);
  });

  it("does not throw when capacity is RED and explicitly confirmed", () => {
    expect(() => assertRedOverrideConfirmed("RED", true)).not.toThrow();
  });

  it("never requires confirmation outside RED, regardless of the confirmed flag", () => {
    expect(() => assertRedOverrideConfirmed("YELLOW", false)).not.toThrow();
    expect(() => assertRedOverrideConfirmed("GREEN", false)).not.toThrow();
    expect(() => assertRedOverrideConfirmed(null, false)).not.toThrow();
  });

  it("has no bypass: confirming once does not change the outcome of a later unconfirmed call", () => {
    // Every call carries its own confirmed flag — there is no persisted
    // "don't ask again" state to accidentally rely on.
    expect(() => assertRedOverrideConfirmed("RED", true)).not.toThrow();
    expect(() => assertRedOverrideConfirmed("RED", false)).toThrow(/RED_OVERRIDE_NOT_CONFIRMED/);
  });
});
