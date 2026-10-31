import { db } from "../../persistence/db";
import { newId } from "../commands";
import { formatLocalDate } from "../../engine/scheduledContext";
import { getDays } from "./alfredSearch";
import type { AlfredReview } from "../../domain/alfred/types";

/**
 * ALFRED-006 (owner go 2026-10-31, the fifteen ideas' "weekly review": "Saved in your history so you
 * can compare weeks"): Alfred writes one review per Monday–Sunday week, once that week's last lived
 * day (Sunday 16:30 → Monday 16:30) is over, and BEYOND keeps it.
 */
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

/** The most recent finished Monday–Sunday week, by lived-day start dates. */
export function lastFinishedWeek(now = new Date()): { start: string; end: string } {
  // The lived day that began on Sunday ends at Monday 16:30.
  const livedToday = now.getHours() * 60 + now.getMinutes() < 16 * 60 + 30 ? addDays(now, -1) : now;
  const sinceMonday = (livedToday.getDay() + 6) % 7; // 0 on Monday
  const thisMonday = addDays(livedToday, -sinceMonday);
  return { start: formatLocalDate(addDays(thisMonday, -7)), end: formatLocalDate(addDays(thisMonday, -1)) };
}

export async function getReview(weekStart: string): Promise<AlfredReview | undefined> {
  return db.alfredReviews.where("weekStart").equals(weekStart).first();
}

export async function listReviews(): Promise<AlfredReview[]> {
  return (await db.alfredReviews.orderBy("weekStart").toArray()).reverse();
}

export async function saveReview(week: { start: string; end: string }, text: string): Promise<AlfredReview> {
  const existing = await getReview(week.start);
  if (existing) return existing; // one per week
  const review: AlfredReview = { id: newId(), weekStart: week.start, weekEnd: week.end, text, writtenAt: new Date().toISOString() };
  await db.alfredReviews.add(review);
  return review;
}

/** What Alfred reads for a week's review: that week and the one before. Null when the week has no days. */
export async function reviewContext(week: { start: string; end: string }): Promise<string | null> {
  const prevStart = formatLocalDate(addDays(new Date(`${week.start}T12:00:00`), -7));
  const prevEnd = formatLocalDate(addDays(new Date(`${week.start}T12:00:00`), -1));
  const thisWeek = await getDays(week.start, week.end);
  if (thisWeek.startsWith("No BEYOND days")) return null;
  return `THE WEEK (${week.start} → ${week.end}):\n${thisWeek}\n\nTHE WEEK BEFORE (${prevStart} → ${prevEnd}):\n${await getDays(prevStart, prevEnd)}`;
}

export const weekLabel = (week: { start: string; end: string }) => {
  const f = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${f(week.start)}–${f(week.end)}`;
};
