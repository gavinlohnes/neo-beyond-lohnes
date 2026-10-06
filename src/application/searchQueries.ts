import MiniSearch from "minisearch";
import { db } from "../persistence/db";
import type { MealLoggedPayload, ShiftHandoffNotedPayload } from "../domain/common/types";
import type { PerformedSet } from "../domain/workout/types";
import { getMissions, getObligations } from "./intentQueries";
import { getAllCaptureItems } from "./queries";
import { describeRecordCard, getAllRecords } from "./personalRecordQueries";
import { getExerciseNames } from "./exerciseLibraryQueries";
import { getSavedMeals } from "./nutritionQueries";
import { getDecisionJournalEntries } from "./journalQueries";
import { getUndoneSetIds } from "./trainQueries";

/**
 * FIND-001 (owner brief 2026-10-05): search everything — lifts, PRs, meals,
 * journal entries, shift-handoff notes and History days join Missions,
 * Obligations and Capture. Example: "chest" returns the chest lift, every
 * chest PR, and each day a chest lift was trained. Still read only and
 * still rebuilt per call; sealed time capsules are never indexed.
 */
export type SearchResultDomain =
  | "MISSION"
  | "OBLIGATION"
  | "CAPTURE"
  | "LIFT"
  | "PR"
  | "MEAL"
  | "JOURNAL"
  | "NOTE"
  | "DAY";

export interface SearchResult {
  domain: SearchResultDomain;
  id: string;
  title: string;
  /** A secondary line of context — description snippet, or the capture's own status. Never a match explanation/score. */
  context: string | undefined;
  /** The record's own status where it has one (Missions, Obligations, Capture, journal); otherwise empty. */
  status: string;
  /** FIND-001: where a tap goes — the lift (LIFT, PR) or the History day (NOTE, DAY). */
  exerciseId?: string;
  dayId?: string;
}

/**
 * SEARCH-002: one MiniSearch document per searchable record. `id` is a
 * synthetic `${domain}-${entityId}` key (MiniSearch requires a single
 * unique id field; a Mission and a Capture could otherwise collide on
 * the same underlying id value) — `entityId` carries the real domain id
 * back out in the result, `id` itself is never shown to the operator.
 */
