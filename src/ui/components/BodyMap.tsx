import { useCallback, useEffect, useId, useState } from "react";
import { EQUIPMENT_FILTERS, exercisesByMuscle, MAP_GROUPS, type MuscleEntry } from "../../application/exerciseByMuscle";
import { updateCustomExercise } from "../../application/exerciseLibraryCommands";
import { getCustomExercises } from "../../application/exerciseLibraryQueries";
import type { CustomExercise } from "../../domain/workout/customExercise";
import type { MuscleGroup } from "../../domain/workout/exerciseLibrary";
import { describeError } from "../errorMessage";
import "./bodyMap.css";

/**
 * GRAYSON-TRAIN-BODYMAP-001 (Gavin, 2026-11-24): tap a muscle, see its exercises (MuscleWiki's behaviour; the figure is
 * BEYOND's own, drawn from simple shapes). Navigation only: no colour grades anything, the selected region is outlined.
 * Every region is also a button in the list below, so the figure is never the only way in. In the live workout,
 * picking an exercise fills the existing free-text substitution, exactly as a quick-pick does.
 */

const VIEW_KEY = "beyond.bodyMap.v1";
function readEquipment(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(VIEW_KEY) ?? "null") as { equipment?: unknown } | null;
    return Array.isArray(raw?.equipment) ? raw.equipment.filter((e): e is string => (EQUIPMENT_FILTERS as readonly string[]).includes(e as string)) : [];
  } catch { return []; }
}
function writeEquipment(equipment: string[]): void {
  try { localStorage.setItem(VIEW_KEY, JSON.stringify({ equipment })); } catch { /* a view setting; nothing lost */ }
}

/** One region of the figure: the shapes that make it up, front (x≈60) and back (x≈180). */
type Shape = { kind: "rect"; x: number; y: number; w: number; h: number } | { kind: "ellipse"; cx: number; cy: number; rx: number; ry: number };
const R = (x: number, y: number, w: number, h: number): Shape => ({ kind: "rect", x, y, w, h });
const E = (cx: number, cy: number, rx: number, ry: number): Shape => ({ kind: "ellipse", cx, cy, rx, ry });
const REGIONS: { group: MuscleGroup; shapes: Shape[] }[] = [
  { group: "Shoulders", shapes: [E(37, 45, 11, 8), E(83, 45, 11, 8), E(157, 45, 11, 8), E(203, 45, 11, 8)] },
  { group: "Chest", shapes: [R(46, 40, 28, 22)] },
  { group: "Back", shapes: [R(166, 40, 28, 46)] },
  { group: "Arms", shapes: [R(23, 55, 10, 48), R(87, 55, 10, 48), R(143, 55, 10, 48), R(207, 55, 10, 48)] },
  { group: "Core", shapes: [R(48, 65, 24, 36)] },
  { group: "Glutes", shapes: [E(172, 98, 9, 9), E(188, 98, 9, 9)] },
  { group: "Legs", shapes: [R(47, 106, 12, 54), R(61, 106, 12, 54), R(48, 164, 10, 48), R(62, 164, 10, 48),
    R(167, 110, 12, 50), R(181, 110, 12, 50), R(168, 164, 10, 48), R(182, 164, 10, 48)] },
];

function Figure({ selected, onSelect }: { selected: MuscleGroup | null; onSelect: (g: MuscleGroup) => void }) {
  return <svg className="body-map__svg" viewBox="0 0 240 222" role="img" aria-label="Body map, front and back. Tap a muscle, or choose it from the list below.">
    {/* Outlines only: head, neck and the body's edge, front then back. */}
    {[60, 180].map((x) => <g key={x} className="body-map__outline" aria-hidden="true">
      <circle cx={x} cy={16} r={11} />
      <path d={`M ${x - 26} 38 Q ${x} 28 ${x + 26} 38 L ${x + 27} 104 L ${x + 14} 104 L ${x + 14} 214 L ${x - 14} 214 L ${x - 14} 104 L ${x - 27} 104 Z`} />
    </g>)}
    {REGIONS.map(({ group, shapes }) => <g key={group} data-region={group} aria-hidden="true"
      className={`body-map__region${selected === group ? " body-map__region--selected" : ""}`} onClick={() => onSelect(group)}>
      {shapes.map((s, i) => s.kind === "rect"
        ? <rect key={i} x={s.x} y={s.y} width={s.w} height={s.h} rx={4} />
        : <ellipse key={i} cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} />)}
    </g>)}
  </svg>;
}

