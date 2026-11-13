import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { startDay, updateSchedulePattern } from "../../src/application/commands";
import { confirmScheduleException } from "../../src/application/scheduleExceptions";
import { getTodayPicture } from "../../src/application/todayPicture";
import { readOperatorContext } from "../../src/application/operatorContext";
import { answerQuestion } from "../../src/application/helper/freeAnswers";
import { DEFAULT_SCHEDULE_PATTERN } from "../../src/engine/scheduledContext";
import { db } from "../../src/persistence/db";

/**
 * OPERATOR-EXPERIENCE-001 slice 2: Alfred and the free helper explain what TODAY's band shows (NOW, NEXT) from the
 * same reading, with sources, and change nothing. Week B from Mon Nov 16 2026: Wed 18/Thu 19 work, Fri 20–Sun 22 off.
 */
const { id: _id, createdAt: _c, updatedAt: _u, ...ROTATION } = DEFAULT_SCHEDULE_PATTERN;
const at = (d: number, h: number, m = 0) => new Date(2026, 10, d, h, m);
beforeEach(async () => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date(2026, 10, 1, 12)); await updateSchedulePattern(ROTATION); });
afterEach(() => { vi.useRealTimers(); });
const picture = async (now: Date) => (await readOperatorContext({ purpose: "local", includePersonal: false }, now)).records.find((r) => r.title === "What TODAY shows")?.text;

it("with no lived day started there is nothing to explain, and Alfred isn't given a guess", async () => {
  vi.setSystemTime(at(18, 20));
  expect(await getTodayPicture(at(18, 20))).toBeNull();
  expect(await picture(at(18, 20))).toBeUndefined();
  expect(await answerQuestion("why does today say work run", at(18, 20))).toBe("No day is started yet.");
});

it("Alfred's context and the helper carry TODAY's NOW and NEXT with their sources, and write nothing", async () => {
  vi.setSystemTime(at(17, 9));
  await confirmScheduleException({ date: "2026-11-20", kind: "WORK" });
  vi.setSystemTime(at(18, 20));
  await startDay();
  const before = { events: await db.events.count(), exceptions: await db.scheduleExceptions.count() };

  const p = (await getTodayPicture(at(18, 20)))!;
  expect(p.now!.label).toBe("WORK RUN");
  expect(p.next!.line).toBe("Next day off: Sat, Nov 21 · forecast · 1 confirmed change ahead");

  const text = (await picture(at(18, 20)))!;
  expect(text).toMatch(/^TODAY SHOWS: WORK RUN: Shift 1 of 3\. /);
  expect(text).toContain("Today: a work day, set from your saved schedule when the day started.");
  expect(text).toContain("NEXT: Next day off: Sat, Nov 21 · forecast · 1 confirmed change ahead. Next: a day off on Sat, Nov 21, from your saved schedule (a forecast, not a record).");
  expect(text).toContain("it is not a recommendation");
  expect(text).toContain("each needs the operator's CONFIRM). Alfred cannot change any of it.");

  const answer = (await answerQuestion("Why does today say work run?", at(18, 20)))!;
  expect(answer).toMatch(/^WORK RUN: Shift 1 of 3\. .* NEXT: Next day off: Sat, Nov 21 · forecast · 1 confirmed change ahead\./);
  expect(await answerQuestion("what's next", at(18, 20))).toBe(answer);
  // Other questions still go where they went.
  expect(await answerQuestion("why is my protein low today", at(18, 20))).toBeNull();
  expect({ events: await db.events.count(), exceptions: await db.scheduleExceptions.count() }).toEqual(before);
});
