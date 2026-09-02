import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { render, cleanup } from "vitest-browser-react";
import axe from "axe-core";
import { captureItem } from "../../src/application/commands";
import { archiveMission, createMission, createObligation } from "../../src/application/intentCommands";
import { searchAll, type SearchResult } from "../../src/application/searchQueries";
import { SearchScreen } from "../../src/ui/screens/search/SearchScreen";

/**
 * Personal Search 1.0 — real-browser acceptance layer, same conventions
 * as ReviewScreen.test.tsx/MoreScreen.test.tsx.
 *
 * searchAll is module-mocked so the "request lifecycle" tests below can
 * control retrieval timing with deferred promises rather than racing real
 * Dexie I/O. Every other describe block needs the real implementation, so
 * a per-test beforeEach resets the mock to delegate straight through to it
 * — only the lifecycle tests override that default per-test.
 */
vi.mock("../../src/application/searchQueries", () => ({ searchAll: vi.fn() }));

const searchAllMock = vi.mocked(searchAll);
let realSearchAll: typeof searchAll;

beforeAll(async () => {
  const actual = await vi.importActual<typeof import("../../src/application/searchQueries")>(
    "../../src/application/searchQueries",
  );
  realSearchAll = actual.searchAll;
});

beforeEach(() => {
  searchAllMock.mockImplementation((query: string) => realSearchAll(query));
});

afterEach(() => {
  cleanup();
});

const SEARCH_INPUT = { role: "textbox" as const, name: "Search Missions, Obligations, and Capture" };

/** A promise whose settlement this test controls, standing in for real Dexie retrieval timing. */
function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function trackUnhandledRejections() {
  const reasons: unknown[] = [];
  const onUnhandledRejection = (event: PromiseRejectionEvent) => reasons.push(event.reason);
  window.addEventListener("unhandledrejection", onUnhandledRejection);
  return {
    reasons,
    async settle() {
      await new Promise((r) => setTimeout(r, 50));
    },
    stop() {
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    },
  };
}

const deckResult: SearchResult = { domain: "MISSION", id: "mission-1", title: "Rebuild the deck", context: undefined, status: "ACTIVE" };
const electricianResult: SearchResult = { domain: "OBLIGATION", id: "obligation-1", title: "Call the electrician", context: undefined, status: "OPEN" };

describe("SearchScreen (real browser)", () => {
  it("prompts to type before any query is entered", async () => {
    const screen = await render(<SearchScreen />);
    await expect.element(screen.getByText(/Type to search/, { exact: false })).toBeVisible();
  });

  it("finds a Mission, an Obligation, and a Capture item by text as the operator types", async () => {
    await createMission({ title: "Rebuild the deck" });
    await createObligation({ title: "Call the electrician" });
    await captureItem("Renew the car registration");

    const screen = await render(<SearchScreen />);
    await screen.getByRole("textbox", { name: "Search Missions, Obligations, and Capture" }).fill("deck");
    await expect.element(screen.getByText("Rebuild the deck", { exact: true })).toBeVisible();
    await expect.element(screen.getByText("Call the electrician", { exact: true })).not.toBeInTheDocument();

    await screen.getByRole("textbox", { name: "Search Missions, Obligations, and Capture" }).fill("electrician");
    await expect.element(screen.getByText("Call the electrician", { exact: true })).toBeVisible();

    await screen.getByRole("textbox", { name: "Search Missions, Obligations, and Capture" }).fill("registration");
    await expect.element(screen.getByText("Renew the car registration", { exact: true })).toBeVisible();
  });

  it("shows a 'no matches' state for a query that matches nothing, and includes an archived Mission honestly", async () => {
    const mission = await createMission({ title: "Old kitchen project" });
    await archiveMission(mission.id);

    const screen = await render(<SearchScreen />);
    await screen.getByRole("textbox", { name: "Search Missions, Obligations, and Capture" }).fill("kitchen");
    await expect.element(screen.getByText("Old kitchen project", { exact: true })).toBeVisible();
    await expect.element(screen.getByText("MISSION · ARCHIVED", { exact: true })).toBeVisible();

    await screen.getByRole("textbox", { name: "Search Missions, Obligations, and Capture" }).fill("nothing-matches-this");
    await expect.element(screen.getByText(/No matches for/, { exact: false })).toBeVisible();
  });
});

