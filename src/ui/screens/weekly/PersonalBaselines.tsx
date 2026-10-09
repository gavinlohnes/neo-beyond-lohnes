import type { PersonalBaseline } from "../../../engine/personalBaselines";
import { describeBaselines, describeBaselinesQuiet } from "./weeklyCopy";

/** Same existing neutral comparisons in Weekly and BODY; no new rule or authority. */
export function PersonalBaselines({ baselines }: { baselines: readonly PersonalBaseline[] }) {
  return <>
    {describeBaselines(baselines).map((copy) => (
      <div key={copy.key} data-baseline={copy.key} style={{ marginBottom: 8 }}>
        <p className="meta" style={{ margin: 0, color: "var(--text-1)" }}>{copy.headline}</p>
        <p className="meta" style={{ margin: 0 }}>{copy.basis}</p>
      </div>
    ))}
    {describeBaselinesQuiet(baselines) && <p className="meta" data-baseline-quiet style={{ margin: 0 }}>{describeBaselinesQuiet(baselines)}</p>}
  </>;
}
