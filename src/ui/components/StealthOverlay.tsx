import { captureCommitFeedback } from "../feel/feedback";
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { getStealthReadings } from "../../application/stealthQueries";
import { getRecentSavedMeals } from "../../application/nutritionQueries";
import { logMeal, voidMealLog } from "../../application/nutritionCommands";
import { logWater, voidWaterLog, subscribeToDayRollover } from "../../application/commands";
import type { SavedMeal } from "../../domain/common/types";
import { readBootPhase } from "../screens/today/bootMode";
import { MODE_NAMES, type ShiftClockPhase } from "../screens/today/shiftClock";
import { WATER_QUICK_ADD_OZ } from "../screens/body/bodyScreenCopy";
import { useLongPress } from "../hooks/useLongPress";
import { UNDO_WINDOW_MS } from "../hooks/useUndoWindow";
import { formatFuelReading } from "../screens/systems/systemsCopy";
import { Signal } from "./Signal";
import { Icon } from "../icons/Icon";
import "./stealth.css";

type Readings = Awaited<ReturnType<typeof getStealthReadings>>;
type Logged = { kind: "WATER" | "MEAL"; dayId: string; eventId: string; key: number };

function clock(at: Date): string {
  return `${String(at.getHours()).padStart(2, "0")}:${String(at.getMinutes()).padStart(2, "0")}`;
}

/**
 * SUIT-001: stealth hides the screen, not the data. It shows the time, the
 * mode and two hidden readings that show only while held. WATER and MEAL log
 * blind through the canonical commands with their usual undo; no total ever
 * appears here. What sits behind it (an active workout included) is left
 * exactly as it was.
 */
