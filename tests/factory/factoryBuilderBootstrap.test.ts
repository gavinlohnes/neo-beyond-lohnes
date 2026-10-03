import { describe, expect, it } from "vitest";
import { candidateBranchName, routeCandidate, verifyBuilderBot, verifyBuilderInstallation } from "../../scripts/factory-builder-bootstrap-core.mjs";

const valid = {
  installation: { id: 158170874, app_id: 4790533, app_slug: "beyond-builder" },
  expectedAppId: "4790533",
  expectedInstallationId: "158170874",
  expectedSlug: "beyond-builder",
};

describe("Builder identity bootstrap", () => {
  it("accepts only the configured App installation and bot identity", () => {
    expect(verifyBuilderInstallation(valid)).toMatchObject({ installation_id: 158170874 });
    expect(verifyBuilderBot({ login: "beyond-builder[bot]", type: "Bot" }, "beyond-builder")).toBe("beyond-builder[bot]");
  });

  it.each([
    ["wrong app", { installation: { ...valid.installation, app_id: 1 } }],
    ["wrong installation", { installation: { ...valid.installation, id: 1 } }],
    ["wrong slug", { installation: { ...valid.installation, app_slug: "other" } }],
  ])("fails closed for %s", (_name, override) => {
    expect(() => verifyBuilderInstallation({ ...valid, ...override })).toThrow();
  });

  it("rejects a human or different bot author", () => {
    expect(() => verifyBuilderBot({ login: "gavinlohnes", type: "User" }, "beyond-builder")).toThrow();
    expect(() => verifyBuilderBot({ login: "other[bot]", type: "Bot" }, "beyond-builder")).toThrow();
  });

  it("derives a deterministic candidate branch only from a full SHA", () => {
    expect(candidateBranchName("DROP-001", "a".repeat(40))).toBe("beyond-builder/drop-001-aaaaaaaaaaaa");
    expect(() => candidateBranchName("DROP-001", "main")).toThrow("INVALID_SOURCE_SHA");
  });

  it("updates only the exact source PR routing pointer", () => {
    const source = "---\nid: DROP-001\nbranch: codex/drop-001\npr: (pending — set by Builder immediately after opening the PR)\n---\n";
    const input = { dropId: "DROP-001", sourceBranch: "codex/drop-001", candidateUrl: "https://github.com/gavinlohnes/neo-beyond-lohnes/pull/50", candidateBranch: "beyond-builder/drop-001-test" };
    const routed = routeCandidate(source, input);
    expect(routed).toContain("pr: https://github.com/gavinlohnes/neo-beyond-lohnes/pull/50");
    expect(routed).toContain("branch: beyond-builder/drop-001-test");
    expect(() => routeCandidate(source.replace("(pending — set by Builder immediately after opening the PR)", "https://example.test/other"), input)).toThrow("SOURCE_PR_POINTER_MISMATCH");
  });
});
