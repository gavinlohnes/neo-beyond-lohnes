import { useEffect, useRef, useState } from "react";
import { getHomeStart, getHomeTemplateChoices, linkHomeForms, prepareHomeTemplates, type HomeStart } from "../../../application/homeStart";
import type { WorkoutSession } from "../../../domain/common/types";
import "./homeStartChoice.css";

/**
 * GRAYSON-HOME-STRETCH-001 slice A: HOME beside the gym start on TRAIN. "Gym closed or short on time? Do B at home."
 * START AT HOME · B starts the linked HOME form through TRAIN's own start (same RED gate, same in-flight guard), and
 * HOME advances the sequence only after a completed linked HOME workout with recorded work, as before.
 * First use: SET UP HOME makes HOME A, B and C and shows one review; nothing links until USE THESE.
 */
const short = (name: string) => name.replace(/^Grayson /, "");
type Review = { ids: [string, string, string]; names: [string, string, string]; changing: boolean; choices: { id: string; name: string }[] };

export function HomeStartChoice({ busy, startDisabled, refreshKey, onStart, onChanged }: {
  busy: boolean;
  /** A workout is already running. */
  startDisabled: boolean;
  refreshKey: unknown;
  onStart: (templateId: string, programmeContext?: WorkoutSession["programmeContext"]) => void;
  onChanged?: () => void;
}) {
  const [home, setHome] = useState<HomeStart | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [working, setWorking] = useState(false);
  const writing = useRef(false);
  const reviewRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    let live = true;
    void getHomeStart().then((v) => { if (live) setHome(v); }, () => { if (live) setHome(null); });
    return () => { live = false; };
  }, [refreshKey, tick]);
  useEffect(() => { if (review && !review.changing) reviewRef.current?.focus(); }, [review?.ids.join()]); // eslint-disable-line react-hooks/exhaustive-deps

  async function run(action: () => Promise<void>, failure: string) {
    if (writing.current || busy) return;
    writing.current = true; setWorking(true); setError(null);
    try { await action(); } catch (cause) { setError(cause instanceof Error && cause.message ? cause.message : failure); }
    finally { writing.current = false; setWorking(false); }
  }

  if (!home) return null;
  const disabled = busy || working || startDisabled;

  async function setUp() {
    await run(async () => {
      const made = await prepareHomeTemplates();
      if (home?.kind === "SETUP_SEQUENCE") {
        setReview({ ids: made.map((t) => t.id) as [string, string, string], names: made.map((t) => t.name) as [string, string, string], changing: false, choices: [] });
      } else {
        setTick((n) => n + 1);
        onChanged?.();
      }
    }, "HOME routines couldn't be made. Nothing was saved.");
  }

  async function change() {
    await run(async () => {
      const choices = await getHomeTemplateChoices();
      setReview((r) => (r ? { ...r, changing: true, choices } : r));
    }, "Your HOME routines couldn't be read.");
  }

  async function useThese() {
    if (!review) return;
    await run(async () => {
      await linkHomeForms(review.ids);
      setReview(null);
      setTick((n) => n + 1);
      onChanged?.();
    }, "HOME forms couldn't be linked. Nothing was saved.");
  }

  const errorLine = error && <p className="meta meta--error" role="alert">{error}</p>;

  if (review && home.kind === "SETUP_SEQUENCE") {
    const keys = home.members.map((m) => m.key);
    const distinct = new Set(review.ids).size === 3 && review.ids.every(Boolean);
    return (
      <section className="home-start home-start--review" aria-labelledby="home-start-review">
        <h3 id="home-start-review" ref={reviewRef} tabIndex={-1} className="card-title">
          {keys.map((k, i) => `${k} → ${short(review.names[i]!)}`).join(", ")}. Use these?
        </h3>
        {review.changing && keys.map((k, i) => (
          <label key={k} className="home-start__pick">
            <span>HOME for {k}</span>
            <select aria-label={`HOME for ${k}`} value={review.ids[i]} disabled={working} onChange={(event) => {
              const id = event.target.value;
              const name = review.choices.find((c) => c.id === id)?.name ?? "";
              setReview((r) => {
                if (!r) return r;
                const ids = [...r.ids] as [string, string, string]; const names = [...r.names] as [string, string, string];
                ids[i] = id; names[i] = name;
                return { ...r, ids, names };
              });
            }}>
              {review.choices.map((c) => <option key={c.id} value={c.id}>{short(c.name)}</option>)}
            </select>
          </label>
        ))}
        {!distinct && <p className="meta">Choose a different HOME routine for each.</p>}
        <p className="meta">HOME counts as your next workout only after you finish it with sets recorded. Nothing links until you tap USE THESE.</p>
        <div className="home-start__actions">
          <button type="button" className="btn-primary" disabled={disabled || !distinct} onClick={() => void useThese()}>USE THESE</button>
          {!review.changing && <button type="button" className="btn-secondary" disabled={disabled} aria-label="Change HOME routines" onClick={() => void change()}>CHANGE</button>}
          <button type="button" className="btn-secondary" disabled={working} onClick={() => setReview(null)}>CANCEL</button>
        </div>
        {errorLine}
      </section>
    );
  }

  if (home.kind === "LINKED") {
    return (
      <section className="home-start" aria-label="Train at home">
        <p className="meta">Gym closed or short on time? Do {home.key} at home.</p>
        <button type="button" className="btn-secondary home-start__go" disabled={disabled}
          onClick={() => onStart(home.templateId, { programmeRevisionId: home.revisionId, memberKey: home.key, parentTemplateId: home.parentTemplateId, form: "HOME" })}>
          START AT HOME · {home.key}
        </button>
        {errorLine}
      </section>
    );
  }

  if (home.kind === "DIRECT") {
    return (
      <section className="home-start" aria-label="Train at home">
        <p className="meta">Gym closed or short on time? Bodyweight at home:</p>
        <div className="home-start__actions">
          {home.homes.map((h) => (
            <button key={h.id} type="button" className="btn-secondary" disabled={disabled} aria-label={`Start ${short(h.name)} at home`} onClick={() => onStart(h.id)}>{short(h.name)}</button>
          ))}
        </div>
        {errorLine}
      </section>
    );
  }

  return (
    <section className="home-start" aria-label="Train at home">
      <p className="meta">Gym closed or short on time? Bodyweight routines for home.</p>
      <button type="button" className="btn-secondary home-start__go" disabled={disabled} onClick={() => void setUp()}>SET UP HOME</button>
      {errorLine}
    </section>
  );
}
