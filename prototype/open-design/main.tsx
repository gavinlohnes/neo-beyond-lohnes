import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { ArrowUpRight, ArrowRight, Check, ChevronDown, Plus, X, House, Dumbbell, Activity, Grid2X2, Droplets, Moon, Utensils, NotebookPen } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { CHECK_IN_FIELDS, rangeForField } from "../../src/ui/screens/today/checkInFields";
import { WORKOUT_TEMPLATES } from "../../src/domain/workout/types";
import { sceneFor, readings, stories, storyNames, weightReadings } from "./data";
import type { Story, Reading, Direction, Scene } from "./data";
import "./style.css";

const query=new URLSearchParams(location.search);
function fromQuery<T extends string>(key:string,values:readonly T[],fallback:T) {return values.find(v=>v===query.get(key))??fallback;}
type Destination="TODAY"|"TRAIN"|"BODY"|"MORE";
type Entry="Choose"|"Check-in"|"Water"|"Food"|"Sleep"|"Note"|"Shift down"|"Workout"|"Capability preview";
const navigation: {name:Destination;icon:LucideIcon}[]=[{name:"TODAY",icon:House},{name:"TRAIN",icon:Dumbbell},{name:"BODY",icon:Activity},{name:"MORE",icon:Grid2X2}];
function Glyph({icon:Icon,size=20}:{icon:LucideIcon;size?:number}){return <Icon size={size} aria-hidden="true" strokeWidth={1.6}/>;}
function Disclosure({title,children,className=""}:{title:string;children:ReactNode;className?:string}){return <details className={`fold ${className}`}><summary>{title}<Glyph icon={Plus}/></summary><div className="fold-content">{children}</div></details>;}

function Context({scene,onContext}:{scene:Scene;onContext:(s:Story)=>void}){
 return <section className="context" data-status={scene.status.level} aria-label="Operational context">
  <div className="context-lead"><div><p className="eyebrow">CURRENT CONTEXT</p><h2>{scene.heading}</h2></div><p className="clock">{scene.time}<span>{scene.countdown}</span></p></div>
  <div className="status-reading"><span>System Status</span><strong>{scene.status.level.replace("_"," ")}</strong><span className="reading-reason">{scene.facts[0]??"No readings included"}</span></div>
  <ol className="phase-path" aria-label="Shift phases">{["BEFORE","SHIFT","AFTER","OFF"].map(p=><li key={p} aria-current={scene.activePhase===p?"step":undefined} data-phase={p}>{p}</li>)}</ol>
  <div className="context-choice"><span>{scene.input.workContext==="UNKNOWN"?"Work context unanswered":scene.input.workContext==="OFF"?"Off · per schedule":"Working · per schedule"}</span>{scene.input.workContext!=="UNKNOWN"&&<button onClick={()=>onContext(scene.input.workContext==="OFF"?"SHIFT":"OFF")}>{scene.input.workContext==="OFF"?"CHANGE TO WORKING":"CHANGE TO OFF"}<Glyph icon={ArrowUpRight}/></button>}</div>
 </section>;
}

