import { useId, useState, type KeyboardEvent } from "react";
import { MemoryPanel } from "../../components/MemoryPanel";
import { AlfredMemoryList } from "../../components/AlfredMemoryList";
import { RoutinesPanel } from "../../components/RoutinesPanel";
import { PeoplePanel } from "../../components/PeoplePanel";
import { HomePanel } from "../../components/HomePanel";
import { askAlfred } from "../../components/AlfredSheet";
import { IntentScreen } from "./IntentScreen";
import "../../components/alfred.css";

/**
 * LIFE-HUB-001 (owner go 2026-11-01, "go life hub"): everything that's "you" in one MORE destination.
 * Each tab is the existing screen for that area, unchanged; nothing moves in the data. Visited tabs
 * stay mounted (hidden) so an unfinished draft survives switching tabs.
 */
export const LIFE_TABS = ["Direction", "Plans", "Routines", "People", "Home", "Memory"] as const;
export type LifeTab = (typeof LIFE_TABS)[number];
const BLURB: Record<LifeTab, string> = {
  Direction: "What matters to you and what you're working around, in your own words.",
  Plans: "Missions, projects and the commitments under them.",
  Routines: "Your before, during and after shift routines.",
  People: "Birthdays and what to remember about the people who matter.",
  Home: "House facts and the jobs that come round.",
  Memory: "What BEYOND and Alfred keep for you.",
};

export function LifeScreen({ active, initialTab = "Direction" }: { active: boolean; initialTab?: LifeTab }) {
  const [tab, setTab] = useState<LifeTab>(initialTab);
  const [visited, setVisited] = useState<Set<LifeTab>>(() => new Set([initialTab]));
  const open = (next: LifeTab) => { setTab(next); setVisited((v) => (v.has(next) ? v : new Set([...v, next]))); };
  const on = (t: LifeTab) => active && tab === t;
  const uid = useId();
  // Review of #362: the WAI-ARIA tabs pattern. One Tab stop; arrows, Home and End move between tabs.
  function onKey(e: KeyboardEvent<HTMLButtonElement>) {
    const i = LIFE_TABS.indexOf(tab), last = LIFE_TABS.length - 1;
    const to = e.key === "ArrowRight" ? (i === last ? 0 : i + 1) : e.key === "ArrowLeft" ? (i === 0 ? last : i - 1) : e.key === "Home" ? 0 : e.key === "End" ? last : null;
    if (to === null) return;
    e.preventDefault();
    const next = LIFE_TABS[to]!;
    open(next);
    document.getElementById(`${uid}-tab-${next}`)?.focus();
  }

  return <section aria-labelledby="life-heading" className="life-screen">
    <h2 id="life-heading" className="visually-hidden">Life</h2>
    <div className="life-tabs" role="tablist" aria-label="Life areas">
      {LIFE_TABS.map((t) => <button key={t} type="button" role="tab" id={`${uid}-tab-${t}`} aria-selected={tab === t} aria-controls={`${uid}-panel-${t}`}
        tabIndex={tab === t ? 0 : -1} onKeyDown={onKey}
        className={`chip ${tab === t ? "chip--selected" : ""}`} onClick={() => open(t)}>{t}</button>)}
    </div>
    <p className="meta">{BLURB[tab]}</p>
    {LIFE_TABS.map((t) => <div key={t} role="tabpanel" id={`${uid}-panel-${t}`} aria-labelledby={`${uid}-tab-${t}`} hidden={tab !== t}>
      {visited.has(t) && <>
        {t === "Direction" && <>
          <MemoryPanel active={on(t)} scope="PERSONAL" />
          <button type="button" className="btn-secondary" onClick={() => askAlfred("Help me plan my next days off around what matters to me. Use my recorded schedule and commitments, say what is unknown, and offer a draft for me to choose from.")}>PLAN MY NEXT DAYS OFF</button>
        </>}
        {t === "Plans" && <IntentScreen active={on(t)} />}
        {t === "Routines" && <RoutinesPanel active={on(t)} />}
        {t === "People" && <PeoplePanel active={on(t)} />}
        {t === "Home" && <HomePanel active={on(t)} />}
        {t === "Memory" && <><MemoryPanel active={on(t)} /><AlfredMemoryList active={on(t)} /></>}
      </>}
    </div>)}
  </section>;
}
