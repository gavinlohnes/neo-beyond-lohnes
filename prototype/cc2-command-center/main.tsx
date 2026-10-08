import { createContext, useContext, useState } from "react";
import { createRoot } from "react-dom/client";
import { ArrowDownRight, ArrowUpRight, Droplets, Utensils, X } from "lucide-react";
import { Icon } from "../../src/ui/icons/Icon";
import { LineIcon } from "../../src/ui/icons/LineIcon";
import { FieldDisclosure } from "../../src/ui/components/FieldDisclosure";
import { CollapsibleRow } from "../../src/ui/components/CollapsibleRow";
import { CommandSurface } from "../../src/ui/components/CommandSurface";
import { describeToolsSummary } from "../../src/ui/screens/today/shiftClock";
import type { ShiftClockRow } from "../../src/ui/screens/today/shiftClock";
import "../../src/ui/styles/tokens.css";
import "../../src/ui/styles/global.css";
import "./prototype.css";
import { concepts, examples, phases, makeScene } from "./scenes";
import type { Concept, Example, Phase, Scene } from "./scenes";

const query = new URLSearchParams(location.search);
function initial<T extends string>(key: string, values: readonly T[], fallback: T): T {
  const value = query.get(key);
  return values.find(v => v === value) ?? fallback;
}

function StateRail({ scene }: { scene: Scene }) {
  const [open, setOpen] = useState(false);
  return <section className="state-rail" data-status={scene.status.level} aria-label="Proposed State Rail">
    <div className="rail-lead">
      <div><p className="rail-kicker">CURRENT CONTEXT</p><h2>{scene.heading}</h2>
        <p className="rail-detail">{scene.countdown ?? (scene.input.workContext === "UNKNOWN" ? "Unknown stays unknown." : scene.input.workContext === "OFF" ? "Declared day off" : "Work ended · 06:00")}</p>
      </div>
      <Icon name={scene.activePhase === "AFTER" ? "shiftDown" : "schedule"} size={32} />
    </div>
    <p className="system-status"><span className="status-marker" aria-hidden="true" />System Status <strong>{scene.status.level.replace("_", " ")}</strong></p>
    <p className="status-reason">{scene.statusSummary}</p>
    <ol className="phase-track" aria-label="Shift phases">
      {phases.map(phase => <li key={phase} data-phase={phase} aria-current={scene.activePhase === phase ? "step" : undefined}>
        <span>{phase}</span><span className="phase-link" aria-hidden="true">→</span>
      </li>)}
    </ol>
    <div className="rail-choice">
      {scene.input.workContext === "UNKNOWN" ? <p>Work context unanswered</p> : <p>{scene.input.workContext === "OFF" ? "Off · per schedule" : "Working · per schedule"}</p>}
      {scene.input.workContext !== "UNKNOWN" && <DemoButton>{scene.input.workContext === "OFF" ? "CHANGE TO WORKING" : "CHANGE TO OFF"}</DemoButton>}
    </div>
    <FieldDisclosure summary="INTELLIGENCE" open={open} onToggle={setOpen}>
      <dl className="intelligence-data">
        <div><dt>Work context</dt><dd>{scene.provenance}</dd></div>
        <div><dt>Status reasons</dt><dd>{scene.statusLine}</dd></div>
        <div><dt>Phase / countdown basis</dt><dd>{scene.basis}</dd></div>
      </dl>
    </FieldDisclosure>
  </section>;
}

const FeedbackContext = createContext<(message: string) => void>(() => {});
function DemoButton({ children, primary = false }: { children: string; primary?: boolean }) {
  const showFeedback = useContext(FeedbackContext);
  return <button type="button" className={primary ? "demo-primary" : "demo-button"} onClick={() => showFeedback(`“${children}” previewed. Nothing saved or started.`)}>{children}{primary && <LineIcon icon={ArrowUpRight} />}</button>;
}