function Intelligence({scene}:{scene:Scene}){
 return <Disclosure title="INTELLIGENCE" className="intelligence">
  <div className="intel-intro"><p className="eyebrow">BASIS, NOT A BLACK BOX</p><h3>See what this rests on.</h3><p>Synthetic demonstration. No live Engine trace or personal inference.</p></div>
  <dl className="evidence-register"><div><dt>Facts</dt><dd>{scene.statusText}</dd></div><div><dt>Work context</dt><dd>{scene.provenance}</dd></div><div><dt>Phase basis</dt><dd>{scene.basis}</dd></div><div><dt>Interpretation</dt><dd>{scene.recommendation.why}</dd></div><div><dt>Suggestion</dt><dd>{scene.recommendation.title}. The decision belongs to you.</dd></div><div><dt>Uncertainty</dt><dd>All inputs are fictional. No evidence strength is scored, and no real history was searched.</dd></div></dl>
  <Disclosure title="Inspect included records"><ul className="source-list">{scene.facts.length?scene.facts.map(f=><li key={f}><span>{f}</span><small>Source: authored scene fixture</small></li>):<li>No sleep or check-in records included. Missing stays missing.</li>}</ul></Disclosure>
 </Disclosure>;
}
function Mission({scene,onEntry,onTrain}:{scene:Scene;onEntry:(entry:Entry)=>void;onTrain:()=>void}){
 const [decision,setDecision]=useState<"accepted"|"declined"|"seen"|null>(null);const [confirm,setConfirm]=useState(false);
 const actionable=scene.recommendation.kind!=="NO_ACTION_REQUIRED";
 return <section className="mission" data-primary={actionable} aria-label="One synthetic recommendation">
  <p className="eyebrow">{actionable?"ONE RECOMMENDATION":"NOTHING TO START"} <span>SYNTHETIC EXAMPLE</span></p>
  <h2>{scene.recommendation.title}</h2><p className="mission-reason">{scene.recommendation.body}</p>
  {!decision?<div className="decision-actions"><button className={actionable?"primary":"quiet-action"} onClick={()=>setDecision(actionable?"accepted":"seen")}>{actionable?"I'll do this":"GOT IT"}<Glyph icon={ArrowRight} size={24}/></button>{actionable&&<button className="decline" onClick={()=>scene.recommendation.kind==="STABILIZE"?setConfirm(true):setDecision("declined")}>Not doing this</button>}</div>:<div className="decision-feedback" role="status"><Glyph icon={Check}/><span>{decision==="accepted"?"Accepted":decision==="declined"?"Declined":"Seen"} · preview only</span><button onClick={()=>setDecision(null)}>Undo preview</button></div>}
  {confirm&&!decision&&<div className="override"><p>Confirm declining a RED-capacity recommendation.</p><p>Preview only. No decision will be saved.</p><div className="button-pair"><button className="neutral" onClick={()=>{setDecision("declined");setConfirm(false);}}>Confirm preview decline</button><button onClick={()=>setConfirm(false)}>Cancel</button></div></div>}
  <p className="decision-note">Deciding doesn't start an action.</p>
  {decision==="accepted"&&scene.recommendation.handoff&&<button className="handoff" onClick={()=>scene.recommendation.handoff?.includes("TRAIN")?onTrain():onEntry("Shift down")}>{scene.recommendation.handoff}<Glyph icon={ArrowUpRight}/></button>}
  <Intelligence scene={scene}/>
 </section>;
}
const rowNames:Record<string,string>={WORK_QUESTION:"Are you working today?",TONIGHT:"After-shift workout",FUEL:"Fuel",QUICK_LOG:"Quick log",SHIFT_DOWN:"Shift down",CHECK_IN:"Check-in",WORKOUT:"Workout",MAIN_SLEEP:"Main sleep"};
function Daily({scene,onEntry,onTrain,onContext}:{scene:Scene;onEntry:(entry:Entry)=>void;onTrain:()=>void;onContext:(s:Story)=>void}){
 const summaries:Record<string,string>={TONIGHT:"A · STANDARD",FUEL:"Protein 112 / 160 g · Water 40 oz",QUICK_LOG:"Water, food, urge",SHIFT_DOWN:"Not started",CHECK_IN:scene.status.level==="NO_READ"?"Not recorded":"Sample check-in included",WORKOUT:"A · STANDARD",MAIN_SLEEP:"Log when you wake",WORK_QUESTION:"No answer assumed"};
 const rowAction=(r:string)=>r==="WORKOUT"||r==="TONIGHT"?onTrain():onEntry(r==="MAIN_SLEEP"?"Sleep":r==="CHECK_IN"?"Check-in":r==="SHIFT_DOWN"?"Shift down":r==="FUEL"||r==="QUICK_LOG"?"Choose":"Note");
 return <section className="daily" aria-label="Phase-specific daily actions"><div className="section-label"><h2>For this part of your day</h2><span>{scene.view.rows.length} items</span></div>
  {scene.view.rows.map(r=><div className="daily-item" data-phase-row={r} key={r}>{r==="WORK_QUESTION"?<><div><h3>{rowNames[r]}</h3><p>{summaries[r]}</p></div><div className="button-pair"><button className="neutral" onClick={()=>onContext("SHIFT")}>YES</button><button className="neutral" onClick={()=>onContext("OFF")}>NO</button></div></>:<button className="daily-button" onClick={()=>rowAction(r)}><span><strong>{rowNames[r]}</strong><span>{summaries[r]}</span></span><Glyph icon={ArrowUpRight}/></button>}</div>)}
  <Disclosure title="TOOLS"><p className="support">Other existing capabilities, kept out of your immediate decision. Demo controls only.</p><div className="tool-grid">{scene.view.tools.map(t=><button key={t} onClick={()=>onEntry(t==="CHECK_IN"?"Check-in":t==="SHIFT_DOWN"?"Shift down":t==="FUEL"?"Choose":t==="CAPTURE"?"Note":"Capability preview")}>{t.replaceAll("_"," ")}<Glyph icon={ArrowUpRight}/></button>)}{scene.activePhase==="SHIFT"&&<button onClick={()=>onContext("AFTER")}>MARK WORK ENDED<Glyph icon={ArrowUpRight}/></button>}</div></Disclosure>
 </section>;
}

