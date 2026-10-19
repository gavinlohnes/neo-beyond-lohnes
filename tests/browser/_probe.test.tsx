import { it } from "vitest";
import { render } from "vitest-browser-react";
import { TodayScreen } from "../../src/ui/screens/today/TodayScreen";
import { startDay, submitCheckIn } from "../../src/application/commands";
it("probe", async () => {
  const d = await startDay();
  await submitCheckIn(d.id, { energy: 1, stress: 5, mood: 1, soreness: 5, alcoholUrge: 5 });
  const s = await render(<TodayScreen />);
  await new Promise((r) => setTimeout(r, 1500));
  const n = s.getByRole("button", { name: /do this/ }).elements().length;
  const after = getComputedStyle(document.querySelector(".cc-cta")!, "::after").content;
  throw new Error("PROBE " + n + " " + after);
});