describe("SearchScreen (real browser) — tap-to-navigate", () => {
  it("renders every result as a plain, non-interactive row when onSelectResult is omitted", async () => {
    await createMission({ title: "Rebuild the deck" });
    await createObligation({ title: "Call the electrician" });
    await captureItem("Renew the car registration");

    const screen = await render(<SearchScreen />);
    await screen.getByRole(SEARCH_INPUT.role, { name: SEARCH_INPUT.name }).fill("e");
    await expect.element(screen.getByText("Rebuild the deck", { exact: true })).toBeVisible();
    expect(screen.getByRole("button", { name: /^Open/ }).elements()).toHaveLength(0);
  });

  it("renders each result as a real button and invokes onSelectResult with the exact result on click, per domain", async () => {
    await createMission({ title: "Rebuild the deck" });
    await createObligation({ title: "Call the electrician" });
    await captureItem("Renew the car registration");

    const onSelectResult = vi.fn();
    const screen = await render(<SearchScreen onSelectResult={onSelectResult} />);

    await screen.getByRole(SEARCH_INPUT.role, { name: SEARCH_INPUT.name }).fill("deck");
    await screen.getByRole("button", { name: "Open MISSION: Rebuild the deck" }).click();
    expect(onSelectResult).toHaveBeenCalledTimes(1);
    expect(onSelectResult.mock.calls[0]![0]).toMatchObject({ domain: "MISSION", title: "Rebuild the deck" });

    await screen.getByRole(SEARCH_INPUT.role, { name: SEARCH_INPUT.name }).fill("electrician");
    await screen.getByRole("button", { name: "Open OBLIGATION: Call the electrician" }).click();
    expect(onSelectResult).toHaveBeenCalledTimes(2);
    expect(onSelectResult.mock.calls[1]![0]).toMatchObject({ domain: "OBLIGATION", title: "Call the electrician" });

    await screen.getByRole(SEARCH_INPUT.role, { name: SEARCH_INPUT.name }).fill("registration");
    await screen.getByRole("button", { name: "Open CAPTURE: Renew the car registration" }).click();
    expect(onSelectResult).toHaveBeenCalledTimes(3);
    expect(onSelectResult.mock.calls[2]![0]).toMatchObject({ domain: "CAPTURE", title: "Renew the car registration" });
  });
});

