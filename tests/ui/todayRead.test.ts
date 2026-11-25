import { describe, expect, it, vi } from "vitest";
import {
  EMPTY_TODAY_SNAPSHOT,
  installTodaySnapshot,
  readTodaySnapshot,
  type TodayReaders,
  type TodaySnapshot,
} from "../../src/ui/screens/today/todayRead";

// GRAYSON-TODAY-SPLIT-003 slice A: TODAY's one read, with fakes for every read it makes.

const DAY = {
  id: "day-1",
  startedAt: "2026-11-24T06:00:00.000Z",
  timezoneId: "America/Chicago",
  workContext: "WORK" as const,
  status: "ACTIVE" as const,
  createdAt: "2026-11-24T06:00:00.000Z",
  updatedAt: "2026-11-24T06:00:00.000Z",
};
const REC = { id: "rec-1", kind: "RECOVER", title: "Recover", rationale: "Short sleep." };
const CHECK_IN = { id: "ci-1", beyondDayId: "day-1" };

/** Every reader answers "nothing here"; a test overrides the ones it is about. */
function fakeReaders(overrides: Record<string, unknown> = {}): { readers: TodayReaders; calls: string[] } {
  const calls: string[] = [];
  const answers: Record<string, unknown> = {
    getActiveDay: undefined,
    getActiveWorkoutSession: undefined,
    getOpenCaptureItems: [],
    getCurrentlyEligibleUnresolvedObligations: [],
    getMissionForObligation: undefined,
    getCheckInDraft: undefined,
    getLatestCheckIn: undefined,
    getLatestRecommendation: undefined,
    getRecommendationDecision: undefined,
    getRecommendationHandoff: undefined,
    getPriorOutcomeMemory: undefined,
    getRecommendationMemory: {},
    wasRecommendationMateriallyRepeated: false,
    shouldSuggestEndDay: false,
    getPendingOutcomeRating: undefined,
    getMinimumDayStatus: null,
    getEffectiveHydrationTotal: 0,
    getHydrationEntries: [],
    getMostRecentBodyweight: undefined,
    getDayProteinTotalG: 0,
    getOpenReset: undefined,
    getOpenShiftDown: undefined,
    getLastShiftDownCompletedAt: undefined,
    getWorkPeriodEnded: undefined,
    getWorkPeriodStarted: undefined,
    hasUnresolvedPostShift: false,
    getWorkContextSource: undefined,
    getSleepEntries: [],
    getSleepDraftEvidence: null,
    getAdvisoryNotes: [],
    getSystemStatus: null,
    getLastMainSleep: null,
    getEffectiveProteinTargetG: undefined,
    getNutritionTargets: {},
    getTonightState: null,
    getEarlyDayStart: null,
    getRecordedYesterday: "WORK",
    getRecordedDayBefore: "OFF",
    hasRecoveryContract: false,
    getConfirmedExceptions: new Map(),
    getWeekAhead: null,
    getLivedDayMap: [],
    getShiftSleepPlan: null,
    getFlipPlan: null,
    getSchedulePattern: null,
    ...overrides,
  };
  const readers: Record<string, unknown> = {};
  for (const [name, answer] of Object.entries(answers)) {
    readers[name] = (..._args: unknown[]) => {
      calls.push(name);
      return answer instanceof Error ? Promise.reject(answer) : Promise.resolve(answer);
    };
  }
  readers.getAppOpenedAt = () => "2026-11-24T12:00:00.000Z";
  readers.getBackupPrompt = () => (overrides.getBackupPrompt as unknown) ?? null;
  return { readers: readers as unknown as TodayReaders, calls };
}

const NOW = () => new Date("2026-11-24T12:00:00.000Z");

