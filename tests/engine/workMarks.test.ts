import { describe, expect, it } from "vitest";
import { effectiveWorkMarks } from "../../src/engine/workMarks";
import type { DomainEvent } from "../../src/domain/common/types";

/** SHIFT-CORRECT-001: the effective work marks of a lived day, pure. Invented data. */
let seq = 0;
const ev = (type: DomainEvent["type"], occurredAt: string, payload: Record<string, unknown> = {}, id = `e${seq + 1}`): DomainEvent =>
  ({ id, type, occurredAt, recordedAt: occurredAt, seq: ++seq, beyondDayId: "d1", source: "USER", correlationId: id, payload } as unknown as DomainEvent);
const T = (h: number, m = 0) => new Date(Date.UTC(2026, 10, 15, h, m)).toISOString();

describe("effectiveWorkMarks", () => {
  it("no explicit mark means none; a mark stands as recorded", () => {
    seq = 0;
    expect(effectiveWorkMarks([])).toEqual({});
    const start = ev("WORK_PERIOD_STARTED", T(0, 2)), end = ev("WORK_PERIOD_ENDED", T(10, 20));
    const m = effectiveWorkMarks([end, start]);
    expect(m.started).toMatchObject({ eventId: start.id, occurredAt: T(0, 2), originalAt: T(0, 2), retimed: false });
    expect(m.ended).toMatchObject({ eventId: end.id, occurredAt: T(10, 20), retimed: false });
  });

  it("the latest retime naming a mark is its time; the original is kept", () => {
    seq = 0;
    const end = ev("WORK_PERIOD_ENDED", T(10, 20));
    const r1 = ev("WORK_PERIOD_RETIMED", T(12), { markEventId: end.id, mark: "ENDED", occurredAt: T(12) });
    const r2 = ev("WORK_PERIOD_RETIMED", T(12, 5), { markEventId: end.id, mark: "ENDED", occurredAt: T(11, 45) });
    expect(effectiveWorkMarks([r2, end, r1]).ended).toMatchObject({ occurredAt: T(11, 45), originalAt: T(10, 20), retimed: true });
  });

  it("a voided end reopens the shift; a later end is the effective one, and an old retime doesn't follow it", () => {
    seq = 0;
    const start = ev("WORK_PERIOD_STARTED", T(0));
    const first = ev("WORK_PERIOD_ENDED", T(10, 20));
    const retime = ev("WORK_PERIOD_RETIMED", T(10, 21), { markEventId: first.id, mark: "ENDED", occurredAt: T(10, 10) });
    const voided = ev("WORK_PERIOD_VOIDED", T(10, 22), { markEventId: first.id, mark: "ENDED" });
    expect(effectiveWorkMarks([start, first, retime, voided]).ended).toBeUndefined();
    const second = ev("WORK_PERIOD_ENDED", T(12));
    const m = effectiveWorkMarks([start, first, retime, voided, second]);
    expect(m.ended).toMatchObject({ eventId: second.id, occurredAt: T(12), retimed: false });
    expect(m.started?.eventId).toBe(start.id);
  });
});