interface IndexedDoc {
  id: string;
  domain: SearchResultDomain;
  entityId: string;
  title: string;
  context: string;
  status: string;
  exerciseId?: string;
  dayId?: string;
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

/** FIND-001: lifts, PRs, meals, journal, handoff notes and History days, as search documents. */
async function trainingAndLifeDocs(): Promise<IndexedDoc[]> {
  const [names, records, meals, journal, days, sessions, undone, handoffs, mealEvents] = await Promise.all([
    getExerciseNames(),
    getAllRecords(),
    getSavedMeals({ includeArchived: true }),
    getDecisionJournalEntries(),
    db.beyondDays.toArray(),
    db.workoutSessions.toArray(),
    getUndoneSetIds(),
    db.events.where("type").equals("SHIFT_HANDOFF_NOTED").toArray(),
    db.events.where("type").equals("MEAL_LOGGED").toArray(),
  ]);
  const finished = new Map(
    sessions.filter((s) => s.status === "COMPLETED" || s.status === "PARTIAL").map((s) => [s.id, s] as const),
  );
  const sets = ((await db.performedSets.toArray()) as unknown as PerformedSet[]).filter(
    (s) => finished.has(s.sessionId) && !undone.has(s.id) && !s.skipped,
  );
  const liftName = (set: PerformedSet) => set.substitutedName ?? names[set.exerciseId] ?? set.exerciseId;

  // One LIFT per prescribed lift trained in a finished session (a substitute is its own movement, so it
  // is named on its days but doesn't get a lift of its own here — its curve lives under its slot).
  const liftSessions = new Map<string, Set<string>>();
  for (const set of sets) {
    if (set.substitutedName) continue;
    const ids = liftSessions.get(set.exerciseId) ?? new Set<string>();
    ids.add(set.sessionId);
    liftSessions.set(set.exerciseId, ids);
  }
  const docs: IndexedDoc[] = [];
  for (const [exerciseId, ids] of liftSessions) {
    const last = [...ids].map((id) => finished.get(id)!.startedAt).sort().at(-1)!;
    docs.push({
      id: `LIFT-${exerciseId}`,
      domain: "LIFT",
      entityId: exerciseId,
      title: names[exerciseId] ?? exerciseId,
      context: `${ids.size} ${ids.size === 1 ? "session" : "sessions"} · last ${shortDate(last)}`,
      status: "",
      exerciseId,
    });
  }
  for (const r of records) {
    docs.push({
      id: `PR-${r.setId}`,
      domain: "PR",
      entityId: r.setId,
      title: `${r.exerciseName} · ${describeRecordCard(r.record)}`,
      context: shortDate(r.recordedAt),
      status: "",
      exerciseId: r.exerciseId,
    });
  }
  for (const m of meals) {
    docs.push({
      id: `MEAL-${m.id}`,
      domain: "MEAL",
      entityId: m.id,
      title: m.name,
      context: `${m.calories} kcal · ${m.proteinG} g protein`,
      status: m.archivedAt ? "ARCHIVED" : "",
    });
  }
  for (const j of journal) {
    docs.push({
      id: `JOURNAL-${j.id}`,
      domain: "JOURNAL",
      entityId: j.id,
      title: j.title,
      context: [j.decision, j.lesson].filter(Boolean).join(" · "),
      status: j.status,
    });
  }
  for (const e of handoffs) {
    docs.push({
      id: `NOTE-${e.id}`,
      domain: "NOTE",
      entityId: e.id,
      title: (e.payload as ShiftHandoffNotedPayload).note,
      context: `Shift handoff · ${shortDate(e.occurredAt)}`,
      status: "",
      ...(e.beyondDayId ? { dayId: e.beyondDayId } : {}),
    });
  }
  // One DAY per BEYOND day, carrying the lifts trained, meals logged and handoff note, so a word like
  // "chest" finds every session it was trained in.
  for (const day of days) {
    const lifts = [...new Set(sets.filter((s) => finished.get(s.sessionId)!.beyondDayId === day.id).map(liftName))];
    const dayMeals = [
      ...new Set(mealEvents.filter((e) => e.beyondDayId === day.id).map((e) => (e.payload as MealLoggedPayload).name)),
    ];
    const notes = handoffs.filter((e) => e.beyondDayId === day.id).map((e) => (e.payload as ShiftHandoffNotedPayload).note);
    const parts = [lifts.length ? `Trained: ${lifts.join(", ")}` : "", dayMeals.length ? `Meals: ${dayMeals.join(", ")}` : "", ...notes];
    const context = parts.filter(Boolean).join(" · ");
    if (!context) continue;
    docs.push({ id: `DAY-${day.id}`, domain: "DAY", entityId: day.id, title: shortDate(day.startedAt), context, status: "", dayId: day.id });
  }
  return docs;
}

/**
 * Personal Search (Post-FIELD Capability Acceleration Campaign, Slice 2;
 * tap-to-navigate shipped 2026-09-02; MiniSearch upgrade, SEARCH-002,
 * 2026-09-15). RETRIEVAL, not command execution: fuzzy/prefix/ranked
 * lexical search over the durable operator-authored text this app
 * already has — Mission title/description, Obligation title/
 * description, Capture text — never a new source of truth.
 *
 * MiniSearch (MIT, zero runtime deps) replaces the original plain
 * substring scan per the pre-existing owner sign-off on file in
 * docs/agent/CAPABILITY_MAP.md's SEARCH entry — this was always the
 * intended "revisit" once ranking actually mattered, not a new
 * authorization. The index is fully disposable: rebuilt from scratch on
 * every call from the exact same already-validated, already-sorted
 * arrays their own screens render (getMissions/getObligations/
 * getAllCaptureItems) — nothing is ever persisted or cached across
 * calls, and Dexie/events remain the sole source of truth. Search
 * results include every status (including RESOLVED captures and
 * ARCHIVED missions) — retrieval answers "does this exist," not "is
 * this currently actionable"; that eligibility question belongs to
 * TODAY/AdvisoryNotes, not here.
 */
export async function searchAll(query: string): Promise<SearchResult[]> {
  const q = query.trim();
  if (q.length === 0) return [];

  const [missions, obligations, captures, more] = await Promise.all([
    getMissions(),
    getObligations(),
    getAllCaptureItems(),
    trainingAndLifeDocs(),
  ]);

  const docs: IndexedDoc[] = [
    ...missions.map((m): IndexedDoc => ({
      id: `MISSION-${m.id}`,
      domain: "MISSION",
      entityId: m.id,
      title: m.title,
      context: m.description ?? "",
      status: m.status,
    })),
    ...obligations.map((o): IndexedDoc => ({
      id: `OBLIGATION-${o.id}`,
      domain: "OBLIGATION",
      entityId: o.id,
      title: o.title,
      context: o.description ?? "",
      status: o.status,
    })),
    ...captures.map((c): IndexedDoc => ({
      id: `CAPTURE-${c.id}`,
      domain: "CAPTURE",
      entityId: c.id,
      title: c.text,
      context: "",
      status: c.status,
    })),
    ...more,
  ];

  const index = new MiniSearch<IndexedDoc>({
    fields: ["title", "context"],
    storeFields: ["domain", "entityId", "title", "context", "status", "exerciseId", "dayId"],
  });
  index.addAll(docs);

  // fuzzy: 0.2 tolerates roughly one typo per five characters — enough to
  // survive a small slip without matching genuinely unrelated terms.
  // boost on title outranks a match that only hit the description/
  // context field, so the closer match surfaces first.
  const hits = index.search(q, { fuzzy: 0.2, prefix: true, boost: { title: 2 } });

  return hits.map((hit) => ({
    domain: hit.domain as SearchResultDomain,
    id: hit.entityId as string,
    title: hit.title as string,
    context: (hit.context as string) || undefined,
    status: hit.status as string,
    ...(hit.exerciseId ? { exerciseId: hit.exerciseId as string } : {}),
    ...(hit.dayId ? { dayId: hit.dayId as string } : {}),
  }));
}
