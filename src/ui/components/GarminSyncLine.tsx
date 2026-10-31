import type { HealthSyncResult } from "../../application/healthSync";

/** Garmin newer than this reads as current; older says Garmin itself is behind. */
const FRESH_MS = 12 * 60 * 60 * 1000;
const clock = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const when = (iso: string, now: number) => {
  const d = new Date(iso), today = new Date(now);
  return d.toDateString() === today.toDateString() ? clock(iso) : `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })} ${clock(iso)}`;
};

/** SYNC-002: what one tap of SYNC GARMIN brought back, said plainly; says so when Garmin itself is behind. */
export function describeGarminSync(result: HealthSyncResult, now = Date.now()): { headline: string; detail: string; behind: boolean } {
  const parts = [
    result.sleepMinutes !== null ? `sleep ${Math.floor(result.sleepMinutes / 60)}:${String(result.sleepMinutes % 60).padStart(2, "0")}` : null,
    result.stepsToday !== null ? `${Math.round(result.stepsToday).toLocaleString("en-US")} steps` : null,
    result.restingBpm !== null ? `resting ${result.restingBpm}` : null,
  ].filter(Boolean);
  const behind = !result.newestAt || now - Date.parse(result.newestAt) > FRESH_MS;
  return {
    headline: behind ? "Garmin hasn't sent anything new" : `Garmin updated${parts.length ? ` · ${parts.join(" · ")}` : ""}`,
    detail: !result.newestAt
      ? "Health Connect had no Garmin data to send. Sync your watch in Garmin Connect, then tap SYNC GARMIN again."
      : behind
        ? `Newest from Garmin: ${when(result.newestAt, now)}. Sync your watch in Garmin Connect, then tap SYNC GARMIN again.`
        : `Newest ${when(result.newestAt, now)}.${result.sleepFilled ? " Sleep filled in from Garmin; your own entries still win." : ""}`,
    behind,
  };
}

export function GarminSyncLine({ state, onDismiss }: { state: { result: HealthSyncResult } | { error: string } | "syncing"; onDismiss: () => void }) {
  if (state === "syncing") return <div className="backup-due" role="status"><p className="tool-label" style={{ margin: 0 }}>SYNCING GARMIN…</p></div>;
  const copy = "error" in state ? { headline: "Garmin sync didn't import", detail: `${state.error} Nothing was changed. Tap SYNC GARMIN to try again.`, behind: true } : describeGarminSync(state.result);
  return <div className="backup-due garmin-sync-line" role="status">
    <div className="backup-due__row" style={{ justifyContent: "space-between", borderLeftColor: copy.behind ? "var(--warning)" : "var(--border-strong)" }}>
      <div><p className="tool-label" style={{ margin: 0 }}>{copy.headline}</p><p className="meta" style={{ margin: "4px 0 0" }}>{copy.detail}</p></div>
      <button type="button" className="chip" style={{ padding: "8px 14px" }} onClick={onDismiss}>OK</button>
    </div>
  </div>;
}
