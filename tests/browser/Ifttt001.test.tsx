import "dexie-export-import";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import {
  emitAutomationEvent, IFTTT_CONFIG_KEY, readAutomationConfig, readAutomationSends,
  saveAutomationConfig, sendAutomationTest,
} from "../../src/application/iftttAutomations";
import { AutomationsScreen } from "../../src/ui/screens/more/AutomationsScreen";
import "../../src/ui/screens/more/operator.css";
import { applyRestore } from "../../src/persistence/backup";
import { db } from "../../src/persistence/db";

beforeEach(async () => {
  await page.viewport(360, 800);
  localStorage.clear();
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); });

describe("IFTTT-001", () => {
  it("is off by default, saves explicitly, sends only selected event/time and includes only allowed opted-in values", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response("ok"));
    vi.stubGlobal("fetch", fetch);
    expect(readAutomationConfig()).toEqual({ enabled: false, key: "", events: [], includeValue: [] });
    saveAutomationConfig({ enabled: true, key: "secret/key", events: ["work_started", "routine_finished"], includeValue: ["work_started", "routine_finished"] });
    emitAutomationEvent("work_ended", "must not send");
    emitAutomationEvent("work_started", "sensitive");
    emitAutomationEvent("routine_finished", "Pre-shift");
    await expect.poll(() => fetch.mock.calls.length).toBe(2);
    const first = JSON.parse(String((fetch.mock.calls[0]![1] as RequestInit).body));
    const second = JSON.parse(String((fetch.mock.calls[1]![1] as RequestInit).body));
    expect(first).toMatchObject({ event: "work_started" }); expect(first.time).toBeTruthy(); expect(first.value).toBeUndefined();
    expect(second).toMatchObject({ event: "routine_finished", value: "Pre-shift" });
    expect(String(fetch.mock.calls[0]![0])).toContain("secret%2Fkey");
  });

  it("tests once, reports a failure without retrying, and keeps at most 20 phone-local sends", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(new Response("no", { status: 500 })).mockResolvedValue(new Response("ok"));
    vi.stubGlobal("fetch", fetch);
    await expect(sendAutomationTest("key")).rejects.toThrow("500");
    expect(fetch).toHaveBeenCalledTimes(1);
    for (let i = 0; i < 21; i++) await sendAutomationTest("key");
    expect(fetch).toHaveBeenCalledTimes(22);
    expect(readAutomationSends()).toHaveLength(20);
    expect(readAutomationSends().some((send) => !send.ok)).toBe(false);
  });

  it("never leaks the key when a network exception includes the full request URL", async () => {
    const secret = "secret/key-never-log";
    const encoded = encodeURIComponent(secret);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error(`Failed to fetch https://maker.ifttt.com/trigger/beyond/with/key/${encoded}`)));
    await expect(sendAutomationTest(secret)).rejects.toThrow("IFTTT could not be reached.");
    const serialized = JSON.stringify(readAutomationSends());
    expect(serialized).not.toContain(secret);
    expect(serialized).not.toContain(encoded);
    expect(readAutomationSends()[0]?.error).toBe("IFTTT could not be reached.");
  });

  it("never places the key or phone log in a backup or restores them from one", async () => {
    const secret = "maker-secret-never-export";
    saveAutomationConfig({ enabled: true, key: secret, events: ["day_started"], includeValue: [] });
    const backup = await db.export();
    expect(await backup.text()).not.toContain(secret);
    localStorage.removeItem(IFTTT_CONFIG_KEY);
    await applyRestore(new File([backup], "round-trip.json"));
    expect(localStorage.getItem(IFTTT_CONFIG_KEY)).toBeNull();
  });

  it("fits an accessible 360px settings surface and requires SAVE before enabling", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("ok")));
    const screen = await render(<AutomationsScreen active />);
    await screen.getByLabelText("IFTTT Webhooks key", { exact: true }).fill("phone-key");
    await screen.getByRole("checkbox", { name: "Automations on", exact: true }).click();
    await screen.getByRole("checkbox", { name: "Routine finished", exact: true }).click();
    expect(readAutomationConfig().enabled).toBe(false);
    await screen.getByRole("button", { name: "SAVE AUTOMATIONS", exact: true }).click();
    expect(readAutomationConfig()).toMatchObject({ enabled: true, key: "phone-key", events: ["routine_finished"] });
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(360);
    for (const control of document.querySelectorAll<HTMLElement>(".automations-screen button, .automations-screen input:not([type=checkbox]), .automations-screen .automation-choice")) expect(control.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    expect((await axe.run(document.body)).violations).toEqual([]);
  });
});
