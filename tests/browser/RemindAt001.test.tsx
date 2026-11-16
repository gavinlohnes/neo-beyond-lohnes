import { afterEach, describe, expect, it } from "vitest";
import { page } from "vitest/browser";
import { render, cleanup } from "vitest-browser-react";
import { IntentScreen } from "../../src/ui/screens/more/IntentScreen";
import { setKeyMomentAlerts } from "../../src/application/keyMomentAlerts";
import { getObligations } from "../../src/application/intentQueries";
import { formatLocalDate } from "../../src/engine/scheduledContext";

/** REMIND-AT-001: setting a reminder time says, right there, whether it will alert; never silently. */
afterEach(() => cleanup());

const inDays = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return formatLocalDate(d); };

describe("REMIND-AT-001 — reminder time on a task (real browser, 320px)", () => {
  it("creates a task with a time, shows that it alerts, then a quiet-hours time says it won't, without overflow", async () => {
    await page.viewport(320, 900);
    const screen = await render(<IntentScreen />);
    await screen.getByRole("button", { name: "CREATE OBLIGATION" }).click();
    await screen.getByPlaceholder("What needs to be resolved?").fill("Call mum");
    const time = screen.getByLabelText("Remind at");
    await expect.element(time).toBeDisabled(); // a time needs a due date
    await screen.getByLabelText("Due").fill(inDays(3));
    await time.fill("12:00");
    await expect.element(screen.getByRole("status")).toHaveTextContent("Alerts at 12:00 on");
    await expect.poll(() => document.documentElement.scrollWidth).toBeLessThanOrEqual(320);
    await screen.getByRole("button", { name: "CREATE OBLIGATION", exact: true }).last().click();
    await expect.poll(async () => (await getObligations()).find((o) => o.title === "Call mum")?.remindAt).toBe("12:00");

    await screen.getByRole("button", { name: "Open Call mum" }).click();
    await expect.element(screen.getByText(/· reminder 12:00$/)).toBeVisible();
    await setKeyMomentAlerts({ off: [], quietFrom: "22:00", quietTo: "07:00" });
    await screen.getByRole("button", { name: "EDIT", exact: true }).click();
    await screen.getByLabelText("Remind at").fill("23:30");
    await expect.element(screen.getByRole("status")).toHaveTextContent("Won't alert: 23:30 is in your quiet hours (22:00 to 07:00).");
    await expect.poll(() => document.documentElement.scrollWidth).toBeLessThanOrEqual(320);
    await screen.getByRole("button", { name: "SAVE", exact: true }).click();
    await expect.poll(async () => (await getObligations()).find((o) => o.title === "Call mum")?.remindAt).toBe("23:30");
    await expect.element(screen.getByRole("status")).toHaveTextContent("Won't alert: 23:30 is in your quiet hours (22:00 to 07:00).");

    // Clearing the time removes it.
    await screen.getByRole("button", { name: "EDIT", exact: true }).click();
    await screen.getByLabelText("Remind at").fill("");
    await screen.getByRole("button", { name: "SAVE", exact: true }).click();
    await expect.poll(async () => (await getObligations()).find((o) => o.title === "Call mum")?.remindAt ?? "none").toBe("none");
  });
});
