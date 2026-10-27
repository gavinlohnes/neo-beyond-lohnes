import { describe, expect, it } from "vitest";
import { CAPABILITY_GROUPS, findCapabilities, SYSTEM_CAPABILITIES } from "../src/ui/systemCatalog";

describe("capability discovery (COMMAND search)", () => {
  it("offers unique entries in known groups and browses without a query", () => {
    // COMMAND-CENTER-001: the approved 19 plus Note, Urge and COMMAND's own settings; MORE's
    // workspace entry left because COMMAND is where the search lives. SUIT-001 adds SYSTEMS and STEALTH.
    // TONIGHT-001: FOOD LOOKUP left the meal screen for its own COMMAND entry.
    // MEMORY-001 adds one settings destination for confirmed prep/recovery facts.
    expect(SYSTEM_CAPABILITIES).toHaveLength(50);
    expect(new Set(SYSTEM_CAPABILITIES.map((entry) => entry.label)).size).toBe(50);
    for (const entry of SYSTEM_CAPABILITIES) expect(CAPABILITY_GROUPS).toContain(entry.group);
    expect(findCapabilities("  ")).toEqual(SYSTEM_CAPABILITIES);
  });
  it("keeps every destination the SYSTEM dialog reached", () => {
    const labels = SYSTEM_CAPABILITIES.map((entry) => entry.label as string);
    for (const label of ["PLAN TODAY", "TODAY TOOLS", "TRAIN", "DATA", "WATER", "MEAL", "SLEEP", "BODYWEIGHT", "WORKOUT", "MISSIONS & OBLIGATIONS", "WORK SCHEDULE", "EXERCISE LIBRARY", "CUSTOM PROGRAMS", "HISTORY", "WEEKLY CHECK-IN", "REVIEW", "DECISION JOURNAL", "SEARCH RECORDS"]) {
      expect(labels).toContain(label);
    }
  });
  it.each([
    ["  HYDRATION ", ["WATER"]],
    ["food", ["MEAL", "FOOD LOOKUP", "HIDDEN FEATURES"]],
    ["decision journal", ["DECISION JOURNAL"]],
    ["memory", ["WHAT BEYOND SHOULD REMEMBER", "MY MEALS"]],
    ["resume", ["WORKOUT"]],
    ["restore", ["BACKUP & RECOVERY"]],
    ["weekly review", ["REVIEW"]],
    ["system status", ["SYSTEMS"]],
    ["privacy", ["STEALTH"]],
    ["nonexistent-tool", []],
  ])("matches names and explicit aliases for %s", (query, names) => {
    expect(findCapabilities(query).map((entry) => entry.label)).toEqual(names);
  });
  it("finds DATA by its new name and legacy body alias without changing its route", () => {
    for (const query of ["data", "body"]) {
      expect(findCapabilities(query).find((entry) => entry.label === "DATA")?.destination).toEqual({ kind: "workspace", tab: "BODY" });
    }
  });
  it("keeps record retrieval separate and does not search personal meal names", () => {
    expect(findCapabilities("Synthetic lunch")).toEqual([]);
    expect(findCapabilities("progress").map((entry) => entry.label)).toEqual(["WEEKLY CHECK-IN"]);
    expect(findCapabilities("search records").map((entry) => entry.label)).toEqual(["SEARCH RECORDS"]);
  });
});


describe("FRICTION-001 — COMMAND descriptions in plain words", () => {
  it("never describe a tool as 'existing' or tag COMMAND items with COMMAND", () => {
    for (const entry of SYSTEM_CAPABILITIES) {
      expect(entry.description, entry.label).not.toMatch(/\bexisting\b/i);
      expect(entry.description, entry.label).not.toMatch(/^COMMAND · /);
    }
  });
});
