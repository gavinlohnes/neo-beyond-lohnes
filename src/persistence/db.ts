import Dexie, { type Table } from "dexie";
import type {
  BeyondDay,
  DomainEvent,
  Recommendation,
  StateCheckIn,
} from "../domain/common/types";

export class BeyondDB extends Dexie {
  beyondDays!: Table<BeyondDay, string>;
  events!: Table<DomainEvent, string>;
  checkIns!: Table<StateCheckIn, string>;
  recommendations!: Table<Recommendation, string>;

  constructor() {
    super("beyond");
    this.version(1).stores({
      beyondDays: "id, status, startedAt",
      events: "id, beyondDayId, type, occurredAt",
      checkIns: "id, beyondDayId, recordedAt",
      recommendations: "id, beyondDayId, issuedAt",
    });
  }
}

export const db = new BeyondDB();
