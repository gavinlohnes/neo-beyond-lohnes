import { afterEach, beforeEach, expect, it } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { TodayScreen } from "../../src/ui/screens/today/TodayScreen";
import { logBodyweight, startDay } from "../../src/application/commands";

/** DENSITY-001: with a protein target and nothing logged, TODAY's tile reads "—" / NOT LOGGED, never "—/162g". */
beforeEach(async () => { await page.viewport(360, 800); });
afterEach(() => { cleanup(); });

it("shows an unlogged protein tile in words, like water, weight and sleep", async () => {
  const day = await startDay();
  await logBodyweight(day.id, 180);
  const screen = await render(<TodayScreen />);
  const tile = screen.getByRole("button", { name: /^Protein 0 \/ \d+ g/ });
  await expect.element(tile).toBeVisible();
  await expect.element(tile).toHaveTextContent("PROTEIN—NOT LOGGED");
});
