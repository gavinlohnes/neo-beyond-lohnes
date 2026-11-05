import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, BookOpen, CalendarDays, CirclePlay, Compass, Dumbbell, Heart, House, Layers, Plus, RefreshCw, Users } from "lucide-react";
import { getWholeLife, type WholeLife } from "../../../application/wholeLifeQueries";
import { routineEstimate } from "../../../application/routinePlayer";
import type { Routine } from "../../../domain/routines";
import type { SystemDestination } from "../../systemCatalog";
import type { LifeTab } from "./LifeScreen";
import { RoutinePlayer } from "../../components/RoutinePlayer";
import { stepKey } from "../../../application/routineCommands";
import "./wholeLife.css";

export interface WholeLifeActions {
  onArea: (area: LifeTab) => void;
  onNavigate?: ((destination: SystemDestination) => void) | undefined;
  onTask?: ((id: string) => void) | undefined;
}
const shortDate = (date: string) => {
  const value = new Date(`${date}T12:00:00`);
  return value.toLocaleDateString(undefined, { month: "short", day: "numeric", ...(value.getFullYear() !== new Date().getFullYear() ? { year: "numeric" as const } : {}) });
};
const dateKey = () => new Date().toLocaleDateString();
function Unavailable() { return <p className="wl-unavailable">Records unavailable. Refresh to try again.</p>; }