function Train({onEntry}:{onEntry:(entry:Entry)=>void}){
 const [variant,setVariant]=useState("STANDARD");const template=WORKOUT_TEMPLATES.A;if(!template)throw new Error("Missing built-in template A");return <section className="feature train"><p className="eyebrow">TRAIN / SYNTHETIC SESSION</p><h2>Strength,<br/>on your terms.</h2><p className="feature-intro">Template A. The next session is a choice, not an obligation.</p><div className="segmented" role="group" aria-label="Session variant">{["STANDARD","REDUCED"].map(v=><button key={v} aria-pressed={variant===v} onClick={()=>setVariant(v)}>{v}</button>)}</div><p className="support">Manual preview selection. No plan is changed or session started.</p><div className="exercise-list">{template.exercises.slice(0,variant==="REDUCED"?2:4).map((e,i)=><Disclosure title={e.name} key={e.exerciseId}><p>{variant==="REDUCED"?2:e.sets} sets · {e.repRangeLow}–{e.repRangeHigh} reps</p><p className="support">No performance history included. No progression inferred.</p><button className="neutral" onClick={()=>onEntry("Workout")}>Preview set entry<Glyph icon={ArrowUpRight}/></button></Disclosure>)}</div><button className="primary" onClick={()=>onEntry("Workout")}>Start workout preview<Glyph icon={ArrowRight}/></button></section>;
}
function Body({onEntry,scene}:{onEntry:(entry:Entry)=>void;scene:Scene}){
 const sleep=scene.status.facts.find(f=>f.kind==="SLEEP");
 const sleepText=sleep?.kind==="SLEEP"?`${Math.floor(sleep.minutes/60)}h ${sleep.minutes%60}m`:"No read";
 const min=Math.min(...weightReadings),max=Math.max(...weightReadings);const points=weightReadings.map((n,i)=>`${20+i*44},${30+(max-n)/(max-min)*100}`).join(" ");
 return <section className="feature body"><p className="eyebrow">BODY / FICTIONAL READINGS</p><h2>A record.<br/>Not a verdict.</h2><p className="feature-intro">Small observations, over time. No score to live up to.</p><div className="body-facts"><button onClick={()=>onEntry("Water")}><Glyph icon={Droplets}/><strong>40 <span>oz</span></strong><span>Water recorded</span></button><button onClick={()=>onEntry("Sleep")}><Glyph icon={Moon}/><strong>{sleepText}</strong><span>Main sleep</span></button><button onClick={()=>onEntry("Food")}><Glyph icon={Utensils}/><strong>112 <span>g</span></strong><span>Protein / 160 g target</span></button></div><section className="weight-panel" aria-label="Synthetic bodyweight trend"><div className="section-label"><h3>Bodyweight</h3><span>7 sample readings</span></div><p className="weight-value">211.3 <span>lb</span></p><svg role="img" aria-label="Seven fictional bodyweight readings over one week, from 212.4 to 211.3 pounds. Daily values are listed below." viewBox="0 0 304 160"><line x1="20" y1="145" x2="284" y2="145" stroke="#505055"/><polyline points={points} fill="none" stroke="#efeff1" strokeWidth="2"/>{weightReadings.map((n,i)=><circle key={i} cx={20+i*44} cy={30+(max-n)/(max-min)*100} r="3" fill="#efeff1"/>)}</svg><p className="support">Oct 1–7 · fictional data. A short window, not a forecast or proof of cause.</p><Disclosure title="View sample records"><table><caption>Fictional daily bodyweight</caption><thead><tr><th>Date</th><th>Weight</th></tr></thead><tbody>{weightReadings.map((n,i)=><tr key={i}><td>Oct {i+1}</td><td>{n} lb</td></tr>)}</tbody></table></Disclosure></section></section>;
}
function More({onEntry}:{onEntry:(entry:Entry)=>void}){return <section className="feature"><p className="eyebrow">MORE / DEPTH WHEN YOU NEED IT</p><h2>Your system.<br/>Your control.</h2><p className="feature-intro">The quiet machinery behind your day.</p>{["History & review","Missions & obligations","Decision journal","Work schedule","Backup & restore"].map(n=><Disclosure title={n} key={n}><p className="support">Visual navigation preview. No records, files, settings or plans are accessed.</p><button className="neutral" onClick={()=>onEntry("Capability preview")}>Explore preview<Glyph icon={ArrowUpRight}/></button></Disclosure>)}<div className="privacy"><Glyph icon={NotebookPen}/><p>BEYOND's data belongs on your device. Backups and consequential changes belong to you.</p></div></section>;}

function RecordDialog({entry,onClose,onFeedback}:{entry:Entry;onClose:()=>void;onFeedback:(s:string)=>void}){
 const ref=useRef<HTMLDialogElement>(null);const [kind,setKind]=useState<Entry>(entry);useEffect(()=>{ref.current?.showModal();return ()=>ref.current?.close();},[]);
 useEffect(()=>{if(kind!=="Choose")ref.current?.querySelector<HTMLElement>("input, select, textarea")?.focus();},[kind]);
 function submit(e:React.FormEvent){e.preventDefault();onFeedback(`${kind} entry previewed. Nothing saved; the synthetic scene is unchanged.`);onClose();}
 return <dialog ref={ref} className="record-dialog" aria-labelledby="record-title" aria-describedby="record-description" onCancel={e=>{e.preventDefault();onClose();}}><div className="dialog-header"><p className="eyebrow">MANUAL INPUT / DEMO ONLY</p><button onClick={onClose} aria-label="Close record preview"><Glyph icon={X}/></button></div><h2 id="record-title">{kind==="Choose"?"What happened?":kind}</h2><p id="record-description">Interaction prototype. No entries, events or plans are saved.</p>
 {kind==="Capability preview"?<p className="support">This destination is an information-architecture preview only. Its production workflow is not implemented here. No action has occurred.</p>:kind==="Choose"?<div className="record-options">{(["Check-in","Water","Food","Sleep","Note"] as Entry[]).map(k=><button key={k} onClick={()=>setKind(k)}>{k}<Glyph icon={ArrowUpRight}/></button>)}</div>:<form onSubmit={submit} key={kind}>
 {kind==="Check-in"?CHECK_IN_FIELDS.map(f=><label key={f.key}>{f.label}<span>{f.directionLabel}</span><select name={f.key} required defaultValue=""><option value="" disabled>Choose a value</option>{rangeForField(f).map(v=><option key={v}>{v}</option>)}</select></label>):kind==="Water"?<label>Amount (oz)<input name="amount" type="number" inputMode="decimal" required min="0.1" step="0.1" placeholder="8"/></label>:kind==="Sleep"?<><label>Duration (hours)<input name="hours" type="number" inputMode="decimal" required min="0.1" max="24" step="0.1" placeholder="7.5"/></label><label>Sleep type<select><option>PRIMARY</option><option>SUPPLEMENTAL</option></select></label></>:kind==="Food"?<><label>Meal<input name="meal" required placeholder="What did you eat?"/></label><label>Protein (g)<input name="protein" type="number" inputMode="decimal" required min="0" step="0.1"/></label></>:kind==="Workout"?<><p className="support">Entry preview only. No session is started.</p><label>Weight (lb)<input type="number" name="weight" min="0" required step="0.5"/></label><label>Reps<input type="number" name="reps" min="1" max="100" required/></label></>:kind==="Shift down"?<><p className="support">Guided transition preview. Sit, hydrate, and make room for rest. No flow or timer is started.</p><label>Optional note<textarea rows={3} placeholder="Anything to leave behind?"/></label></>:<label>Preview note<textarea rows={3} required placeholder="Capture first. Organize later."/></label>}
 <button className="neutral" type="submit">Preview entry<Glyph icon={Check}/></button><button type="button" onClick={()=>setKind("Choose")}>Other entry types</button></form>}
 </dialog>;
}

function App(){
 const [story,setStory]=useState<Story>(fromQuery("story",stories,"AFTER"));const [reading,setReading]=useState<Reading>(fromQuery("reading",readings,"GREEN"));const [direction,setDirection]=useState<Direction>(fromQuery("direction",["field","horizon","index"] as const,"field"));
 const [tab,setTab]=useState<Destination>(fromQuery("tab",["TODAY","TRAIN","BODY","MORE"] as const,"TODAY"));const [entry,setEntry]=useState<Entry|null>(null);const [feedback,setFeedback]=useState("");const scene=sceneFor(story,reading);const opener=useRef<HTMLElement|null>(null);
 const openEntry=(kind:Entry)=>{opener.current=document.activeElement as HTMLElement;setEntry(kind);setFeedback("");};const closeEntry=()=>{document.querySelector<HTMLDialogElement>(".record-dialog")?.close();setEntry(null);opener.current?.focus();};
 const changeContext=(next:Story)=>{setStory(next);setFeedback("Switched the synthetic scenario only. No work-context or work-ended event was recorded.");};
 const go=(next:Destination)=>{setTab(next);setFeedback("");window.scrollTo({top:0,behavior:"instant"});};
 return <div className={`design direction-${direction}`}>
  <aside className="studio"><span>Synthetic preview</span><details><summary>Scene controls<Glyph icon={ChevronDown}/></summary><div className="studio-controls"><label>Scenario<select value={story} onChange={e=>{setStory(e.target.value as Story);setFeedback("");}}>{stories.map(s=><option value={s} key={s}>{storyNames[s]}</option>)}</select></label><label>System Status<select value={reading} onChange={e=>setReading(e.target.value as Reading)}>{readings.map(r=><option key={r}>{r}</option>)}</select></label><label>Design exploration<select value={direction} onChange={e=>setDirection(e.target.value as Direction)}><option value="field">Field — selected direction</option><option value="horizon">Horizon — spatial study</option><option value="index">Index — compact study</option></select></label></div></details></aside>
  <div className="app-shell"><header className="masthead"><a className="wordmark" href="/?direction=field" aria-label="BEYOND design prototype home">BEYOND</a><span className="current-destination">{tab}</span><button className="record-trigger" aria-label="Record information" onClick={()=>openEntry("Choose")}><Glyph icon={Plus}/><span>Record</span></button></header>
  <nav className="main-nav" aria-label="Primary navigation">{navigation.map(n=><button key={n.name} aria-current={tab===n.name?"page":undefined} onClick={()=>go(n.name)}><Glyph icon={n.icon}/><span>{n.name}</span></button>)}<p className="nav-note">On your device.<br/>On your terms.</p></nav>
  <main key={`${story}-${reading}-${tab}`} id="main-content" className="main-content">{tab==="TODAY"?<><Context scene={scene} onContext={changeContext}/><div className="today-composition"><Mission scene={scene} onEntry={openEntry} onTrain={()=>go("TRAIN")}/><Daily scene={scene} onEntry={openEntry} onTrain={()=>go("TRAIN")} onContext={changeContext}/></div></>:tab==="TRAIN"?<Train onEntry={openEntry}/>:tab==="BODY"?<Body onEntry={openEntry} scene={scene}/>:<More onEntry={openEntry}/>}</main>
  <footer className="app-footnote">Authored examples. No real Engine output.<br/>INFORM → INTERPRET → RECOMMEND → USER DECIDES</footer>
  {feedback&&<div className="toast" role="status"><p>{feedback}</p><button onClick={()=>setFeedback("")} aria-label="Dismiss feedback"><Glyph icon={X}/></button></div>}
  {entry&&<RecordDialog entry={entry} onClose={closeEntry} onFeedback={setFeedback}/>}</div>
 </div>;
}
createRoot(document.getElementById("root")!).render(<App/>);
