import { describe, expect, it } from "vitest";
import { CAPABILITY_GROUPS, findCapabilities, RENAMED_CAPABILITY_LABELS, SYSTEM_CAPABILITIES } from "../src/ui/systemCatalog";

describe("capability discovery (COMMAND search)", () => {
  it("offers unique entries in known groups and browses without a query", () => {
    // COMMAND-CENTER-001: the approved 19 plus Note, Urge and COMMAND's own settings; MORE's
    // workspace entry left because COMMAND is where the search lives. SUIT-001 adds SYSTEMS and STEALTH.
    // TONIGHT-001: FOOD LOOKUP left the meal screen for its own COMMAND entry.
    // MEMORY-001 adds one settings destination for confirmed prep/recovery facts.
    // ROUTINES-001 adds MORE → ROUTINES; UX-POLISH-001 adds PROJECTS, PEOPLE and HOME.
    // LIFE-HUB-001 adds LIFE (ROUTINES becomes search-only inside it).
    expect(SYSTEM_CAPABILITIES.length).toBeGreaterThanOrEqual(57);
    expect(new Set(SYSTEM_CAPABILITIES.map((entry) => entry.label)).size).toBe(SYSTEM_CAPABILITIES.length);
    for (const entry of SYSTEM_CAPABILITIES) expect(CAPABILITY_GROUPS).toContain(entry.group);
    expect(findCapabilities("  ")).toEqual(SYSTEM_CAPABILITIES);
  });
  it("keeps every destination the SYSTEM dialog reached", () => {
    const labels = SYSTEM_CAPABILITIES.map((entry) => entry.label as string);
    for (const label of ["PLAN TODAY", "TODAY TOOLS", "TRAIN", "DATA", "WATER", "MEAL", "SLEEP", "BODYWEIGHT", "WORKOUT", "MISSIONS & OBLIGATIONS", "WORK SCHEDULE", "EXERCISE LIBRARY", "ROUTINES · WORKOUTS", "SHIFT ROUTINES", "HISTORY", "WEEKLY CHECK-IN", "REVIEW", "DECISION JOURNAL", "SEARCH RECORDS"]) {
      expect(labels).toContain(label);
    }
  });
  // GRAYSON-TRAIN-HOME-001: CUSTOM PROGRAMS is ROUTINES · WORKOUTS (TRAIN's list); the shift checklists are SHIFT ROUTINES.
  it("search finds both kinds of routine, the workout routines by their old words, and the library", () => {
    const names = (query: string) => findCapabilities(query).map((entry) => entry.label as string);
    expect(names("routine")).toEqual(expect.arrayContaining(["ROUTINES · WORKOUTS", "SHIFT ROUTINES"]));
    for (const query of ["program", "template", "workout"]) expect(names(query), query).toContain("ROUTINES · WORKOUTS");
    for (const query of ["library", "exercise", "lift"]) expect(names(query), query).toContain("EXERCISE LIBRARY");
    expect(names("shift")).toContain("SHIFT ROUTINES");
    const workouts = SYSTEM_CAPABILITIES.find((entry) => entry.label === "ROUTINES · WORKOUTS")!;
    expect(workouts.destination).toEqual({ kind: "routines" });
    expect(SYSTEM_CAPABILITIES.find((entry) => entry.label === "SHIFT ROUTINES")!.destination).toEqual({ kind: "more", view: "ROUTINES" });
    // A pin saved under an old label still finds its entry.
    expect(RENAMED_CAPABILITY_LABELS["CUSTOM PROGRAMS"]).toBe("ROUTINES · WORKOUTS");
    expect(RENAMED_CAPABILITY_LABELS.ROUTINES).toBe("SHIFT ROUTINES");
    expect(SYSTEM_CAPABILITIES.some((entry) => (entry.label as string) === "CUSTOM PROGRAMS" || (entry.label as string) === "ROUTINES")).toBe(false);
  });
  it.each([
    ["  HYDRATION ", ["WATER"]],
    ["food", ["MEAL", "FOOD LOOKUP", "HIDDEN FEATURES"]],
    ["decision journal", ["DECISION JOURNAL"]],
    ["memory", ["WHAT BEYOND SHOULD REMEMBER", "MY MEALS"]],
    ["resume", ["WORKOUT"]],
    ["restore", ["BACKUP & RECOVERY"]],
    ["weekly review", ["REVIEW"]],
    ["undated", ["PLAN TODAY"]],
    ["weekly debrief", ["REVIEW"]],
    ["my programme", ["TRAIN"]],
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

describe("REFLECT-001 — the reflective views are found by name", () => {
  it.each([
    ["delta", ["DELTA"], { kind: "more", view: "REVIEW", focus: "DELTA" }],
    ["patterns", ["PATTERNS"], { kind: "more", view: "REVIEW", focus: "PATTERNS" }],
    ["interview", ["WEEKLY INTERVIEW"], { kind: "more", view: "WEEKLY", focus: "INTERVIEW" }],
  ])("%s opens its view at the right place", (query, names, destination) => {
    const found = findCapabilities(query);
    expect(found.map((entry) => entry.label)).toEqual(names);
    expect(found[0]!.destination).toEqual(destination);
  });
  it("reflect finds the daily note and the weekly interview; the new entries stay out of the browse list", () => {
    expect(findCapabilities("reflect").map((entry) => entry.label)).toEqual(["DAILY NOTE", "WEEKLY INTERVIEW"]);
    for (const label of ["DELTA", "PATTERNS", "WEEKLY INTERVIEW"]) expect(SYSTEM_CAPABILITIES.find((entry) => entry.label === label)).toHaveProperty("browse", false);
  });
});