function Recommendation({ scene }: { scene: Scene }) {
  const showFeedback = useContext(FeedbackContext);
  const [whyOpen, setWhyOpen] = useState(false);
  const [declineConfirm, setDeclineConfirm] = useState(false);
  const actionable = scene.suggestion.kind !== "NO_ACTION_REQUIRED";
  const content = <>
    <div className="recommendation-label"><span>EXAMPLE RECOMMENDATION</span><Icon name="mission" size={22} /></div>
    <h2>{scene.suggestion.title}</h2><p className="recommendation-body">{scene.suggestion.body}</p>
    <div className="recommendation-actions"><DemoButton primary={actionable}>{scene.suggestion.action}</DemoButton>
      {actionable && <button type="button" className="decline-button" onClick={() => scene.suggestion.kind === "STABILIZE" ? setDeclineConfirm(true) : showFeedback('“Not doing this” previewed. Nothing saved.')} >Not doing this</button>}
    </div>
    {declineConfirm && <div className="preview-confirm"><p>RED-capacity override needs confirmation. Preview only.</p><DemoButton>CONFIRM PREVIEW DECLINE</DemoButton><button className="demo-button" onClick={() => setDeclineConfirm(false)}>CANCEL</button></div>}
    <FieldDisclosure summary="How BEYOND decided" open={whyOpen} onToggle={setWhyOpen}><p className="explanation">{scene.suggestion.why}</p><p className="explanation">These are authored examples, not live Engine output. A decision never starts an action for you.</p></FieldDisclosure>
  </>;
  return <section className="recommendation" aria-label="Synthetic recommendation" data-dominant={actionable ? "true" : "false"}>
    {actionable ? <CommandSurface>{content}</CommandSurface> : <div className="quiet-recommendation">{content}</div>}
  </section>;
}

function PhaseRow({ row, scene }: { row: ShiftClockRow; scene: Scene }) {
  const [open, setOpen] = useState(false);
  if (row === "FUEL") return <div className="fuel-readings"><p className="row-title">FUEL</p><div className="fuel-values"><p><LineIcon icon={Utensils} /><span><strong>126 <span>g</span></strong><span>Protein / 180 g</span></span></p><p><LineIcon icon={Droplets} /><span><strong>48 <span>oz</span></strong><span>Water recorded</span></span></p></div></div>;
  if (row === "QUICK_LOG") return <div><p className="row-title">QUICK LOG</p><div className="quick-log"><DemoButton>+WATER</DemoButton><DemoButton>LOG MEAL</DemoButton><DemoButton>LOG URGE</DemoButton></div></div>;
  if (row === "WORK_QUESTION") return <div><p className="row-title">WORK CONTEXT</p><p className="row-hint">Are you working today?</p><div className="choice-pair"><DemoButton>YES</DemoButton><DemoButton>NO</DemoButton></div></div>;
  const names: Partial<Record<ShiftClockRow, [string, string]>> = {
    TONIGHT: ["AFTER SHIFT WORKOUT", "B · STANDARD · ~48 min"],
    SHIFT_DOWN: ["SHIFT DOWN", "Not started"],
    CHECK_IN: ["CHECK-IN", scene.status.level === "NO_READ" ? "Manual input is always available" : "Recorded · 06:15 · UPDATE"],
    WORKOUT: ["WORKOUT", "B · STANDARD · ~48 min"],
    MAIN_SLEEP: ["MAIN SLEEP", "Log it when you wake"],
  };
  const [name, summary] = names[row] ?? [row, "Synthetic example"];
  return <div><CollapsibleRow name={name} summary={summary} onOpen={() => setOpen(!open)} />
    {open && <div className="row-expanded"><p>{summary}</p><DemoButton>{row === "CHECK_IN" ? "UPDATE CHECK-IN" : row === "WORKOUT" || row === "TONIGHT" ? "OPEN TRAIN" : row === "SHIFT_DOWN" ? "START SHIFT DOWN" : "LOG MAIN SLEEP"}</DemoButton><button type="button" className="demo-button" onClick={() => setOpen(false)}>CLOSE</button></div>}
  </div>;
}

function Today({ scene }: { scene: Scene }) {
  const [toolsOpen, setToolsOpen] = useState(false);
  return <>
    <StateRail scene={scene} />
    <Recommendation scene={scene} />
    <section className="phase-rows" aria-label="Phase-specific rows"><h2 className="section-heading">{scene.heading}<span aria-hidden="true" /></h2>
      {scene.view.rows.map(row => <div key={row} data-shift-clock-row={row}><PhaseRow row={row} scene={scene} /></div>)}
    </section>
    <section className="prototype-tools" aria-label="Tools">
      <CollapsibleRow name="TOOLS" summary={describeToolsSummary(scene.view.tools)} onOpen={() => setToolsOpen(!toolsOpen)} />
      {toolsOpen && <div className="tools-content"><p className="explanation">Every action below is a preview. Nothing is saved.</p>{scene.view.tools.map(tool => <DemoButton key={tool}>{tool.replaceAll("_", " ")}</DemoButton>)}{scene.activePhase === "SHIFT" && <DemoButton>MARK WORK ENDED</DemoButton>}<button className="demo-button" onClick={() => setToolsOpen(false)}>CLOSE TOOLS</button></div>}
    </section>
  </>;
}