export function BodyMap({ initialGroup = null, onPick, onHowTo }: {
  initialGroup?: MuscleGroup | null;
  /** Live workout: picking an exercise fills the substitution with its name. */
  onPick?: (name: string) => void;
  onHowTo: (entry: MuscleEntry) => void;
}) {
  const [customs, setCustoms] = useState<CustomExercise[]>([]);
  const [group, setGroup] = useState<MuscleGroup | null>(initialGroup);
  const [equipment, setEquipment] = useState<string[]>(readEquipment);
  const [error, setError] = useState<string | null>(null);
  const id = useId();
  const load = useCallback(async () => {
    try { setCustoms(await getCustomExercises()); } catch { setCustoms([]); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const groups = exercisesByMuscle({ customs, equipment });
  const toggle = (e: string) => setEquipment((now) => {
    const next = now.includes(e) ? now.filter((x) => x !== e) : [...now, e];
    writeEquipment(next);
    return next;
  });
  const regroup = async (entry: MuscleEntry, muscleGroup: MuscleGroup) => {
    setError(null);
    try { await updateCustomExercise(entry.id, { muscleGroup }); await load(); }
    catch (e) { setError(describeError(e, "That didn't save. Nothing changed.")); }
  };
  const list = group ? groups[group] : [];

  return <section className="body-map" aria-labelledby={`${id}-title`} data-body-map>
    <h3 id={`${id}-title`} className="body-map__title">Exercises by muscle</h3>
    <div className="body-map__figure">
      <Figure selected={group} onSelect={setGroup} />
      <div className="body-map__sides" aria-hidden="true"><span>FRONT</span><span>BACK</span></div>
    </div>
    <div className="body-map__groups" role="group" aria-label="Muscle groups">
      {MAP_GROUPS.map((g) => <button key={g} type="button" className="btn-secondary body-map__chip" aria-pressed={group === g}
        onClick={() => setGroup(g)}>{g}, {groups[g].length} {groups[g].length === 1 ? "exercise" : "exercises"}</button>)}
    </div>
    <div className="body-map__groups" role="group" aria-label="Equipment">
      {EQUIPMENT_FILTERS.map((e) => <button key={e} type="button" className="btn-secondary body-map__chip" aria-pressed={equipment.includes(e)}
        onClick={() => toggle(e)}>{e}</button>)}
    </div>
    {error && <p className="body-map__line" role="alert">{error}</p>}
    {group && <div className="body-map__list" aria-live="polite">
      <h4 className="body-map__title">{group}: {list.length} {list.length === 1 ? "exercise" : "exercises"}{equipment.length ? ` (${equipment.join(", ")})` : ""}</h4>
      {list.length === 0 ? <p className="body-map__line">None with that equipment. Turn a chip off to see more.</p>
        : <ul className="body-map__rows">{list.map((x) => <li key={x.id} className="body-map__row" data-entry={x.id}>
            <div className="body-map__what">
              {onPick
                ? <button type="button" className="btn-secondary body-map__pick" aria-label={`Swap in ${x.name}`} onClick={() => onPick(x.name)}>{x.name}</button>
                : <p className="body-map__name">{x.name}</p>}
              <p className="body-map__line">{x.equipment}{x.own ? " · yours" : ""}</p>
            </div>
            <div className="body-map__acts">
              {x.howToId && <button type="button" className="btn-secondary body-map__small" aria-label={`How to do ${x.name}`} onClick={() => onHowTo(x)}>HOW TO</button>}
              {x.own && <label className="body-map__regroup">Group
                <select value={x.muscleGroup} aria-label={`Group for ${x.name}`} onChange={(e) => void regroup(x, e.target.value as MuscleGroup)}>
                  {MAP_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
                </select></label>}
            </div>
          </li>)}</ul>}
    </div>}
  </section>;
}
