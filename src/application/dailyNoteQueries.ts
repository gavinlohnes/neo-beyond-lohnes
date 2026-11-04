import { db } from "../persistence/db";
import type { DailyNote, WikiTarget } from "../domain/dailyNotes";
import { getActiveDay } from "./queries";
import { getProjectViews } from "./projectQueries";
import { getPeopleView } from "./peopleCommands";
import { getDecisionJournalEntries } from "./journalQueries";

export const wikiLabels = (text: string): string[] => [...text.matchAll(/\[\[([^\]\n]{1,120})\]\]/g)]
  .map((match) => match[1]!.trim()).filter(Boolean);

export async function getDailyNote(dayId: string): Promise<DailyNote | undefined> {
  return db.dailyNotes.get(dayId);
}

export async function getDailyNoteWorkspace(dayId?: string) {
  const day = dayId ? await db.beyondDays.get(dayId) : await getActiveDay();
  if (!day) return null;
  const [note, events] = await Promise.all([
    getDailyNote(day.id),
    db.events.where("beyondDayId").equals(day.id).sortBy("occurredAt"),
  ]);
  return { day, note, logs: events.map((event) => ({ id: event.id, label: event.type.replaceAll("_", " ").toLowerCase(), at: event.occurredAt })) };
}

function personNames(view: Awaited<ReturnType<typeof getPeopleView>>): string[] {
  const fromDates = view.upcoming.map(({ reminder }) => reminder.title.replace(/^[^:]+:\s*/, "").replace(/\s+—.*$/, "").trim());
  const fromFacts = view.facts.map((fact) => fact.text.match(/^([^:—-]{1,80})/)?.[1]?.trim() ?? "");
  return [...new Set([...fromDates, ...fromFacts].filter(Boolean))];
}

/** Shared resolver: A6 can add COLLECTION_ITEM targets without changing stored link text. */
export async function getWikiTargets(query = ""): Promise<WikiTarget[]> {
  const [people, projects, days] = await Promise.all([getPeopleView(), getProjectViews(), db.beyondDays.orderBy("startedAt").reverse().toArray()]);
  const targets: WikiTarget[] = [
    ...personNames(people).map((label) => ({ kind: "PERSON" as const, id: label.toLowerCase(), label })),
    ...projects.map(({ project }) => ({ kind: "PROJECT" as const, id: project.id, label: project.title })),
    ...days.map((day) => ({ kind: "DAY" as const, id: day.id, label: day.startedAt.slice(0, 10) })),
  ];
  const needle = query.trim().toLowerCase();
  return targets.filter((target, index) => (!needle || target.label.toLowerCase().includes(needle))
    && targets.findIndex((item) => item.kind === target.kind && item.label.toLowerCase() === target.label.toLowerCase()) === index).slice(0, 12);
}

export async function getMentions(label: string) {
  const needle = label.trim().toLowerCase();
  const [notes, journal, days] = await Promise.all([db.dailyNotes.toArray(), getDecisionJournalEntries(), db.beyondDays.toArray()]);
  const dayDates = new Map(days.map((day) => [day.id, day.startedAt.slice(0, 10)]));
  const has = (text: string) => wikiLabels(text).some((item) => item.toLowerCase() === needle);
  return [
    ...notes.filter((note) => has(note.text)).map((note) => ({ kind: "DAY" as const, id: note.dayId, label: dayDates.get(note.dayId) ?? note.dayId })),
    ...journal.filter((entry) => [entry.title, entry.context, entry.options, entry.decision, entry.reasoning, entry.expectation, entry.outcome, entry.lesson]
      .some((text) => text && has(text))).map((entry) => ({ kind: "JOURNAL" as const, id: entry.id, label: entry.title })),
  ];
}