describe("readTodaySnapshot (TODAY's one read)", () => {
  it("with no day, reads only what isn't day-scoped and reports the empty first read", async () => {
    const { readers, calls } = fakeReaders({ getOpenCaptureItems: [{ id: "cap-1" }], getAdvisoryNotes: [{ id: "n-1" }] });
    const onDayRead = vi.fn();
    const snap = await readTodaySnapshot(NOW, { readers, onDayRead });
    expect(onDayRead).toHaveBeenCalledWith(null, null);
    expect(snap.day).toBeNull();
    expect(snap.checkIn).toBeNull();
    expect(snap.recommendation).toBeNull();
    expect(snap.openCaptureItems).toEqual([{ id: "cap-1" }]);
    expect(snap.advisoryNotes).toEqual([{ id: "n-1" }]);
    expect(snap.yesterdayRecorded).toBeNull();
    expect(snap.schedulePattern).toBeNull();
    expect(snap.tonight).toBeNull();
    expect(calls).not.toContain("getLatestCheckIn");
    expect(calls).not.toContain("getRecordedYesterday");
  });

  it("with a day, a check-in and a recommendation, reads them all into the snapshot", async () => {
    const { readers } = fakeReaders({
      getActiveDay: DAY,
      getLatestCheckIn: CHECK_IN,
      getLatestRecommendation: REC,
      getRecommendationDecision: { kind: "ACCEPTED" },
      getRecommendationHandoff: "TRAIN",
      getRecommendationMemory: { lesson: { text: "lesson" }, pending: { id: "j-1" } },
      wasRecommendationMateriallyRepeated: true,
      getEffectiveHydrationTotal: 40,
      getHydrationEntries: [{ effectiveAmountOz: 16 }, { effectiveAmountOz: 24 }],
      getDayProteinTotalG: 90,
      getMostRecentBodyweight: 201,
      getWorkPeriodStarted: { occurredAt: "2026-11-24T11:00:00.000Z" },
      getSleepEntries: [{ kind: "PRIMARY", recordedAt: "a" }, { kind: "NAP", recordedAt: "b" }],
      getLastMainSleep: { minutes: 380, fromGarmin: true },
      getNutritionTargets: { waterTargetOz: 100 },
      getEffectiveProteinTargetG: 180,
      getSchedulePattern: { kind: "pattern" },
      getBackupPrompt: { kind: "BACKUP_DUE", daysSinceLastBackup: 9 },
    });
    const snap = await readTodaySnapshot(NOW, { readers });
    expect(snap.day).toEqual(DAY);
    expect(snap.checkIn).toEqual(CHECK_IN);
    expect(snap.recommendation).toEqual(REC);
    expect(snap.decision).toEqual({ kind: "ACCEPTED" });
    expect(snap.recommendationHandoff).toBe("TRAIN");
    expect(snap.rememberedLesson).toEqual({ text: "lesson" });
    expect(snap.pendingReflection).toEqual({ id: "j-1" });
    expect(snap.materiallyRepeated).toBe(true);
    expect(snap.minimumDayHydrateOz).toBe(40);
    expect(snap.lastWaterAmount).toBe(24);
    expect(snap.waterLogCount).toBe(2);
    expect(snap.minimumDayProteinG).toBe(90);
    expect(snap.latestWeightLbs).toBe(201);
    expect(snap.workPeriodStartedAt).toBe("2026-11-24T11:00:00.000Z");
    expect(snap.mainSleepRecordedAt).toEqual(["a"]);
    expect(snap.lastMainSleepMinutes).toBe(380);
    expect(snap.lastMainSleepFromGarmin).toBe(true);
    expect(snap.waterTargetOz).toBe(100);
    expect(snap.proteinTargetG).toBe(180);
    expect(snap.schedulePattern).toEqual({ kind: "pattern" });
    expect(snap.backupDue).toEqual({ days: 9 });
    expect(snap.yesterdayRecorded?.kind).toBe("WORK");
    expect(snap.yesterdayRecorded?.dayBefore).toBe("OFF");
  });

  it("carries an open RESET", async () => {
    const openReset = { eventId: "r-1", intensity: 4, startedAt: "2026-11-24T11:30:00.000Z" };
    const { readers } = fakeReaders({ getActiveDay: DAY, getOpenReset: openReset });
    const snap = await readTodaySnapshot(NOW, { readers });
    expect(snap.openReset).toEqual(openReset);
    expect(snap.openShiftDown).toBeUndefined();
  });

  it("carries an open SHIFT DOWN", async () => {
    const openShiftDown = { eventId: "s-1", durationMinutes: 20, startedAt: "2026-11-24T11:40:00.000Z" };
    const { readers } = fakeReaders({ getActiveDay: DAY, getOpenShiftDown: openShiftDown });
    const snap = await readTodaySnapshot(NOW, { readers });
    expect(snap.openShiftDown).toEqual(openShiftDown);
    expect(snap.openReset).toBeUndefined();
  });

  it("leaves a failed optional read out, as TODAY always did", async () => {
    const boom = new Error("read failed");
    const { readers } = fakeReaders({
      getActiveDay: DAY,
      getLatestRecommendation: REC,
      getRecommendationMemory: boom,
      getSystemStatus: boom,
      getLastMainSleep: boom,
      getNutritionTargets: boom,
      getTonightState: boom,
      getEarlyDayStart: boom,
      getWeekAhead: boom,
      getLivedDayMap: boom,
      getShiftSleepPlan: boom,
      getSchedulePattern: boom,
    });
    const snap = await readTodaySnapshot(NOW, { readers });
    expect(snap.recommendation).toEqual(REC);
    expect(snap.rememberedLesson).toBeNull();
    expect(snap.systemStatus).toBeNull();
    expect(snap.lastMainSleepMinutes).toBeNull();
    expect(snap.waterTargetOz).toBeUndefined();
    expect(snap.tonight).toBeNull();
    expect(snap.earlyStart).toBeNull();
    expect(snap.yesterdayRecorded?.week).toBeNull();
    expect(snap.yesterdayRecorded?.map).toEqual([]);
    expect(snap.schedulePattern).toBeNull();
  });

  it("rejects when a required read fails, after the first read was reported", async () => {
    const { readers } = fakeReaders({ getActiveDay: DAY, getOpenCaptureItems: new Error("capture failed") });
    const onDayRead = vi.fn();
    await expect(readTodaySnapshot(NOW, { readers, onDayRead })).rejects.toThrow("capture failed");
    expect(onDayRead).toHaveBeenCalledTimes(1);
  });

  it("rejects without reporting the first read when the first read fails", async () => {
    const { readers } = fakeReaders({ getActiveDay: new Error("no db") });
    const onDayRead = vi.fn();
    await expect(readTodaySnapshot(NOW, { readers, onDayRead })).rejects.toThrow("no db");
    expect(onDayRead).not.toHaveBeenCalled();
  });

  it("reports the first read before any other read starts", async () => {
    const { readers, calls } = fakeReaders({ getActiveDay: DAY });
    let callsAtDayRead: string[] = [];
    await readTodaySnapshot(NOW, { readers, onDayRead: () => { callsAtDayRead = [...calls]; } });
    expect(callsAtDayRead.sort()).toEqual(["getActiveDay", "getActiveWorkoutSession"]);
  });
});

