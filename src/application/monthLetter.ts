import { SLEEP_NEED_MINUTES, type MonthDay } from "./monthQueries";

/**
 * MONTH-LETTER-001 (big-list idea 25, Day One's monthly summary): the month, written as a short plain letter
 * from what was recorded. Deterministic and read only. Every line rests on logged days and says how many;
 * a measure with nothing logged reads "not recorded", never zero. No score, streak, praise or advice.
 * Alfred can write a warmer version, but only when asked by a tap (see CaveMonth).
 */
export interface MonthLetter { title: string; lines: string[]; daysLogged: number }

const hm = (m: number) => `${Math.floor(m / 60)}h ${String(Math.round(m % 60)).padStart(2, "0")}m`;
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

export function writeMonthLetter(year: number, month: number, days: readonly MonthDay[], now = new Date()): MonthLetter {
  const name = new Date(year, month, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const inProgress = now.getFullYear() === year && now.getMonth() === month;
  const logged = days.filter((d) => d.dayId);
  const title = inProgress ? `${name}, so far` : name;
  if (logged.length === 0) return { title, lines: ["Nothing was recorded this month."], daysLogged: 0 };

  const work = logged.filter((d) => d.work === "WORK").length, off = logged.filter((d) => d.work === "OFF").length;
  const unset = logged.length - work - off;
  // Only the kinds that occurred: never "0 days off" for days whose context simply wasn't set.
  const kinds = [work ? plural(work, "work day") : "", off ? `${plural(off, "day")} off` : "", work || off ? (unset ? `${unset} with no work or off set` : "") : ""].filter(Boolean);
  const lines = [`You recorded ${plural(logged.length, "day")}${kinds.length ? `: ${kinds.join(", ").replace(/, ([^,]*)$/, kinds.length > 1 ? " and $1" : ", $1")}` : ""}.`];

  const sleep = logged.flatMap((d) => (d.sleepMinutes === undefined ? [] : [d.sleepMinutes]));
  lines.push(sleep.length
    ? `Sleep, on ${plural(sleep.length, "logged day")}: ${hm(avg(sleep))} on average; ${plural(sleep.filter((m) => m < SLEEP_NEED_MINUTES).length, "night")} under ${SLEEP_NEED_MINUTES / 60} hours.`
    : "Sleep: not recorded.");

  const protein = logged.flatMap((d) => (d.proteinG === undefined ? [] : [d.proteinG]));
  lines.push(protein.length ? `Protein, on ${plural(protein.length, "logged day")}: ${Math.round(avg(protein))} g on average.` : "Protein: not recorded.");

  const trainedDays = logged.filter((d) => d.workouts > 0).length, workouts = logged.reduce((n, d) => n + d.workouts, 0);
  lines.push(workouts ? `Training: ${plural(workouts, "workout")} on ${plural(trainedDays, "day")}.` : "Training: no workouts recorded.");

  const urges = logged.reduce((n, d) => n + d.urges, 0), clean = logged.filter((d) => d.clean).length;
  if (urges || clean) lines.push(`${plural(clean, "clean day")}${urges ? `, ${plural(urges, "urge")} logged` : ""}.`);

  return { title, lines, daysLogged: logged.length };
}

/** What a tap on "Ask Alfred to write it" sends: the plain letter plus how to write it. */
export function monthLetterAsk(letter: MonthLetter): string {
  return `Write me a short letter about ${letter.title}, in plain words, from these recorded facts and get_days for the month. Keep every number exactly as given, say what wasn't recorded, and end with one thing worth noticing — no praise, guilt or streaks.\n\n${letter.lines.join("\n")}`;
}
