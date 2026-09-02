import { useState } from "react";
import type { AdvisoryNote } from "../../../domain/intelligence/types";
import { FieldDisclosure } from "../../components/FieldDisclosure";

/**
 * Intelligence Spine (I1/I2/I3, approved 2026-08-22/23) had a real,
 * tested composition layer (engine/advisory.ts, application/
 * advisoryQueries.ts) since it shipped, but nothing rendered its output
 * anywhere an operator would see it in daily use — AdvisoryNotes only
 * ever surfaced as a raw count in MORE's system diagnostics. This is the
 * first real consumption: a quiet, always-optional SUPPORT-tier section,
 * same "collapses to nothing when there's nothing to say" treatment
 * every other TOOLS-tier surface on TODAY gets.
 *
 * Deliberately NOT in ATTENTION and NOT styled like a Recommendation —
 * an AdvisoryNote has no priority, can't be accepted/declined, and must
 * never compete with NOW (see domain/intelligence/types.ts's doc
 * comment). Each note's `basis` is shown behind its own disclosure,
 * matching the "every recommendation carries a full WHY trace" doctrine
 * AdvisoryNote is built to follow, without demanding attention for it.
 *
 * `excludeObligationId` drops the one obligation-sourced note that would
 * otherwise exactly duplicate what the Commitments card already shows on
 * this same screen (same "no second dashboard hiding underneath the
 * first" reasoning renderCaptureToolsCard's own history already
 * establishes for Capture) — TodayScreen passes the current headline
 * commitment's id. Any *other* attention-worthy obligation, and every
 * progression note, still shows here: that information isn't shown
 * anywhere else on TODAY.
 */
function basisObligationId(note: AdvisoryNote): string | undefined {
  const entry = note.basis.find((b) => b.key === "obligationId");
  return typeof entry?.value === "string" ? entry.value : undefined;
}
function AdvisoryNoteRow({ note }: { note: AdvisoryNote }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ padding: "8px 0", borderTop: "1px solid var(--border-subtle)" }}>
      <p className="card-body" style={{ margin: 0 }}>{note.message}</p>
      {note.basis.length > 0 && (
        <FieldDisclosure summary={open ? "HIDE WHY" : "WHY"} open={open} onToggle={setOpen}>
          {note.basis.map((entry) => (
            <div key={entry.key} className="why-rule">
              <span>{entry.key}</span>
              <span>{String(entry.value)}</span>
            </div>
          ))}
        </FieldDisclosure>
      )}
    </div>
  );
}

export function AdvisorySection({
  notes,
  excludeObligationId,
}: {
  notes: AdvisoryNote[];
  excludeObligationId?: string | null | undefined;
}) {
  const visible = excludeObligationId
    ? notes.filter((note) => basisObligationId(note) !== excludeObligationId)
    : notes;
  if (visible.length === 0) return null;
  return (
    <div className="equipment-row">
      <p className="tool-label" style={{ marginBottom: 4 }}>ADVISORY</p>
      <p className="meta" style={{ marginBottom: 8 }}>
        Background context, not a recommendation — nothing here requires a decision.
      </p>
      {visible.map((note) => (
        <AdvisoryNoteRow key={note.id} note={note} />
      ))}
    </div>
  );
}
