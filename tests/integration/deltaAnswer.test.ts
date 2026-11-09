import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../../src/persistence/db";
import { startDay } from "../../src/application/commands";
import { saveDailyNote } from "../../src/application/dailyNoteCommands";
import { deltaAnswer } from "../../src/ui/components/DeltaViews";

/** SUPERCHARGE-001 item 1: ask DELTA in plain words, free; anything else is left for the usual routes. */
beforeEach(async () => { await db.open(); });

describe("ask DELTA", () => {
  it("answers DELTA questions honestly from what it has learned, and leaves everything else alone", async () => {
    const day = await startDay();
    await saveDailyNote(day.id, "#sauna");
    expect(await deltaAnswer("What have you learned about me?")).toBe("DELTA knows 0 of 7 things so far.");
    expect(await deltaAnswer("Anything unusual?")).toMatch(/^Nothing unusual for you right now\./);
    expect(await deltaAnswer("What does #sauna line up with?")).toBe("Still learning #sauna: 1 of 3 tagged days.");
    expect(await deltaAnswer("what does #nap do?")).toBe("You haven't tagged #nap yet. Tag it in your daily note and DELTA will compare.");
    expect(await deltaAnswer("When do I usually sleep?")).toMatch(/^Not enough measured Garmin nights yet/);
    expect(await deltaAnswer("How did my experiment go?")).toMatch(/^No finished experiments yet/);
    expect(await deltaAnswer("What moves the needle?")).toBe("Not enough weeks yet: 0 of 9 weeks with 3+ check-ins.");
    expect(await deltaAnswer("How much water today?")).toBeNull();
  });
});
