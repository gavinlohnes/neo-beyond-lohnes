import { describe, expect, it } from "vitest";
import { findCapabilities, SYSTEM_CAPABILITIES } from "../src/ui/systemCatalog";

describe("capability discovery", () => {
  it("offers exactly the approved 18 unique entries and browses without a query", () => {
    expect(SYSTEM_CAPABILITIES).toHaveLength(18);
    expect(new Set(SYSTEM_CAPABILITIES.map((entry) => entry.label)).size).toBe(18);
    expect(findCapabilities("  ")).toEqual(SYSTEM_CAPABILITIES);
  });
  it.each([
    ["  HYDRATION ", ["WATER"]],
    ["food", ["MEAL"]],
    ["decision journal", ["DECISION JOURNAL"]],
    ["resume", ["WORKOUT"]],
    ["nonexistent-tool", []],
  ])("matches names and explicit aliases for %s", (query, names) => {
    expect(findCapabilities(query).map((entry) => entry.label)).toEqual(names);
  });
  it("keeps record retrieval separate and does not search personal meal names", () => {
    expect(findCapabilities("Synthetic lunch")).toEqual([]);
    expect(findCapabilities("progress").map((entry) => entry.label)).toEqual(["WEEKLY CHECK-IN"]);
    expect(findCapabilities("search records").map((entry) => entry.label)).toEqual(["SEARCH RECORDS"]);
  });
});