function Prototype() {
  const [concept, setConcept] = useState<Concept>(initial<Concept>("concept", ["A", "B", "C"], "A"));
  const [example, setExample] = useState<Example>(initial("example", examples, "GREEN"));
  const [phase, setPhase] = useState<Phase>(initial("phase", phases, "AFTER"));
  const [tab, setTab] = useState("TODAY");
  const [feedback, setFeedback] = useState("");
  const scene = makeScene(example, phase);
  function changeScene() { setFeedback(""); setTab("TODAY"); }
  return <FeedbackContext.Provider value={setFeedback}><div className={`cc2 concept-${concept}`} data-concept={concept}>
    <aside className="review-controls" aria-label="Prototype review controls">
      <div className="review-brand"><span>BEYOND / DESIGN LAB</span><span>CC2</span></div>
      <p className="preview-notice">SYNTHETIC PREVIEW · NO DATA SAVED</p>
      <div className="concept-switch" role="group" aria-label="Visual concept">{(["A", "B", "C"] as Concept[]).map(key => <button key={key} type="button" aria-pressed={concept === key} onClick={() => { setConcept(key); changeScene(); }} aria-label={`Concept ${key} — ${concepts[key].name}`}><span>{key}</span><span>{key === "A" ? "Refined" : key === "B" ? "Tactical" : "Living"}</span></button>)}</div>
      <div className="scene-selectors"><label>Example<select value={example} onChange={e => { setExample(e.target.value as Example); changeScene(); }}>{examples.map(value => <option key={value} value={value}>{value.replace("_", " ")}</option>)}</select></label><label>Phase<select value={phase} disabled={example === "UNKNOWN"} onChange={e => { setPhase(e.target.value as Phase); changeScene(); }}>{phases.map(value => <option key={value}>{value}</option>)}</select></label></div>
      <p className="lab-caption">{concepts[concept].name}<br /><span>{concepts[concept].note}</span></p>
    </aside>
    <div className="device-field">
      <header className="prototype-header"><div><Icon name="mission" size={22} /><h1>BEYOND <span>// {tab}</span></h1></div><button type="button" aria-label="Search preview" onClick={() => setFeedback('Search preview only. No real data is queried.')}><Icon name="search" size={24} /></button></header>
      <p className="scene-stamp">Synthetic scene <span>{scene.time}</span></p>
      <main key={`${concept}-${example}-${phase}`} id="concept-content" className="concept-content">
        {tab === "TODAY" ? <Today scene={scene} /> : <section className="destination-preview"><Icon name={tab === "TRAIN" ? "train" : tab === "BODY" ? "body" : "more"} size={40} /><h2>{tab}</h2><p>This concept explores TODAY. Production {tab} stays unchanged.</p><p>No real records are read or written.</p><button className="demo-primary" onClick={() => setTab("TODAY")}>RETURN TO TODAY<LineIcon icon={ArrowDownRight} /></button></section>}
      </main>
      <footer className="field-footnote">Authored examples. Not live Engine output.<br />INFORM → INTERPRET → RECOMMEND<br />USER DECIDES</footer>
      {feedback && <div className="preview-feedback" role="status"><p>Preview only: {feedback}</p><button type="button" aria-label="Dismiss preview feedback" onClick={() => setFeedback("")}><LineIcon icon={X} /></button></div>}
      <nav className="prototype-nav shell-nav" aria-label="Preview destinations">{["TODAY", "TRAIN", "BODY", "MORE"].map(name => <button key={name} type="button" aria-current={tab === name ? "page" : undefined} onClick={() => { setTab(name); setFeedback(""); }}><Icon name={name === "TODAY" ? "mission" : name === "TRAIN" ? "train" : name === "BODY" ? "body" : "more"} size={22} /><span>{name}</span></button>)}</nav>
    </div>
  </div></FeedbackContext.Provider>;
}

createRoot(document.getElementById("root")!).render(<Prototype />);
