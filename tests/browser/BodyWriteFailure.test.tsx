import { afterEach, describe, expect, it, vi } from "vitest";
import { render, cleanup } from "vitest-browser-react";
import { BodyScreen } from "../../src/ui/screens/body/BodyScreen";
import { db } from "../../src/persistence/db";
import { startDay } from "../../src/application/commands";
import { BODY_WRITE_FAILED } from "../../src/ui/screens/body/bodyScreenCopy";

/**
 * POST-QA STABILIZATION (Mission 1): when the device write itself fails,
 * BODY must never look like it saved, must leave the busy state, must say
 * so in plain words next to the control, and must let the operator retry.
 * The failure is forced at the real write (db.events.add), not by mocking
 * the command, so the whole command → persistence path is exercised.
 */
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function failEventWrites() {
  return vi.spyOn(db.events, "add").mockRejectedValue(new Error("QuotaExceededError: the disk is full"));
}

async function eventCount(type: string) {
  return db.events.where("type").equals(type).count();
}

type Screen = Awaited<ReturnType<typeof render>>;

const stations: {
  name: string;
  eventType: string;
  savedText: string;
  open: (screen: Screen) => Promise<void>;
  submit: (screen: Screen) => Promise<void>;
}[] = [
  {
    name: "WATER",
    eventType: "WATER_LOGGED",
    savedText: "8 oz added.",
    open: async () => {},
    submit: async (screen) => {
      await screen.getByRole("button", { name: "+8 oz" }).click();
    },
  },
  {
    name: "SLEEP",
    eventType: "SLEEP_LOGGED",
    savedText: "Sleep saved as 7 hr.",
    open: async (screen) => {
      await screen.getByRole("button", { name: "Open SLEEP" }).click();
      await screen.getByRole("spinbutton", { name: "Hours" }).fill("7");
    },
    submit: async (screen) => {
      await screen.getByRole("button", { name: "LOG SLEEP" }).click();
    },
  },
  {
    name: "BODYWEIGHT",
    eventType: "BODYWEIGHT_LOGGED",
    savedText: "180 lbs logged.",
    open: async (screen) => {
      await screen.getByRole("button", { name: "Open BODYWEIGHT" }).click();
      await screen.getByRole("spinbutton", { name: "Weight (lbs)" }).fill("180");
    },
    submit: async (screen) => {
      await screen.getByRole("button", { name: "LOG BODYWEIGHT" }).click();
    },
  },
  {
    name: "PROTEIN",
    eventType: "PROTEIN_LOGGED",
    savedText: "30 g added.",
    open: async (screen) => {
      await screen.getByRole("button", { name: "Open PROTEIN" }).click();
      await screen.getByRole("spinbutton", { name: "Protein (g)" }).fill("30");
    },
    submit: async (screen) => {
      await screen.getByRole("button", { name: "LOG PROTEIN" }).click();
    },
  },
];

describe("BodyScreen (real browser) — a failed write never looks saved", () => {
  for (const station of stations) {
    it(`${station.name}: shows a plain failure, recovers from busy, and retry saves exactly once`, async () => {
      await startDay();
      const screen = await render(<BodyScreen />);
      await station.open(screen);
      const write = failEventWrites();

      await station.submit(screen);

      await expect.element(screen.getByText(BODY_WRITE_FAILED, { exact: true })).toBeVisible();
      expect(screen.getByText(station.savedText, { exact: true }).elements()).toHaveLength(0);
      expect(await eventCount(station.eventType)).toBe(0);
      expect(document.body.textContent).not.toMatch(/QuotaExceededError|disk is full/);

      // Retry: the same control is usable again and the entry is still there.
      write.mockRestore();
      await station.submit(screen);

      await expect.element(screen.getByText(station.savedText, { exact: true })).toBeVisible();
      expect(screen.getByText(BODY_WRITE_FAILED, { exact: true }).elements()).toHaveLength(0);
      expect(await eventCount(station.eventType)).toBe(1);
    });
  }

  it("WATER: an earlier success banner doesn't stay up beside a later failure", async () => {
    await startDay();
    const screen = await render(<BodyScreen />);
    await screen.getByRole("button", { name: "+8 oz" }).click();
    await expect.element(screen.getByText("8 oz added.", { exact: true })).toBeVisible();

    failEventWrites();
    await screen.getByRole("button", { name: "+12 oz" }).click();

    await expect.element(screen.getByText(BODY_WRITE_FAILED, { exact: true })).toBeVisible();
    expect(screen.getByText("8 oz added.", { exact: true }).elements()).toHaveLength(0);
    expect(screen.getByText("12 oz added.", { exact: true }).elements()).toHaveLength(0);
    expect(await eventCount("WATER_LOGGED")).toBe(1);
  });
});