describe("installTodaySnapshot (what refresh() installs over what TODAY shows)", () => {
  const prev: TodaySnapshot = {
    ...EMPTY_TODAY_SNAPSHOT,
    day: DAY,
    checkIn: CHECK_IN as unknown as TodaySnapshot["checkIn"],
    recommendation: REC as unknown as TodaySnapshot["recommendation"],
    decision: { kind: "ACCEPTED" } as unknown as TodaySnapshot["decision"],
    schedulePattern: { kind: "old" } as unknown as TodaySnapshot["schedulePattern"],
    systemStatus: { kind: "old" } as unknown as TodaySnapshot["systemStatus"],
    minimumDayHydrateOz: 30,
    lastWaterAmount: 12,
  };

  it("starts from TODAY's first values before any read", () => {
    const next = { ...EMPTY_TODAY_SNAPSHOT, openCaptureItems: [{ id: "c" }] as unknown as TodaySnapshot["openCaptureItems"] };
    expect(installTodaySnapshot(null, next, { isOwner: true })).toEqual(next);
  });

  it("a superseded refresh never installs the day, the System Status line or the schedule", () => {
    const otherDay = { ...DAY, id: "day-2" };
    const next = { ...prev, day: otherDay, schedulePattern: { kind: "new" }, systemStatus: { kind: "new" }, minimumDayHydrateOz: 50 } as unknown as TodaySnapshot;
    const out = installTodaySnapshot(prev, next, { isOwner: false });
    expect(out.day).toBe(DAY);
    expect(out.schedulePattern).toEqual({ kind: "old" });
    expect(out.systemStatus).toEqual({ kind: "old" });
    // The rest of this refresh's own read still lands, as before.
    expect(out.minimumDayHydrateOz).toBe(50);
  });

  it("with no active day, keeps the day-scoped reads but clears the recommendation, decision and hand-off", () => {
    const next = { ...EMPTY_TODAY_SNAPSHOT };
    const out = installTodaySnapshot(prev, next, { isOwner: true });
    expect(out.day).toBeNull();
    expect(out.checkIn).toEqual(CHECK_IN);
    expect(out.minimumDayHydrateOz).toBe(30);
    expect(out.recommendation).toBeNull();
    expect(out.decision).toBeUndefined();
    expect(out.recommendationHandoff).toBeNull();
    // Not day-scoped: always this read's value.
    expect(out.lastWaterAmount).toBeNull();
  });

  it("a failed schedule read keeps the schedule TODAY already had", () => {
    const next = { ...prev, schedulePattern: null };
    expect(installTodaySnapshot(prev, next, { isOwner: true }).schedulePattern).toEqual({ kind: "old" });
  });
});