export function WholeLifeHome({ active, onArea, onNavigate, onTask, idPrefix }: WholeLifeActions & { active: boolean; idPrefix: string }) {
  const [data, setData] = useState<WholeLife | null>(null);
  const [reading, setReading] = useState(false);
  const [playing, setPlaying] = useState<Routine | null>(null);
  const sequence = useRef(0);
  const [period, setPeriod] = useState<"today" | "next7">("today");
  async function refresh() {
    const request = ++sequence.current;
    setReading(true);
    const next = await getWholeLife();
    if (request === sequence.current) { setData(next); setReading(false); }
  }
  useEffect(() => {
    if (!active) { setPlaying(null); return; }
    void refresh();
    let date = dateKey();
    const resume = () => { if (document.visibilityState === "visible") void refresh(); };
    const timer = globalThis.setInterval(() => { const current = dateKey(); if (current !== date) { date = current; void refresh(); } }, 60_000);
    document.addEventListener("visibilitychange", resume);
    globalThis.addEventListener("beyond:routines-changed", resume);
    return () => { ++sequence.current; globalThis.clearInterval(timer); document.removeEventListener("visibilitychange", resume); globalThis.removeEventListener("beyond:routines-changed", resume); };
  }, [active]);
  const navigate = (destination: SystemDestination) => onNavigate?.(destination);
  const plan = data?.plan.state === "ready" ? data.plan.value : null;
  const projects = data?.projects.state === "ready" ? data.projects.value.filter(({ project }) => project.status === "ACTIVE" || project.status === "PAUSED") : null;
  const routines = data?.routines.state === "ready" ? data.routines.value.filter((r) => r.status === "ACTIVE") : null;
  const note = data?.note.state === "ready" ? data.note.value : null;
  const workout = data?.workout.state === "ready" ? data.workout.value : null;
  const progress = data?.routineProgress.state === "ready" ? data.routineProgress.value : null;
  const date = new Date(data?.readAt ?? Date.now());
  const greeting = date.getHours() < 5 ? "Room for the rest of you." : date.getHours() < 12 ? "Make room for your life." : date.getHours() < 18 ? "Your day. Your direction." : "Bring your day together.";
  return <><div className="whole-life" aria-label="Your life">
    <header className="wl-masthead"><span>BEYOND / LIFE</span><button type="button" onClick={() => void refresh()} disabled={reading} aria-label="Refresh your life"><RefreshCw size={18} /><span>{reading ? "Reading" : "Refresh"}</span></button></header>
    <section className="wl-hero" aria-labelledby={`${idPrefix}-title`}>
      <p className="wl-eyebrow">{date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</p>
      <h2 id={`${idPrefix}-title`} tabIndex={-1}>YOUR LIFE.<br /><span>IN MOTION.</span></h2>
      <p className="wl-intro">{greeting}</p>
      <div className="wl-hero-actions"><button type="button" aria-label="Capture a thought" disabled={!onNavigate} onClick={() => navigate({ kind: "capture" })}><Plus size={20} /> Capture</button><button type="button" onClick={() => onArea("Direction")}><Compass size={20} /> My direction</button></div>
    </section>
    <nav className="wl-area-nav" aria-label="Life shortcuts">{(["Plans", "Routines", "Habits", "People", "Home", "Memory"] as const).map((area) => <button type="button" key={area} onClick={() => onArea(area)}>{area}<ArrowUpRight size={16} /></button>)}</nav>
    {!data ? <p role="status">Bringing your records together…</p> : <div className="wl-layout">
      <div className="wl-main">
        <section className="wl-section" aria-labelledby={`${idPrefix}-plan-title`}>
          <header className="wl-section-head"><div><p className="wl-eyebrow">YOUR COMMITMENTS</p><h3 id={`${idPrefix}-plan-title`}>What matters next</h3></div><button type="button" disabled={!onNavigate} onClick={() => navigate({ kind: "more", view: "PLAN" })}>Plan <ArrowUpRight size={18} /></button></header>
          <div className="wl-period" role="group" aria-label="Commitment period"><button type="button" aria-pressed={period === "today"} onClick={() => setPeriod("today")}>Today</button><button type="button" aria-pressed={period === "next7"} onClick={() => setPeriod("next7")}>Next seven days</button></div>
          {!plan ? <Unavailable /> : plan[period].length ? <ul className="wl-agenda">{plan[period].map((item) => <li key={item.id}><button type="button" disabled={!onTask} onClick={() => onTask?.(item.id)}><span className="wl-agenda-mark" aria-hidden="true" /><span><strong>{item.title}</strong><small>{[item.status === "WAITING" ? "Waiting" : null, item.plannedAt ? `Planned ${item.plannedAt === plan.date ? "today" : shortDate(item.plannedAt)}` : null, item.dueAt ? `Due ${item.dueAt === plan.date ? "today" : shortDate(item.dueAt)}` : null].filter(Boolean).join(" · ")}</small></span><ArrowUpRight size={18} /></button></li>)}</ul> : <div className="wl-breathing-room"><p>{period === "today" ? "A little breathing room." : "The coming days are open here."}</p><span>{period === "today" ? "No tasks planned or due in these records. You can leave that space open." : "No other dated commitments in this window. Undated tasks remain in your plan."}</span></div>}
        </section>
        <section className="wl-section" aria-labelledby={`${idPrefix}-project-title`}><header className="wl-section-head"><div><p className="wl-eyebrow">YOUR PROJECTS</p><h3 id={`${idPrefix}-project-title`}>Things you're building</h3></div><button type="button" onClick={() => onArea("Plans")}>Projects <ArrowUpRight size={18} /></button></header>
          {!projects ? <Unavailable /> : projects.length ? <div className="wl-projects">{projects.map(({ project, progress }) => <article key={project.id} className="wl-project"><p className="wl-eyebrow">{project.status === "PAUSED" ? "Paused by you" : "Active project"}</p><h4>{project.title}</h4>{project.finish && <p>{project.finish}</p>}<p className="wl-project-count">{progress.done}<span> / {progress.total} steps recorded done</span></p><button type="button" disabled={progress.next ? !onTask : false} onClick={() => progress.next ? onTask?.(progress.next.id) : onArea("Plans")}><span>{progress.next ? `Chosen next: ${progress.next.title}` : "Choose a next step when you're ready"}</span><ArrowUpRight size={18} /></button></article>)}</div> : <div className="wl-breathing-room"><p>Something worth making room for?</p><span>Keep a project, a personal goal or a home undertaking here.</span><button type="button" onClick={() => onArea("Plans")}>Start with your plans <ArrowUpRight size={18} /></button></div>}
        </section>
        <section className="wl-section" aria-labelledby={`${idPrefix}-routine-title`}><header className="wl-section-head"><div><p className="wl-eyebrow">YOUR ROUTINES</p><h3 id={`${idPrefix}-routine-title`}>One step at a time</h3></div><button type="button" onClick={() => onArea("Routines")}>Routines <ArrowUpRight size={18} /></button></header>
          {!routines ? <Unavailable /> : routines.length ? <ul className="wl-routines">{routines.map((routine) => <li key={routine.id}><button type="button" onClick={() => setPlaying(routine)}><CirclePlay size={28} /><span><strong>{routine.title}</strong><small>{routine.steps.length} steps{routineEstimate(routine.steps) ? ` · ${routineEstimate(routine.steps)}` : " · Your pace"}</small>{progress?.startedAt && <small>{routine.steps.filter((step) => progress.ticks.has(stepKey(routine.id, step.id))).length} / {routine.steps.length} steps recorded</small>}</span><span>Play</span></button></li>)}</ul> : <p className="wl-caption">No saved routines yet. Build a repeatable sequence for the moments you choose.</p>}{progress?.startedAt && <p className="wl-caption">Progress for the day started {new Date(progress.startedAt).toLocaleDateString()}.</p>}{data.routineProgress.state === "unavailable" && <p className="wl-unavailable">Routine progress could not be read.</p>}
        </section>
      </div>
      <aside className="wl-side" aria-label="Everyday life">
        <section className="wl-note" aria-labelledby={`${idPrefix}-note-title`}><BookOpen size={24} /><p className="wl-eyebrow">LEAVE YOURSELF A THREAD</p><h3 id={`${idPrefix}-note-title`}>A place for today.</h3>{data.note.state === "unavailable" ? <Unavailable /> : <p className="wl-note-excerpt">{note?.note?.text || "A thought. A small win. Something to come back to. Your day does not have to become a task list."}</p>}{note && <p className="wl-caption">Lived day started {new Date(note.day.startedAt).toLocaleDateString()}. Kept separately from calendar task dates.</p>}<button type="button" disabled={!onNavigate} onClick={() => navigate({ kind: "more", view: "DAILY_NOTE" })}>{note?.note?.text ? "Continue your note" : "Open daily note"}<ArrowUpRight size={18} /></button></section>
        <section className="wl-connections" aria-labelledby={`${idPrefix}-people-title`}><Users size={24} /><h3 id={`${idPrefix}-people-title`}>People who matter</h3>{data.people.state === "unavailable" ? <Unavailable /> : <>{data.people.value.upcoming.slice(0, 2).map(({ reminder }) => <p key={reminder.id}><strong>{reminder.title}</strong><small>{reminder.dueAt ? shortDate(reminder.dueAt) : "No date"} · Recorded occasion</small></p>)}{data.people.value.upcoming.length === 0 && <p>Keep the dates and details you want to remember.</p>}</>}<button type="button" onClick={() => onArea("People")}>Open people <ArrowUpRight size={18} /></button></section>
        <section className="wl-connections" aria-labelledby={`${idPrefix}-home-title`}><House size={24} /><h3 id={`${idPrefix}-home-title`}>Life around you</h3>{data.home.state === "unavailable" ? <Unavailable /> : <>{data.home.value.due.slice(0, 2).map(({ reminder }) => <p key={reminder.id}><strong>{reminder.title}</strong><small>{reminder.dueAt ? `Due ${shortDate(reminder.dueAt)}` : "No due date"}</small></p>)}{data.home.value.due.length === 0 && <p>A home to care for. Details worth keeping out of your head.</p>}</>}<button type="button" onClick={() => onArea("Home")}>Open home <ArrowUpRight size={18} /></button></section>
        <section className="wl-body" aria-labelledby={`${idPrefix}-body-title`}><Heart size={24} /><h3 id={`${idPrefix}-body-title`}>Take yourself with you.</h3><p>Food, movement and recovery belong in the picture, too.</p>{data.workout.state === "unavailable" ? <Unavailable /> : <button type="button" disabled={!onNavigate} onClick={() => navigate({ kind: "workout" })}><Dumbbell size={20} />{workout ? "Resume your workout" : "Open training"}<ArrowUpRight size={18} /></button>}<button type="button" disabled={!onNavigate} onClick={() => navigate({ kind: "record", target: "meal" })}>Meals & food <ArrowUpRight size={18} /></button><button type="button" disabled={!onNavigate} onClick={() => navigate({ kind: "body", focus: "sleep" })}>Sleep & recovery <ArrowUpRight size={18} /></button></section>
      </aside>
    </div>}
    <section className="wl-explore" aria-labelledby={`${idPrefix}-explore-title`}><p className="wl-eyebrow">THE REST IS HERE, TOO</p><h3 id={`${idPrefix}-explore-title`}>More than getting things done.</h3><div><button type="button" disabled={!onNavigate} onClick={() => navigate({ kind: "more", view: "WORK_SCHEDULE" })}><CalendarDays size={20} /> Calendar & schedule</button><button type="button" onClick={() => onArea("Habits")}><Heart size={20} /> Habits</button><button type="button" onClick={() => onArea("Memory")}><Compass size={20} /> Memory</button><button type="button" disabled={!onNavigate} onClick={() => navigate({ kind: "more", view: "COLLECTIONS" })}><Layers size={20} /> Collections</button><button type="button" disabled={!onNavigate} onClick={() => navigate({ kind: "more", view: "JOURNAL" })}><BookOpen size={20} /> Decisions & reflection</button></div></section>
    <footer className="wl-footer"><span>Built around your life.</span><span>You choose what comes next.</span></footer>
  </div>
    {playing && active && <RoutinePlayer routines={[playing]} onClose={() => { setPlaying(null); void refresh(); }} />}
  </>;
}
