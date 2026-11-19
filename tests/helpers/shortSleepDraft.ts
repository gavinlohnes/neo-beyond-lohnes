import { vi } from "vitest";
import { endDay, logSleep, setWorkContext, startDay } from "../../src/application/commands";
/** Synthetic history: enough personal baseline plus two short main sleeps, no check-in. */
export async function seedShortSleepDraft(last: [number, number] = [310, 290]) {
  vi.useFakeTimers({ toFake: ["Date"] });
  let id = "";
  const sleeps = [...Array<number>(40).fill(420), ...last];
  for (const [index, minutes] of sleeps.entries()) {
    vi.setSystemTime(new Date(2026, 7, 20 + index, 18));
    const day = await startDay(); id = day.id;
    await setWorkContext(id, "WORK", "MANUAL");
    await logSleep(id, minutes, "PRIMARY");
    if (index < sleeps.length - 1) { vi.setSystemTime(new Date(2026, 7, 21 + index, 16)); await endDay(id); }
  }
  return id;
}
