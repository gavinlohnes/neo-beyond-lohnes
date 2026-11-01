import { getDaySummaries } from "../dayLedgerQueries";
import { getActiveDay } from "../queries";
import { getWeekAhead, getWeekTasks } from "../weekAheadQueries";
import { searchRecords } from "../alfred/alfredSearch";
import { getMemories } from "../alfred/alfredMemory";
import { getMonthSpend } from "../alfred/alfredSpend";
import { formatLocalDate } from "../../engine/scheduledContext";
import * as chrono from "chrono-node";

/**
 * FREE-HELPER-001: plain questions answered straight from his records, free and offline. Read-only.
 * Every answer says where its numbers come from and how many days stand behind them; a missing log
 * is said to be missing, never read as zero. Anything it doesn't recognise returns null, so the sheet
 * can offer Alfred instead. No advice, no judgments: the facts only.
 */

const hm = (min: number) => `${Math.floor(min / 60)}h ${String(Math.round(min % 60)).padStart(2, "0")}m`;
const day = (iso: string) => new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
const STOP = new Set(["what", "whats", "what's", "is", "my", "the", "a", "an", "of", "for", "when", "where", "who", "which", "do", "does", "did", "i", "me", "how", "size", "number", "are", "was", "s", "to", "in", "on", "it", "and"]);

async function today() {
  const [active, summaries] = await Promise.all([getActiveDay(), getDaySummaries()]);
  return active ? summaries.find((s) => s.beyondDayId === active.id) ?? null : null;
}

export async function answerQuestion(text: string, now = new Date()): Promise<string | null> {
  const q = text.toLowerCase().replace(/[?!.]+$/, "").trim();

  if (/\b(water|hydrat)/.test(q) && /\b(today|so far|how much|how many)\b/.test(q)) {
    const t = await today();
    if (!t) return "No day is started yet, so there's no water to count.";
    return t.waterOz ? `Water today: ${Math.round(t.waterOz)} oz.` : "No water logged today yet.";
  }
  if (/\bprotein\b/.test(q) && !/\byesterday\b/.test(q)) {
    const t = await today();
    if (!t) return "No day is started yet.";
    return t.proteinG !== undefined ? `Protein today: ${Math.round(t.proteinG)} g.` : "No food logged today yet.";
  }
  if (/\b(calories|kcal|cals)\b/.test(q) && !/\byesterday\b/.test(q)) {
    const t = await today();
    if (!t) return "No day is started yet.";
    return t.kcal !== undefined ? `Calories today: ${Math.round(t.kcal)} kcal.` : "No food logged today yet.";
  }
  if (/\byesterday\b/.test(q) && /\b(eat|ate|food|calories|protein)\b/.test(q)) {
    const days = [...(await getDaySummaries())].sort((a, b) => b.livedDayStart.localeCompare(a.livedDayStart));
    const y = days[1];
    if (!y) return "There's no earlier day recorded yet.";
    return y.kcal !== undefined || y.proteinG !== undefined
      ? `${day(y.livedDayStart)}: ${y.kcal !== undefined ? `${Math.round(y.kcal)} kcal` : "calories not logged"}, ${y.proteinG !== undefined ? `${Math.round(y.proteinG)} g protein` : "protein not logged"}.`
      : `${day(y.livedDayStart)}: no food logged.`;
  }
  if (/\b(sleep|slept)\b/.test(q)) {
    const days = [...(await getDaySummaries())].sort((a, b) => b.livedDayStart.localeCompare(a.livedDayStart));
    if (/\blast night\b|\blast sleep\b/.test(q)) {
      const d = days.find((s) => s.sleep.primaryMinutes !== undefined);
      return d ? `Last main sleep logged: ${hm(d.sleep.primaryMinutes!)} (${day(d.livedDayStart)}).` : "No main sleep logged yet.";
    }
    const week = days.slice(0, 7), logged = week.filter((s) => s.sleep.primaryMinutes !== undefined);
    if (!logged.length) return "No main sleep logged in the last 7 days.";
    const avg = logged.reduce((n, s) => n + s.sleep.primaryMinutes!, 0) / logged.length;
    return `Main sleep, last 7 days: average ${hm(avg)}, from ${logged.length} of ${week.length} days logged.`;
  }
  if (/\b(next shift|when do i work|am i working)\b/.test(q)) {
    const w = await getWeekAhead(now);
    const next = w.days.find((d) => d.work === "WORK" && (d.date > formatLocalDate(now) || now.getHours() < (d.shiftStartHour ?? 24)));
    return next ? `Next scheduled shift: ${day(next.date)}, ${String(next.shiftStartHour).padStart(2, "0")}:00. From your saved schedule.` : "No shift on your schedule in the next 7 days.";
  }
  if (/\b(due|planned|on for)\b/.test(q)) {
    const week = await getWeekTasks(now);
    const d = chrono.parse(q, now, { forwardDate: true })[0];
    const date = /\btoday\b/.test(q) ? formatLocalDate(now) : d && !/\bweek\b/.test(q) ? formatLocalDate(d.start.date()) : null;
    const days = date ? week.filter((x) => x.date === date) : week;
    const lines = days.flatMap((x) => [...x.planned.map((o) => `${day(x.date)}: ${o.title} (planned)`), ...x.due.map((o) => `${day(x.date)}: ${o.title} (due)`)]);
    if (date && !week.some((x) => x.date === date)) return null;
    return lines.length ? lines.join("\n") : date ? `Nothing planned or due on ${day(date)}.` : "Nothing planned or due in the next 7 days.";
  }
  if (/\b(spent|spend|cost)\b/.test(q) && /\b(alfred|claude|ai)\b/.test(q)) {
    return `Alfred this month: about $${getMonthSpend(now).toFixed(2)} (BEYOND's estimate; the Anthropic console has the real bill).`;
  }
  const last = q.match(/^when did i last (.+)$/);
  if (last) {
    const term = last[1]!.replace(/^(log|have|do|eat|go|train|hit)\s+/, "").replace(/\b(a|an|the|my)\b/g, " ").trim();
    if (!term) return null;
    const found = await searchRecords(term, 1);
    if (found.startsWith("No records match")) return `No record mentions "${term}".`;
    const first = found.split("\n")[1];
    return first ? `Newest record mentioning "${term}": ${first}` : null;
  }
  // Lookups in what he asked Alfred to remember ("filter size?", "Sam's birthday?", "locker number?").
  const words = q.replace(/'s\b/g, "").split(/[^a-z0-9]+/).filter((w) => w.length > 1 && !STOP.has(w));
  if (words.length && words.length <= 4) {
    const memories = await getMemories();
    const hits = memories.filter((m) => words.every((w) => m.text.toLowerCase().includes(w.endsWith("s") ? w.slice(0, -1) : w)));
    if (hits.length) return hits.slice(0, 3).map((m) => `${m.text} (saved ${day(m.savedAt)})`).join("\n");
  }
  return null;
}
