import { useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowUpRight, ArrowLeft, ArrowRight, Plus, X, Search, Command, Dumbbell, Droplets, Utensils, History, ScanLine, Moon, Check, Layers } from 'lucide-react';
import { WORKOUT_TEMPLATES } from '../../src/domain/workout/types';
import { CHECK_IN_FIELDS, rangeForField } from '../../src/ui/screens/today/checkInFields';
import { sceneFor, stories, storyNames, readings } from './data';
import type { Story, Reading, Scene } from './data';
import './style.css';
type Concept = 'A' | 'B' | 'C';
type Task = 'Water' | 'Meal' | 'Workout' | 'History' | 'Intelligence' | 'Check-in' | 'Recovery' | 'Sleep' | 'Note' | 'System';
type Mode = 'Prepare' | 'Work' | 'Train' | 'Recover' | 'Free';
type RecordItem = {
    id: number;
    time: string;
    label: string;
    source: string;
};
const icons = { Water: Droplets, Meal: Utensils, Workout: Dumbbell, History, Intelligence: ScanLine, 'Check-in': Check, Recovery: Moon, Sleep: Moon, Note: Plus, System: Layers };
const tasks: Task[] = ['Water', 'Meal', 'Workout', 'History', 'Intelligence', 'Check-in', 'Recovery', 'Sleep', 'Note'];
const titles = { A: 'Command Console', B: 'System Launcher', C: 'Adaptive Experience' };
const query = new URLSearchParams(location.search);
function Glyph({ task }: {
    task: Task;
}) { const Icon = icons[task]; return <Icon size={22} aria-hidden="true" strokeWidth={1.5}/>; }
function Modal({ title, children, onClose }: {
    title: string;
    children: ReactNode;
    onClose: () => void;
}) { const ref = useRef<HTMLDialogElement>(null); const opener = useRef(document.activeElement as HTMLElement); useEffect(() => { ref.current?.showModal(); ref.current?.querySelector<HTMLElement>('input,select,button')?.focus(); return () => ref.current?.close(); }, []); useEffect(() => { ref.current?.querySelector<HTMLElement>('input,select,button')?.focus(); }, [title]); const close = () => { ref.current?.close(); onClose(); opener.current?.focus(); }; return <dialog ref={ref} aria-labelledby="layer-title" aria-describedby="layer-description" onCancel={e => { e.preventDefault(); close(); }} onKeyDown={e => { if (e.key !== 'Tab')
    return; const items = Array.from(ref.current!.querySelectorAll<HTMLElement>('button,input,select,textarea,summary')).filter(el => !el.hasAttribute('disabled') && el.getBoundingClientRect().height); const first = items[0], last = items.at(-1); if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last?.focus();
} if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first?.focus();
} }}><header className="layer-head"><div><p className="label">DEMONSTRATION LAYER</p><h2 id="layer-title">{title}</h2></div><button aria-label="Close layer" onClick={close}><X aria-hidden="true"/></button></header><p id="layer-description" className="muted">Synthetic data · temporary memory only</p>{children}</dialog>; }
function Context({ scene }: {
    scene: Scene;
}) { return <section className="state" data-status={scene.status.level} aria-label="Operational state"><div><span className="label">{scene.time} / CURRENT CONTEXT</span><h2>{scene.heading}</h2><p>{scene.countdown}</p></div><div className="status"><span>System Status</span><strong>{scene.status.level.replace('_', ' ')}</strong></div><ol aria-label="Shift phases">{['BEFORE', 'SHIFT', 'AFTER', 'OFF'].map(p => <li key={p} aria-current={scene.activePhase === p ? 'step' : undefined}>{p}</li>)}</ol></section>; }
function Recommendation({ scene, compact, onInspect }: {
    scene: Scene;
    compact?: boolean;
    onInspect: () => void;
}) { const [choice, setChoice] = useState(''); const [confirm, setConfirm] = useState(false); const actionable = scene.recommendation.kind !== 'NO_ACTION_REQUIRED'; return <section className={`recommendation ${compact ? 'compact' : ''}`} data-primary={actionable} aria-label="One primary recommendation"><p className="label">{actionable ? 'ONE RECOMMENDATION' : 'NOTHING REQUIRED'} / SAMPLE</p><h2>{scene.recommendation.title}</h2>{!compact && <p>{scene.recommendation.body}</p>}{choice ? <div className="choice" role="status"><span>{choice} · demo only; nothing started</span><button onClick={() => setChoice('')}>Undo</button></div> : <div className="decision"><button className={actionable ? 'primary' : 'neutral'} onClick={() => setChoice(actionable ? 'Accepted' : 'Seen')}>{actionable ? "I'll do this" : 'Got it'}<ArrowRight aria-hidden="true" size={20}/></button>{actionable && <button className="decline" onClick={() => scene.status.level === 'RED' ? setConfirm(true) : setChoice('Declined')}>Decline</button>}<button aria-label="Inspect recommendation" onClick={onInspect}><ScanLine size={22} aria-hidden="true"/></button></div>}{confirm && !choice && <div className="override"><p>Decline a RED-capacity recommendation?</p><button onClick={() => { setChoice('Declined'); setConfirm(false); }}>Confirm decline</button><button onClick={() => setConfirm(false)}>Cancel</button></div>}</section>; }
const sample: RecordItem[] = [{ id: 1, time: '06:00', label: 'Work marked ended', source: 'Authored sample record' }, { id: 2, time: '06:12', label: 'Water · 8 oz', source: 'Authored sample record' }, { id: 3, time: '06:20', label: 'Check-in · energy 3 / 5', source: 'Authored sample record' }];
function App() {
    const [concept, setConcept] = useState<Concept>((['A', 'B', 'C'].includes(query.get('concept') ?? '') ? query.get('concept') : 'A') as Concept);
    const [story, setStory] = useState<Story>('AFTER');
    const [reading, setReading] = useState<Reading>('GREEN');
    const scene = sceneFor(story, reading);
    const [mode, setMode] = useState<Mode | null>(null);
    const derivedMode: Mode | null = story === 'BEFORE' ? 'Prepare' : story === 'SHIFT' ? 'Work' : story === 'AFTER' ? 'Recover' : story === 'UNKNOWN' ? null : 'Free';
    const activeMode = mode ?? derivedMode;
    const [workspace, setWorkspace] = useState<Task | null>(null);
    const [layer, setLayer] = useState<Task | 'Record' | null>(null);
    const [filter, setFilter] = useState('');
    const [records, setRecords] = useState<RecordItem[]>(sample);
    const [notice, setNotice] = useState('');
    const [session, setSession] = useState<{
        sets: number;
        paused: boolean;
    } | null>({ sets: 1, paused: true });
    const [completed, setCompleted] = useState(false);
    const [finish, setFinish] = useState(false);
    const workspaceRef = useRef<HTMLElement>(null);
    const template = WORKOUT_TEMPLATES.A!;
    const setCounts = template.exercises.map(e => e.sets);
    const total = setCounts.reduce((a, b) => a + b, 0);
    const count = session?.sets ?? 0;
    let exerciseIndex = 0, offset = 0;
    while (exerciseIndex < template.exercises.length - 1 && count >= offset + setCounts[exerciseIndex]!) {
        offset += setCounts[exerciseIndex]!;
        exerciseIndex++;
    }
    const exercise = template.exercises[exerciseIndex]!;
    const open = (task: Task) => { setNotice(''); if (concept === 'A' && task !== 'Workout')
        setLayer(task);
    else {
        setWorkspace(task);
        setLayer(null);
    } };
    const home = () => { setWorkspace(null); setFilter(''); setFinish(false); };
    useEffect(() => { if (workspace)
        workspaceRef.current?.focus();
    else
        document.querySelector<HTMLElement>('.home-title')?.focus(); }, [workspace]);
    useEffect(() => { const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' && !document.querySelector('dialog[open]'))
        home(); if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setLayer('System');
    } }; window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler); }, []);
    const addRecord = (label: string) => { setRecords(r => [...r, { id: Date.now(), time: 'Now · demo', label, source: 'Manual prototype input; not a domain event' }]); setNotice(`${label} added to this demo only. System Status and recommendation unchanged.`); setLayer(null); if (workspace)
        home(); };
    function actionButton(task: Task, text?: string) { return <button className="task-button" key={task} onClick={() => open(task)}><Glyph task={task}/><span>{text ?? task}</span><ArrowUpRight size={18} aria-hidden="true"/></button>; }
    function resume() { setSession(s => s ? { ...s, paused: false } : s); open('Workout'); }
    function continuity() { return session ? <button className="continuity" onClick={resume}><Dumbbell size={20} aria-hidden="true"/><span><strong>Resume workout A</strong><span>{session.sets} of {total} sets recorded · sample</span></span><ArrowUpRight size={20} aria-hidden="true"/></button> : null; }
    function intelligence() { return <div className="evidence"><p className="lead">{scene.recommendation.body}</p><dl><div><dt>Facts</dt><dd>{scene.statusText}</dd></div><div><dt>Context source</dt><dd>{scene.provenance}</dd></div><div><dt>Phase basis</dt><dd>{scene.basis}</dd></div><div><dt>Interpretation</dt><dd>{scene.recommendation.why}</dd></div><div><dt>Authority</dt><dd>Authored example, not live Engine output. One recommendation; the operator decides. Accepting does not start an activity.</dd></div><div><dt>Uncertainty</dt><dd>No confidence score, personal inference or physiological conclusion. Missing remains missing.</dd></div></dl><details><summary>Inspect source readings</summary>{scene.facts.length ? scene.facts.map(f => <p key={f}>{f}<span className="source">Authored scene fixture, not your records</span></p>) : <p>No sleep or check-in readings.</p>}</details></div>; }
    function history() { return <div className="timeline"><p className="muted">Illustrative sample history, independent of the selected context fixture. New demo entries are temporary. No canonical timeline is accessed.</p>{records.map(r => <details key={r.id}><summary><span className="time">{r.time}</span><span>{r.label}</span></summary><p>{r.source}. No correction or deletion of historical records is performed here.</p></details>)}</div>; }
    function form(task: Task) { return <form onSubmit={e => { e.preventDefault(); const fd = new FormData(e.currentTarget); addRecord(task === 'Water' ? `Water · ${fd.get('amount')} oz` : task === 'Meal' ? `Meal · ${fd.get('meal')}, ${fd.get('protein')} g protein` : task === 'Sleep' ? `Sleep · ${fd.get('hours')} hours` : task === 'Check-in' ? 'Check-in preview' : `${task} · ${fd.get('note') ?? 'preview'}`); }}>{task === 'Water' ? <><p className="lead">A quick record.<br />Back to your day.</p><label>Amount (oz)<input name="amount" type="number" inputMode="decimal" required min="0.1" step="0.1" defaultValue="8"/></label></> : task === 'Meal' ? <><label>Meal<input name="meal" required placeholder="What did you eat?"/></label><div className="form-pair"><label>Calories<input name="calories" type="number" required min="0"/></label><label>Protein (g)<input name="protein" type="number" min="0" required step="0.1"/></label></div></> : task === 'Check-in' ? CHECK_IN_FIELDS.map(f => <label key={f.key}>{f.label}<span className="muted">{f.directionLabel}</span><select name={f.key} required defaultValue=""><option value="" disabled>Choose</option>{rangeForField(f).map(v => <option key={v}>{v}</option>)}</select></label>) : task === 'Sleep' ? <label>Duration (hours)<input name="hours" type="number" required min="0.1" max="24" step="0.1"/></label> : <><p className="muted">{task === 'Recovery' ? 'Shift-down interaction preview. No timer, session or treatment is started.' : 'Manual capture preview.'}</p><label>Note<textarea name="note" rows={3} required={task === 'Note'}/></label></>}<button className="primary" type="submit">Add demo {task === 'Recovery' ? 'note' : task.toLowerCase()}<Check aria-hidden="true" size={20}/></button><p className="muted">Temporary memory. Reload clears it. No production event.</p></form>; }
    function system() { return <div className="system-list"><label className="search-label">Find an action<input type="search" placeholder="Water, workout, history…" value={filter} onChange={e => setFilter(e.target.value)}/></label><div className="results">{tasks.filter(t => t.toLowerCase().includes(filter.toLowerCase())).map(t => actionButton(t))}{!tasks.some(t => t.toLowerCase().includes(filter.toLowerCase())) && <p>No matching action. Clear the search to browse.</p>}</div></div>; }
    function workout() { return <div className="workout">{!session ? <><p className="lead">Template A.<br />Your choice to begin.</p><p>STANDARD · {template.exercises.length} exercises</p>{template.exercises.map(e => <details key={e.exerciseId}><summary>{e.name}</summary><p>{e.sets} sets · {e.repRangeLow}–{e.repRangeHigh} reps</p></details>)}<button className="primary" onClick={() => { setSession({ sets: 0, paused: false }); setCompleted(false); }}>Start demo workout<ArrowRight aria-hidden="true"/></button>{completed && <p role="status">Demo session completed. No workout event was written.</p>}</> : <><p className="label">A / STANDARD / {session.paused ? 'PAUSED' : 'IN PROGRESS'} / DEMO</p><div className="set-progress" role="img" aria-label={`${count} of ${total} sets recorded`}>{Array.from({ length: total }, (_, i) => <span key={i} data-done={i < count}/>)}</div><p className="muted">{count} of {total} sets recorded in temporary memory</p><h3>{exercise.name}</h3><p>Set {Math.min(count - offset + 1, exercise.sets)} of {exercise.sets} · {exercise.repRangeLow}–{exercise.repRangeHigh} reps</p>{count < total ? <form onSubmit={e => { e.preventDefault(); setSession({ sets: count + 1, paused: false }); setNotice('Set recorded in this demo only.'); }}><div className="form-pair"><label>Weight (lb)<input name="weight" type="number" required min="0" step="0.5" defaultValue="80"/></label><label>Reps<input name="reps" type="number" required min="1" max="100" defaultValue="10"/></label></div><button className="primary" type="submit">Log demo set<Check aria-hidden="true"/></button></form> : <p>All prescribed demo sets recorded. Finish remains your decision.</p>}<button className="neutral" onClick={() => { setSession({ ...session, paused: true }); home(); }}>Leave & keep position</button>{count > 0 && <button onClick={() => setSession({ ...session, sets: count - 1 })}>Undo last demo set</button>}<button onClick={() => setFinish(true)}>Finish demo session</button>{finish && <div className="override"><p>End this demo session? This does not complete a real workout.</p><button className="neutral" onClick={() => { setSession(null); setCompleted(true); setFinish(false); }}>Confirm demo finish</button><button onClick={() => setFinish(false)}>Keep training</button></div>}</>}</div>; }
    function taskContent(task: Task) { return task === 'Intelligence' ? intelligence() : task === 'History' ? history() : task === 'Workout' ? workout() : task === 'System' ? system() : form(task); }
    return <div className={`lab concept-${concept}`}><aside className="lab-bar"><label>Design concept<select aria-label="Design concept" value={concept} onChange={e => { setConcept(e.target.value as Concept); home(); setLayer(null); }}>{(['A', 'B', 'C'] as Concept[]).map(c => <option key={c} value={c}>{c} — {titles[c]}</option>)}</select></label><details><summary>Sample scene</summary><div><label>Work context<select aria-label="Work context" value={story} onChange={e => { setStory(e.target.value as Story); setMode(null); }}>{stories.map(s => <option key={s} value={s}>{storyNames[s]}</option>)}</select></label><label>System Status<select aria-label="System Status" value={reading} onChange={e => setReading(e.target.value as Reading)}>{readings.map(r => <option key={r}>{r}</option>)}</select></label><label>Workout sample<select aria-label="Workout sample" value={session ? 'paused' : 'new'} onChange={e => { setSession(e.target.value === 'new' ? null : { sets: 1, paused: true }); setCompleted(false); }}><option value="paused">Unfinished session</option><option value="new">No active session</option></select></label><button onClick={() => { setRecords(sample); setSession({ sets: 1, paused: true }); setNotice('Demo reset.'); }}>Reset temporary demo</button></div></details></aside>
    <div className="equipment"><header className="brand"><span className="wordmark">BEYOND</span><span className="label">{workspace ? 'WORKSPACE' : concept === 'A' ? 'CONSOLE' : concept === 'B' ? 'LAUNCHER' : 'ACTIVITY'}</span><button aria-label="Open system" onClick={() => setLayer('System')}><Command aria-hidden="true"/></button></header>
        {workspace ? <main ref={workspaceRef} tabIndex={-1} className="workspace"><button className="back" onClick={home}><ArrowLeft size={20} aria-hidden="true"/>Home</button><p className="label">DEDICATED WORKSPACE / SYNTHETIC</p><h1>{workspace}</h1>{taskContent(workspace)}</main> : <main className="home"><h1 className="home-title sr-only" tabIndex={-1}>{titles[concept]} home</h1>
        {concept === 'A' ? <><Context scene={scene}/><div className="console-focus"><Recommendation key={story + reading} scene={scene} onInspect={() => setLayer('Intelligence')}/></div>{continuity()}<div className="console-tools">{actionButton('Water')}{actionButton('Meal')}{actionButton('History')}</div></> : concept === 'B' ? <><div className="launcher-context"><Context scene={scene}/></div><div className="launcher-title"><p className="label">YOUR PERSONAL OPERATING SYSTEM</p><h2>What next?</h2></div><label className="launcher-search"><Search aria-hidden="true"/><input type="search" aria-label="Find workspace" placeholder="Find an action or workspace" value={filter} onChange={e => setFilter(e.target.value)}/></label><div className="launcher-results">{(filter ? tasks.filter(t => t.toLowerCase().includes(filter.toLowerCase())) : ['Water', 'Meal', 'Workout', 'History'] as Task[]).map(t => actionButton(t))}{filter && !tasks.some(t => t.toLowerCase().includes(filter.toLowerCase())) && <p>No matching workspace.</p>}</div>{!filter && <><Recommendation key={story + reading} scene={scene} compact onInspect={() => open('Intelligence')}/>{continuity()}</>}</> : <><Context scene={scene}/><div className="activity-head"><p className="label">Display mode</p><label>Activity<select aria-label="Activity mode" value={activeMode ?? ''} onChange={e => setMode(e.target.value as Mode)}><option value="" disabled>Choose a mode</option>{['Prepare', 'Work', 'Train', 'Recover', 'Free'].map(m => <option key={m}>{m}</option>)}</select></label></div><section className="mode-surface"><p className="label">{activeMode ? 'YOUR ' + activeMode.toUpperCase() + ' WORKSPACE' : 'NO ACTIVITY ASSUMED'}</p><h2>{activeMode === 'Work' ? 'Capture.\nCarry on.' : activeMode === 'Train' ? 'Keep your\nplace.' : activeMode === 'Prepare' ? 'Ready when\nyou are.' : activeMode === 'Recover' ? 'Make room\nfor rest.' : activeMode === 'Free' ? 'Your time.\nYour terms.' : 'Choose what\nyou need.'}</h2>{activeMode === 'Train' ? <>{continuity()}{!session && actionButton('Workout', 'Start workout')}</> : <div className="mode-actions">{(activeMode === 'Work' ? ['Water', 'Meal', 'Note'] : activeMode === 'Prepare' ? ['Check-in', 'Meal', 'Workout'] : activeMode === 'Recover' ? ['Recovery', 'Sleep', 'Check-in'] : ['History', 'Workout', 'Water'] as Task[]).map(t => actionButton(t as Task))}</div>}</section><Recommendation key={story + reading} scene={scene} compact onInspect={() => open('Intelligence')}/><p className="muted mode-note">Mode changes layout only. Phase and System Status stay unchanged.</p>{activeMode !== 'Train' && continuity()}</>}
        </main>}
    {!workspace && <footer className="action-deck"><button onClick={() => setLayer('Record')}><Plus aria-hidden="true"/><span>Record</span></button><button onClick={() => concept === 'B' ? open('System') : setLayer('System')}><Layers aria-hidden="true"/><span>{concept === 'B' ? 'Browse' : 'System'}</span></button></footer>}
    <p className="demo-stamp">SYNTHETIC DATA · DEMO ONLY</p>{notice && <div className="notice" role="status"><p>{notice}</p><button aria-label="Dismiss feedback" onClick={() => setNotice('')}><X aria-hidden="true"/></button></div>}
    </div>{layer && <Modal title={layer === 'Record' ? 'Record something' : layer === 'System' ? 'System actions' : layer} onClose={() => { setLayer(null); setFilter(''); }}>{layer === 'Record' ? <div className="record-menu">{(['Water', 'Meal', 'Check-in', 'Sleep', 'Note'] as Task[]).map(t => <button key={t} className="task-button" onClick={() => setLayer(t)}><Glyph task={t}/><span>{t}</span><ArrowUpRight size={20} aria-hidden="true"/></button>)}</div> : taskContent(layer)}</Modal>}</div>;
}
createRoot(document.getElementById('root')!).render(<App />);
