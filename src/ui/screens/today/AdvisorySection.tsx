import { useState } from "react";
import type { AdvisoryNote } from "../../../domain/intelligence/types";
import { FieldDisclosure } from "../../components/FieldDisclosure";
import { WATER_QUICK_ADD_OZ } from "../body/bodyScreenCopy";

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

/** engine/shiftProtection.ts's composeAdvisoryNoteFromShiftProtection always stamps one `unmetItem` basis entry per unmet item — see its own doc comment. */
function unmetItems(note: AdvisoryNote): ("HYDRATE" | "PROTEIN")[] {
  return note.basis
    .filter((b) => b.key === "unmetItem")
    .map((b) => b.value)
    .filter((v): v is "HYDRATE" | "PROTEIN" => v === "HYDRATE" || v === "PROTEIN");
}

function AdvisoryNoteRow({
  note,
  busy,
  onLogWater,
  onOpenMinimumDay,
}: {
  note: AdvisoryNote;
  busy: boolean;
  onLogWater?: ((amountOz: number) => void) | undefined;
  onOpenMinimumDay?: (() => void) | undefined;
}) {
  const [open, setOpen] = useState(false);
  // TODAY-QUICKACTIONS-001: the one action surface any AdvisoryNote gets —
  // still not a Recommendation (no accept/decline, nothing recorded about
  // the note itself), just a shortcut to the same real BODY-logging
  // commands the operator would otherwise leave TODAY to reach. Water gets
  // a genuine one-tap amount (WATER_QUICK_ADD_OZ, the same real quick-add
  // options MinimumDaySection already offers — never a fabricated
  // default). Protein has no equivalent real default to reuse
  // (NO_FAKE_PRECISION), so its action opens Minimum Day's own input
  // instead of guessing a gram amount.
  const items = note.sourceModule === "shiftProtection" ? unmetItems(note) : [];
  return (
    <div style={{ padding: "8px 0", borderTop: "1px solid var(--border-subtle)" }}>
      {/* FOUNDATION-1B: INTERRUPT is the one rare, evidence-gated tier
          (engine/shiftProtection.ts's pre-shift concern, resolved as
          Advisory-only PROTECT — see docs/agent/drops/FOUNDATION-1B.md).
          A text label, not color alone, per doctrine's accessibility
          requirement — this note is still only ever an AdvisoryNote:
          no priority, not accept/decline-able, never a Recommendation. */}
      {note.attentionLevel === "INTERRUPT" && (
        <p className="eyebrow" style={{ marginBottom: 4 }}>PROTECT</p>
      )}
      <p className="card-body" style={{ margin: 0 }}>{note.message}</p>
      {items.length > 0 && (onLogWater || onOpenMinimumDay) && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
          {items.includes("HYDRATE") &&
            onLogWater &&
            WATER_QUICK_ADD_OZ.map((amount) => (
              <button
                key={amount}
                type="button"
                className="btn-secondary"
                style={{ width: "auto", padding: "8px 14px" }}
                disabled={busy}
                onClick={() => onLogWater(amount)}
              >
                +{amount} OZ
              </button>
            ))}
          {items.includes("PROTEIN") && onOpenMinimumDay && (
            <button
              type="button"
              className="btn-secondary"
              style={{ width: "auto", padding: "8px 14px" }}
              disabled={busy}
              onClick={onOpenMinimumDay}
            >
              LOG PROTEIN
            </button>
          )}
        </div>
      )}
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
  busy = false,
  onLogWater,
  onOpenMinimumDay,
}: {
  notes: AdvisoryNote[];
  excludeObligationId?: string | null | undefined;
  busy?: boolean;
  onLogWater?: (amountOz: number) => void;
  onOpenMinimumDay?: () => void;
}) {
  const filtered = excludeObligationId
    ? notes.filter((note) => basisObligationId(note) !== excludeObligationId)
    : notes;
  // FOUNDATION-1B: INTERRUPT-tier notes sort first within this same quiet
  // section — elevated prominence, not a competing primary Recommendation
  // (see AdvisoryNoteRow's PROTECT label above). A stable sort preserves
  // every other producer's existing relative order.
  const attentionRank = { INTERRUPT: 0, SURFACE: 1, QUIET: 2 } as const;
  const visible = [...filtered].sort((a, b) => attentionRank[a.attentionLevel] - attentionRank[b.attentionLevel]);
  if (visible.length === 0) return null;
  return (
    <div className="equipment-row">
      <p className="tool-label" style={{ marginBottom: 4 }}>ADVISORY</p>
      <p className="meta" style={{ marginBottom: 8 }}>
        Background context, not a recommendation — nothing here requires a decision.
      </p>
      {visible.map((note) => (
        <AdvisoryNoteRow key={note.id} note={note} busy={busy} onLogWater={onLogWater} onOpenMinimumDay={onOpenMinimumDay} />
      ))}
    </div>
  );
}
