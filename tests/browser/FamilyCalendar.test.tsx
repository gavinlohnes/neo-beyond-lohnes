import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import { FamilyCalendarPanel } from "../../src/ui/screens/weekly/FamilyCalendarPanel";
import { saveGoogleCalendarConnection, readGoogleCalendarConnection } from "../../src/application/googleCalendar";
import { db } from "../../src/persistence/db";
import { seedRotation } from "./helpers/rotation";

/** BIG-IDEAS-001 item 8: the family calendar shows exactly what's shared and writes to Google only after CONFIRM. */
beforeEach(async () => { await page.viewport(360, 800); localStorage.clear(); });
afterEach(async () => { await cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); localStorage.clear(); });

it("previews only the three kinds of event, sends a file, and syncs to Google only on CONFIRM", async () => {
  await seedRotation();
  const now = new Date(2026, 9, 27, 12);
  vi.setSystemTime(now);
  const events = await db.events.count();

  const screen = await render(<FamilyCalendarPanel now={now} />);
  const panel = screen.getByRole("region", { name: "SHARE WITH FAMILY" });
  await expect.element(panel.getByText(/^Only these three kinds of event, for the next 4 weeks\./)).toBeVisible();
  await expect.element(panel.getByText(/^“Working” · \d+$/)).toBeVisible();
  await expect.element(panel.getByText(/^“Day off” · \d+$/)).toBeVisible();
  // The seeded rotation has no Garmin-timed sleep, so none is shared and BEYOND says why.
  await expect.element(panel.getByText("“Asleep — please don't call (usual time)” · 0")).toBeVisible();
  await expect.element(panel.getByText(/^Sleep isn't shared yet: it needs 3 Garmin-timed/)).toBeVisible();
  await panel.getByText("What she sees this week").click();
  const shown = [...screen.container.querySelectorAll("[data-family-event]")].map((li) => li.textContent!);
  expect(shown.length).toBeGreaterThan(0);
  for (const line of shown) expect(line).toMatch(/ · (Working|Day off)$/);
  await expect.element(panel.getByRole("button", { name: "SYNC TO GOOGLE" })).toBeDisabled();
  expect((await axe.run(screen.container, { rules: { "color-contrast": { enabled: false } } })).violations).toEqual([]);
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(360);

  await panel.getByRole("button", { name: "SEND AS A FILE (.ICS)" }).click();
  await expect.element(panel.getByText(/the family calendar file\. A sent file can't be recalled\.$/)).toBeVisible();
  await cleanup();

  // Connected: nothing goes to Google until CONFIRM.
  saveGoogleCalendarConnection({ ...readGoogleCalendarConnection(), accessToken: "synthetic-token", expiresAt: Date.now() + 3_600_000 });
  const fetches: string[] = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
    fetches.push(`${init?.method ?? "GET"} ${url}`);
    if (init?.method === "POST" && url.endsWith("/calendars")) return new Response(JSON.stringify({ id: "fam1" }), { status: 200 });
    if (!init?.method || init.method === "GET") return new Response(JSON.stringify({ items: [] }), { status: 200 });
    return new Response(JSON.stringify({ id: "x" }), { status: 200 });
  }));
  const again = await render(<FamilyCalendarPanel now={now} />);
  await again.getByRole("button", { name: "SYNC TO GOOGLE" }).click();
  const confirm = again.getByRole("group", { name: "Confirm family sync" });
  await expect.element(confirm.getByText(/^Writes \d+ events to your Google calendar “BEYOND — family” \(created now\)\./)).toBeVisible();
  expect(fetches).toEqual([]);
  await confirm.getByRole("button", { name: "CONFIRM" }).click();
  await expect.element(again.getByText(/^Synced \d+ events to “BEYOND — family”\. Share it with her in Google Calendar \(below\)\.$/)).toBeVisible();
  // First it looks for an existing "BEYOND — family", then creates one.
  expect(fetches[0]).toMatch(/^GET .*\/users\/me\/calendarList\?minAccessRole=owner$/);
  expect(fetches[1]).toMatch(/^POST .*\/calendars$/);
  // Sharing writes nothing to BEYOND's own records.
  expect(await db.events.count()).toBe(events);
});