export function StealthOverlay({ onExit, onLogged }: {
  onExit: () => void;
  /** Tells the app a canonical write happened, so retained screens re-read. */
  onLogged: () => void;
}) {
  const [now, setNow] = useState(() => new Date());
  const [mode, setMode] = useState<ShiftClockPhase | null>(null);
  const [readings, setReadings] = useState<Readings | null>(null);
  const [panel, setPanel] = useState<"WATER" | "MEAL" | null>(null);
  const [meals, setMeals] = useState<SavedMeal[] | null>(null);
  const [logged, setLogged] = useState<Logged | null>(null);
  const [failure, setFailure] = useState<{ message: string; key: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const root = useRef<HTMLDivElement>(null);
  const emblem = useRef<HTMLButtonElement>(null);
  const [hint, setHint] = useState(false);
  const exitPress = useLongPress(onExit);

  async function read() {
    const at = new Date();
    setNow(at);
    const [next, phase] = await Promise.all([getStealthReadings(), readBootPhase(at).catch(() => null)]);
    setReadings(next);
    setMode(phase);
  }
  useEffect(() => {
    emblem.current?.focus({ preventScroll: true });
    void read().catch(() => {});
    const tick = setInterval(() => void read().catch(() => {}), 30_000);
    const unsubscribe = subscribeToDayRollover(() => void read().catch(() => {}));
    return () => { clearInterval(tick); unsubscribe(); };
  }, []);
  useEffect(() => {
    if (!logged) return;
    const timer = setTimeout(() => setLogged(null), UNDO_WINDOW_MS);
    return () => clearTimeout(timer);
  }, [logged]);

  async function run(write: () => Promise<Logged | null>, failureMessage: string) {
    const acknowledge = captureCommitFeedback();
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setFailure(null);
    try {
      const result = await write();
      if (result) acknowledge("LIGHT");
      setLogged(result);
      setPanel(null);
      onLogged();
      await read().catch(() => {});
    } catch {
      setFailure({ message: failureMessage, key: Date.now() });
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  function logWaterBlind(amount: number) {
    const dayId = readings?.dayId;
    if (!dayId) return;
    void run(async () => ({ kind: "WATER", dayId, eventId: await logWater(dayId, amount), key: Date.now() }), "Water not saved. Try again.");
  }
  function logMealBlind(meal: SavedMeal) {
    const dayId = readings?.dayId;
    if (!dayId) return;
    void run(async () => ({ kind: "MEAL", dayId, eventId: (await logMeal(dayId, meal.id)).eventId, key: Date.now() }), "Meal not saved. Try again.");
  }
  function undo() {
    const entry = logged;
    if (!entry) return;
    void run(async () => {
    const acknowledge = captureCommitFeedback();
      const changed = entry.kind === "WATER" ? await voidWaterLog(entry.dayId, entry.eventId) : await voidMealLog(entry.dayId, entry.eventId);
      if (changed) acknowledge("HEAVY");
      return null;
    }, "Undo not saved. Try again.");
  }

  function openMeals() {
    setPanel("MEAL");
    setMeals(null);
    void getRecentSavedMeals().then(setMeals).catch(() => setMeals([]));
  }

  // Escape works wherever focus is (a tap on empty space can leave it on the body).
  const escape = useRef({ panel, onExit });
  escape.current = { panel, onExit };
  useEffect(() => {
    function onEscape(event: globalThis.KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      if (escape.current.panel) setPanel(null);
      else escape.current.onExit();
    }
    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, []);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Tab") return;
    const controls = [...(root.current?.querySelectorAll<HTMLElement>("button:not(:disabled)") ?? [])];
    const first = controls[0], last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }

  const noDay = readings !== null && readings.dayId === null;
  return (
    <div ref={root} className="stealth" role="dialog" aria-modal="true" aria-label="Stealth" onKeyDown={onKeyDown}>
      <div className="stealth__inner">
        <div className="stealth__top">
          <button ref={emblem} type="button" className="operator-emblem stealth__emblem" aria-label="Stealth is on. Long-press the emblem to exit"
            {...exitPress.handlers}
            onClick={(event) => { if (!exitPress.swallowClick(event)) setHint(true); }}>
            <Icon name="mission" size={22} />
            {exitPress.pressing && <span aria-hidden="true" className="stealth__press" />}
          </button>
          <span className="stealth__label">STEALTH</span>
          <button type="button" className="chip stealth__exit" onClick={onExit}>EXIT</button>
        </div>
        <p className="stealth__time" aria-label={`Time ${clock(now)}`}>{clock(now)}</p>
        <p className="stealth__mode">{mode ? MODE_NAMES[mode] : "MODE NOT SET"}</p>
        {readings?.workoutActive && <p className="stealth__workout" role="status">Workout in progress. It’s waiting where you left it.</p>}
        <div className="stealth__peeks">
          <Peek label="PROTEIN" value={readings?.proteinG != null ? formatFuelReading(readings.proteinG, readings.proteinTargetG) : null} />
          <Peek label="WATER" value={readings?.waterOz != null ? `${readings.waterOz} oz` : null} />
        </div>

        {panel === "WATER" && <section className="stealth__panel" aria-label="Log water">
          <div className="stealth__amounts">
            {WATER_QUICK_ADD_OZ.map((amount, index) => <button key={amount} type="button" className="btn-secondary" disabled={busy} autoFocus={index === 0} onClick={() => logWaterBlind(amount)}>{amount} oz</button>)}
          </div>
          <p className="stealth__note">One tap logs it. The total stays hidden.</p>
        </section>}
        {panel === "MEAL" && <section className="stealth__panel" aria-label="Log a saved meal">
          {meals === null && <p className="stealth__note" role="status">Reading saved meals…</p>}
          {meals?.length === 0 && <p className="stealth__note">No saved meals yet. Save one in DATA first.</p>}
          {meals?.map((meal, index) => <button key={meal.id} type="button" className="stealth__meal" disabled={busy} autoFocus={index === 0} onClick={() => logMealBlind(meal)}>
            <strong>{meal.name}</strong><span>Saved meal · one tap</span>
          </button>)}
          <p className="stealth__note">Totals stay hidden in stealth.</p>
        </section>}

        <div className="stealth__feedback">
          {logged && <p className="stealth__confirm" role="status">
            <span>{logged.kind === "WATER" ? "Water logged." : "Meal logged."}</span>
            <button type="button" className="chip" disabled={busy} onClick={undo}>UNDO</button>
          </p>}
          {failure && <Signal key={failure.key} as="p" className="stealth__failure" role="alert" data-signal="save-failed">{failure.message}</Signal>}
          {noDay && <p className="stealth__note">No day started. Start it on TODAY to log here.</p>}
        </div>

        <div className="stealth__actions">
          <button type="button" className="btn-secondary" disabled={busy || noDay || !readings} aria-expanded={panel === "WATER"} onClick={() => setPanel(panel === "WATER" ? null : "WATER")}>WATER</button>
          <button type="button" className="btn-secondary" disabled={busy || noDay || !readings} aria-expanded={panel === "MEAL"} onClick={() => (panel === "MEAL" ? setPanel(null) : openMeals())}>MEAL</button>
        </div>
        <p className="stealth__hint" role={hint ? "status" : undefined}>
          {hint ? "Long-press the emblem to exit, or press Escape." : "Hold a reading to see it. Long-press the emblem to exit."}
        </p>
        <p className="stealth__hint">Stealth hides the screen. Your records are unchanged.</p>
      </div>
    </div>
  );
}

/** Shows its value only while held: pointer down, or Space/Enter held. */
function Peek({ label, value }: { label: string; value: string | null }) {
  const [showing, setShowing] = useState(false);
  const show = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* synthetic pointer */ }
    setShowing(true);
  };
  const hide = () => setShowing(false);
  return (
    <button type="button" className={`stealth__peek${showing ? " stealth__peek--showing" : ""}`} aria-label={`${label} hidden. Hold to show`}
      onPointerDown={show} onPointerUp={hide} onPointerCancel={hide} onPointerLeave={hide} onBlur={hide}
      onContextMenu={(event) => event.preventDefault()}
      onKeyDown={(event) => { if (event.key === " " || event.key === "Enter") { event.preventDefault(); setShowing(true); } }}
      onKeyUp={(event) => { if (event.key === " " || event.key === "Enter") { event.preventDefault(); hide(); } }}>
      <span className="stealth__peek-label">{label}</span>
      <span className="stealth__peek-value" aria-live="polite">{showing ? (value ?? "No day") : "•••"}</span>
    </button>
  );
}