describe("SearchScreen (real browser) — narrow phone widths", () => {
  it.each([320, 360, 375])("has no horizontal overflow at %ipx", async (width) => {
    await createMission({ title: "Rebuild the deck" });
    await page.viewport(width, 800);
    const screen = await render(<SearchScreen />);
    await screen.getByRole("textbox", { name: "Search Missions, Obligations, and Capture" }).fill("deck");
    await expect.element(screen.getByText("Rebuild the deck", { exact: true })).toBeVisible();

    await expect.poll(() => document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
  });
});

describe("SearchScreen (real browser) — accessibility", () => {
  it("passes real WCAG AA color-contrast beyond the known app-wide exception, empty and with results", async () => {
    await createMission({ title: "Rebuild the deck" });
    const screen = await render(<SearchScreen />);
    let results = await axe.run(screen.container, { rules: { "color-contrast": { enabled: false } } });
    expect(results.violations).toEqual([]);

    await screen.getByRole("textbox", { name: "Search Missions, Obligations, and Capture" }).fill("deck");
    await expect.element(screen.getByText("Rebuild the deck", { exact: true })).toBeVisible();
    results = await axe.run(screen.container, { rules: { "color-contrast": { enabled: false } } });
    expect(results.violations).toEqual([]);
  });

  it("exposes each search status message as a polite ARIA status region, without moving focus or alarming assistive tech", async () => {
    const deferred = createDeferred<SearchResult[]>();
    const spy = searchAllMock.mockReturnValue(deferred.promise);

    const screen = await render(<SearchScreen />);
    const input = screen.getByRole(SEARCH_INPUT.role, { name: SEARCH_INPUT.name });

    // Initial prompt.
    await expect
      .element(screen.getByRole("status"))
      .toHaveTextContent("Type to search Missions, Obligations, and Capture.");
    let results = await axe.run(screen.container, { rules: { "color-contrast": { enabled: false } } });
    expect(results.violations).toEqual([]);

    // Pending — polite status, not an alert; focus stays on the input.
    await input.fill("deck");
    await expect.element(screen.getByRole("status")).toHaveTextContent("Searching…");
    await expect.element(screen.getByRole("alert")).not.toBeInTheDocument();
    expect(document.activeElement).toBe(input.element());
    results = await axe.run(screen.container, { rules: { "color-contrast": { enabled: false } } });
    expect(results.violations).toEqual([]);

    // Failure — still a polite status, never an assertive alert.
    deferred.reject(new Error("boom"));
    await expect.element(screen.getByRole("status")).toHaveTextContent("Search failed. Try again.");
    await expect.element(screen.getByRole("alert")).not.toBeInTheDocument();
    expect(document.activeElement).toBe(input.element());
    results = await axe.run(screen.container, { rules: { "color-contrast": { enabled: false } } });
    expect(results.violations).toEqual([]);

    // Genuine no-match — polite status.
    spy.mockResolvedValueOnce([]);
    await input.fill("nothing-matches-this");
    await expect.element(screen.getByRole("status")).toHaveTextContent('No matches for "nothing-matches-this".');
    expect(document.activeElement).toBe(input.element());

    // Cleared — back to the initial polite status.
    await input.fill("");
    await expect
      .element(screen.getByRole("status"))
      .toHaveTextContent("Type to search Missions, Obligations, and Capture.");
    expect(document.activeElement).toBe(input.element());
  });
});

describe("SearchScreen (real browser) — request lifecycle", () => {
  it("keeps the newer query's results when an older request resolves after it", async () => {
    const deckDeferred = createDeferred<SearchResult[]>();
    const electricianDeferred = createDeferred<SearchResult[]>();
    const spy = searchAllMock.mockImplementation(async (q: string) =>
      q === "deck" ? deckDeferred.promise : electricianDeferred.promise,
    );

    const screen = await render(<SearchScreen />);
    const input = screen.getByRole(SEARCH_INPUT.role, { name: SEARCH_INPUT.name });
    await input.fill("deck");
    await input.fill("electrician");

    electricianDeferred.resolve([electricianResult]);
    await expect.element(screen.getByText("Call the electrician", { exact: true })).toBeVisible();

    deckDeferred.resolve([deckResult]);
    await expect.element(screen.getByText("Rebuild the deck", { exact: true })).not.toBeInTheDocument();
    await expect.element(screen.getByText("Call the electrician", { exact: true })).toBeVisible();

    spy.mockRestore();
  });

  it("invalidates a pending request when the input is cleared, restoring the initial prompt", async () => {
    const deferred = createDeferred<SearchResult[]>();
    const spy = searchAllMock.mockReturnValue(deferred.promise);

    const screen = await render(<SearchScreen />);
    const input = screen.getByRole(SEARCH_INPUT.role, { name: SEARCH_INPUT.name });
    await input.fill("deck");
    await expect.element(screen.getByText("Searching…", { exact: true })).toBeVisible();

    await input.fill("");
    await expect.element(screen.getByText(/Type to search/, { exact: false })).toBeVisible();

    deferred.resolve([deckResult]);
    await new Promise((r) => setTimeout(r, 50));
    await expect.element(screen.getByText(/Type to search/, { exact: false })).toBeVisible();
    await expect.element(screen.getByText("Rebuild the deck", { exact: true })).not.toBeInTheDocument();

    spy.mockRestore();
  });

  it("clears prior results and shows a loading state immediately when a newer query starts", async () => {
    const spy = searchAllMock.mockResolvedValueOnce([deckResult]);

    const screen = await render(<SearchScreen />);
    const input = screen.getByRole(SEARCH_INPUT.role, { name: SEARCH_INPUT.name });
    await input.fill("deck");
    await expect.element(screen.getByText("Rebuild the deck", { exact: true })).toBeVisible();

    const deferred = createDeferred<SearchResult[]>();
    spy.mockReturnValue(deferred.promise);
    await input.fill("electrician");

    await expect.element(screen.getByText("Rebuild the deck", { exact: true })).not.toBeInTheDocument();
    await expect.element(screen.getByText("Searching…", { exact: true })).toBeVisible();

    deferred.resolve([electricianResult]);
    await expect.element(screen.getByText("Call the electrician", { exact: true })).toBeVisible();

    spy.mockRestore();
  });

  it("renders an honest failure state when the latest request rejects, with no unhandled rejection", async () => {
    const tracker = trackUnhandledRejections();
    const spy = searchAllMock.mockRejectedValueOnce(new Error("boom"));

    const screen = await render(<SearchScreen />);
    await screen.getByRole(SEARCH_INPUT.role, { name: SEARCH_INPUT.name }).fill("deck");

    await expect.element(screen.getByText(/Search failed/, { exact: false })).toBeVisible();
    await expect.element(screen.getByText(/No matches/, { exact: false })).not.toBeInTheDocument();
    await expect.element(screen.getByText(/Type to search/, { exact: false })).not.toBeInTheDocument();

    await tracker.settle();
    expect(tracker.reasons).toEqual([]);

    tracker.stop();
    spy.mockRestore();
  });

  it("shows a genuine no-match state, not an error, when the latest request resolves empty", async () => {
    const spy = searchAllMock.mockResolvedValueOnce([]);

    const screen = await render(<SearchScreen />);
    await screen.getByRole(SEARCH_INPUT.role, { name: SEARCH_INPUT.name }).fill("nothing-matches-this");

    await expect.element(screen.getByText('No matches for "nothing-matches-this".', { exact: true })).toBeVisible();
    await expect.element(screen.getByText(/Search failed/, { exact: false })).not.toBeInTheDocument();

    spy.mockRestore();
  });

  it("does not let an older rejection disturb a newer success", async () => {
    const aDeferred = createDeferred<SearchResult[]>();
    const bDeferred = createDeferred<SearchResult[]>();
    const spy = searchAllMock
      .mockImplementationOnce(async () => aDeferred.promise)
      .mockImplementationOnce(async () => bDeferred.promise);
    const tracker = trackUnhandledRejections();

    const screen = await render(<SearchScreen />);
    const input = screen.getByRole(SEARCH_INPUT.role, { name: SEARCH_INPUT.name });
    await input.fill("deck");
    await input.fill("electrician");

    bDeferred.resolve([electricianResult]);
    await expect.element(screen.getByText("Call the electrician", { exact: true })).toBeVisible();

    aDeferred.reject(new Error("stale failure"));
    await tracker.settle();

    await expect.element(screen.getByText("Call the electrician", { exact: true })).toBeVisible();
    await expect.element(screen.getByText(/Search failed/, { exact: false })).not.toBeInTheDocument();
    expect(tracker.reasons).toEqual([]);

    tracker.stop();
    spy.mockRestore();
  });

  it("clears an error and recovers to normal results on a subsequent successful query", async () => {
    const spy = searchAllMock.mockRejectedValueOnce(new Error("boom"));

    const screen = await render(<SearchScreen />);
    const input = screen.getByRole(SEARCH_INPUT.role, { name: SEARCH_INPUT.name });
    await input.fill("deck");
    await expect.element(screen.getByText(/Search failed/, { exact: false })).toBeVisible();

    const deferred = createDeferred<SearchResult[]>();
    spy.mockReturnValue(deferred.promise);
    await input.fill("electrician");
    await expect.element(screen.getByText(/Search failed/, { exact: false })).not.toBeInTheDocument();
    await expect.element(screen.getByText("Searching…", { exact: true })).toBeVisible();

    deferred.resolve([electricianResult]);
    await expect.element(screen.getByText("Call the electrician", { exact: true })).toBeVisible();

    spy.mockRestore();
  });

  it("returns to the initial prompt when the input is cleared after a failure", async () => {
    const spy = searchAllMock.mockRejectedValueOnce(new Error("boom"));

    const screen = await render(<SearchScreen />);
    const input = screen.getByRole(SEARCH_INPUT.role, { name: SEARCH_INPUT.name });
    await input.fill("deck");
    await expect.element(screen.getByText(/Search failed/, { exact: false })).toBeVisible();

    await input.fill("");
    await expect.element(screen.getByText(/Type to search/, { exact: false })).toBeVisible();
    await expect.element(screen.getByText(/Search failed/, { exact: false })).not.toBeInTheDocument();

    spy.mockRestore();
  });

  it("does not leak a state update or throw an unhandled rejection when unmounted while a request is pending (success)", async () => {
    const deferred = createDeferred<SearchResult[]>();
    const spy = searchAllMock.mockReturnValue(deferred.promise);
    const tracker = trackUnhandledRejections();

    const screen = await render(<SearchScreen />);
    await screen.getByRole(SEARCH_INPUT.role, { name: SEARCH_INPUT.name }).fill("deck");
    await screen.unmount();

    deferred.resolve([deckResult]);
    await tracker.settle();
    expect(tracker.reasons).toEqual([]);

    tracker.stop();
    spy.mockRestore();
  });

  it("does not leak a state update or throw an unhandled rejection when unmounted while a request is pending (rejection)", async () => {
    const deferred = createDeferred<SearchResult[]>();
    const spy = searchAllMock.mockReturnValue(deferred.promise);
    const tracker = trackUnhandledRejections();

    const screen = await render(<SearchScreen />);
    await screen.getByRole(SEARCH_INPUT.role, { name: SEARCH_INPUT.name }).fill("deck");
    await screen.unmount();

    deferred.reject(new Error("stale failure after unmount"));
    await tracker.settle();
    expect(tracker.reasons).toEqual([]);

    tracker.stop();
    spy.mockRestore();
  });

  it("renders results in exactly the order searchAll returns them — no reordering or status filtering added in the UI", async () => {
    // Deliberately not alphabetical/domain-sorted: searchAll owns ordering
    // (Mission, then Obligation, then Capture); SearchScreen must render
    // this verbatim rather than imposing its own sort.
    const mixed: SearchResult[] = [
      { domain: "MISSION", id: "m1", title: "aaa mission", context: undefined, status: "ARCHIVED" },
      { domain: "OBLIGATION", id: "o1", title: "mmm obligation", context: undefined, status: "SATISFIED" },
      { domain: "CAPTURE", id: "c1", title: "zzz capture", context: undefined, status: "RESOLVED" },
    ];
    const spy = searchAllMock.mockResolvedValueOnce(mixed);

    const screen = await render(<SearchScreen />);
    await screen.getByRole(SEARCH_INPUT.role, { name: SEARCH_INPUT.name }).fill("query");
    await expect.element(screen.getByText("zzz capture", { exact: true })).toBeVisible();

    const titles = screen.container.querySelectorAll(".card .card-body");
    expect(Array.from(titles).map((el) => el.textContent)).toEqual(["aaa mission", "mmm obligation", "zzz capture"]);
    expect(screen.getByText("MISSION · ARCHIVED", { exact: true })).toBeTruthy();
    expect(screen.getByText("OBLIGATION · SATISFIED", { exact: true })).toBeTruthy();
    expect(screen.getByText("CAPTURE · RESOLVED", { exact: true })).toBeTruthy();

    spy.mockRestore();
  });
});
