import { useEffect, useState } from "react";
import { getAskSummary, type AskCountSettings } from "../../../application/askCounts";
import type { AskSummary } from "../../../engine/askSummary";
import "./askingLess.css";

/**
 * GRAYSON-ASKS-COUNT-001 (Gavin, 2026-11-24): "Asking less, measured". How many questions GRAYSON put to him per area,
 * the last 4 weeks against the 4 before, and the three asked most. It measures the app, not him: words only, no
 * colour, arrow, percentage, score or total across areas.
 */
const KEY_WORDS: Record<string, string> = {
  "checkin.energy": "Energy in the check-in", "checkin.stress": "Stress in the check-in", "checkin.mood": "Mood in the check-in",
  "checkin.soreness": "Soreness in the check-in", "checkin.alcoholUrge": "Urge in the check-in",
  "catchup.meal": "A meal to catch up after a shift", "catchup.water": "Water to catch up after a shift",
  "reflect.whyNot": "Why not, after you passed on a call", "journal.howItWent": "How did it go, for a past decision",
  "recovery.contract": "The recovery contract offer", "logNudge": "The logging nudge",
  "healthImport.sleep": "Confirming a sleep import", "healthImport.activity": "Confirming a steps and heart rate import",
  "schedule.exception.confirm": "Confirming a schedule change", "delta.learning": "Answering one of Delta's learnings",
};
/** Plain words for a key: known ones by name, close prompts and sleep-plan cards by their part. */
export function askWords(key: string): string {
  if (KEY_WORDS[key]) return KEY_WORDS[key]!;
  if (key.startsWith("close.prompt.")) return `Close-the-day prompt: ${key.slice("close.prompt.".length).toLowerCase().replace(/_/g, " ")}`;
  if (key.startsWith("sleepPlan.")) return `Saving a sleep-plan card: ${key.slice("sleepPlan.".length).toLowerCase().replace(/_/g, " ")}`;
  return key;
}
const dateWords = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });

export function AskingLessPanel() {
  const [data, setData] = useState<{ settings: AskCountSettings; summary: AskSummary } | null | "ERROR">(null);
  useEffect(() => {
    let live = true;
    void getAskSummary().then((d) => { if (live) setData(d); }, () => { if (live) setData("ERROR"); });
    return () => { live = false; };
  }, []);
  if (data === null || (data !== "ERROR" && !data.settings.showPanel)) return null;
  return <section className="weekly-dashboard__panel asking-less" aria-labelledby="asking-less-heading" data-asking-less>
    <h3 id="asking-less-heading" className="tool-label">ASKING LESS · LAST 4 WEEKS</h3>
    <p className="meta">Questions GRAYSON put to you. This measures the app, not you.</p>
    {data === "ERROR" ? <p className="meta" role="status">The counts couldn't be read. Nothing changed.</p> : <>
      {!data.settings.on && <p className="meta">Counting is off.</p>}
      {data.summary.state === "EMPTY" && data.settings.on && <p className="meta">Nothing counted yet. Questions are counted when they're shown.</p>}
      {data.summary.state === "LEARNING" && <p className="meta">Counting started {dateWords(data.summary.startedOn)}. A comparison needs 8 weeks.</p>}
      {data.summary.state === "READY" && <ul className="asking-less__areas">
        {data.summary.areas.map((a) => <li key={a.area} className="asking-less__row" data-area={a.area}>
          <span className="asking-less__area">{a.area}</span>
          <span>{a.recent} in the last 4 weeks · {a.previous} the 4 before · {a.change}</span>
        </li>)}
      </ul>}
      {data.summary.state !== "EMPTY" && data.summary.top.length > 0 && <>
        <p className="asking-less__label">Asked most</p>
        <ul className="asking-less__top">{data.summary.top.map((t) => <li key={t.key}>{askWords(t.key)}, {t.count} {t.count === 1 ? "time" : "times"}</li>)}</ul>
      </>}
    </>}
  </section>;
}
