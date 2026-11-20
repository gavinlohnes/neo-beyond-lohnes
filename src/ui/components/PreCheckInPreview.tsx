import { useEffect, useState } from "react";
import "./preCheckInPreview.css";
import { getPreCheckInPreview, type PreCheckInPreview as Preview } from "../../application/preCheckInPreview";

/**
 * DRAFT-REC-001: one honest line before the check-in, only when it's already certain: "At most a reduced session
 * today", with the two short nights and your usual range. The check-in still makes the call; nothing is recorded.
 */
const hm = (m: number) => `${Math.floor(m / 60)}h ${String(Math.round(m % 60)).padStart(2, "0")}m`;
export function PreCheckInPreview({ refreshKey = 0 }: { refreshKey?: number }) {
  const [preview, setPreview] = useState<Preview | null>(null);
  useEffect(() => { let live = true; void getPreCheckInPreview().then((p) => { if (live) setPreview(p); }, () => undefined); return () => { live = false; }; }, [refreshKey]);
  if (!preview) return null;
  const [latest, before] = preview.nights;
  const kind = (k: string) => (k === "WORK" ? "work" : "off");
  return <p className="pre-check-in" data-pre-check-in>
    <strong>At most a reduced session today.</strong>{" "}
    Your last two main sleeps were short: {hm(latest!.minutes)} and {hm(before!.minutes)}, below your usual {hm(latest!.low)}–{hm(latest!.high)} on {kind(latest!.kind)} days. Check in for the full call.
  </p>;
}
