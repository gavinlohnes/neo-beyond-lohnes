import { expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { MoreScreen } from "../../src/ui/screens/more/MoreScreen";

it("opens the editable planner from the existing week-ahead route and returns to weekly check-in", async () => {
  const screen = await render(<MoreScreen initialView="WEEKLY" />);
  await screen.getByRole("button", { name: "SHOW WEEK AHEAD", exact: true }).click();
  await screen.getByRole("button", { name: "OPEN WEEK PLANNER", exact: true }).click();
  await expect.element(screen.getByRole("button", { name: "Week planner", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => screen.container.querySelectorAll(".week-planner__day").length).toBe(7);
  await screen.getByRole("button", { name: "BACK TO WEEKLY CHECK-IN", exact: true }).click();
  await expect.element(screen.getByRole("button", { name: "SHOW WEEK AHEAD", exact: true })).toBeVisible();
});
