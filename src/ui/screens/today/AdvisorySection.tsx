import { useState } from "react";
import type { AdvisoryNote } from "../../../domain/intelligence/types";
import { FieldDisclosure } from "../../components/FieldDisclosure";
import { CollapsibleRow } from "../../components/CollapsibleRow";
import { WATER_QUICK_ADD_OZ } from "../body/bodyScreenCopy";
import { describeAdvisorySummary, groupAdvisoryNotes, type AdvisoryRow as AdvisoryRowModel } from "./advisoryCopy";

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
 * ADVISORY-002 (owner brief 2026-10-05): obligation notes no longer show
 * here at all — real to-dos live in COMMITMENT, which lists every due one.
 * Same-kind notes are grouped into one row each, three rows at most, with
 * the WHY one tap down (see advisoryCopy.ts).
 */
/** engine/shiftProtection.ts's composeAdvisoryNoteFromShiftProtection always stamps one `unmetItem` basis entry per unmet item — see its own doc comment. */
function unmetItems(note: AdvisoryNote): ("HYDRATE" | "PROTEIN")[] {
  return note.basis
    .filter((b) => b.key === "unmetItem")
    .map((b) => b.value)
    .filter((v): v is "HYDRATE" | "PROTEIN" => v === "HYDRATE" || v === "PROTEIN");
}

function QuickActions({
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
  if (items.length === 0 || (!onLogWater && !onOpenMinimumDay)) return null;
  return (
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
  );
}

/**
 * ADVISORY-002: one row per kind. The row shows its label ("Easing back in ·
 * 4 lifts"); a tap lists the items, each with its WHY. A PROTECT (INTERRUPT)
 * row keeps its message and quick actions on the row itself, since acting
 * before the shift is the point.
 */
function AdvisoryRowView({
  row,
  busy,
  onLogWater,
  onOpenMinimumDay,
}: {
  row: AdvisoryRowModel;
  busy: boolean;
  onLogWater?: ((amountOz: number) => void) | undefined;
  onOpenMinimumDay?: (() => void) | undefined;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ padding: "8px 0", borderTop: "1px solid var(--border-subtle)" }}>
      {/* FOUNDATION-1B: INTERRUPT is the one rare, evidence-gated tier. A
          text label, not color alone, per doctrine's accessibility
          requirement — still only an AdvisoryNote: no priority, not
          accept/decline-able, never a Recommendation. */}
      {row.attentionLevel === "INTERRUPT" && (
        <p className="eyebrow" style={{ marginBottom: 4 }}>PROTECT</p>
      )}
      {row.lead ? (
        <>
          <p className="card-body" style={{ margin: 0 }}>{row.lead.message}</p>
          <QuickActions note={row.lead} busy={busy} onLogWater={onLogWater} onOpenMinimumDay={onOpenMinimumDay} />
        </>
      ) : (
        <p className="card-body" style={{ margin: 0 }}>{row.label}</p>
      )}
      <FieldDisclosure summary={open ? "HIDE" : row.lead ? "WHY" : "SHOW"} open={open} onToggle={setOpen}>
        {row.items.map((item) => (
          <div key={item.note.id} style={{ padding: "4px 0" }}>
            {!row.lead && <p className="card-body" style={{ margin: 0 }}>{item.name}</p>}
            {item.why && <p className="meta" style={{ margin: 0 }}>{item.why}</p>}
          </div>
        ))}
      </FieldDisclosure>
    </div>
  );
}

export function AdvisorySection({
  notes,
  busy = false,
  onLogWater,
  onOpenMinimumDay,
}: {
  notes: AdvisoryNote[];
  busy?: boolean;
  onLogWater?: (amountOz: number) => void;
  onOpenMinimumDay?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const rows = groupAdvisoryNotes(notes);
  if (rows.length === 0) return null;
  // LAUNCH POLISH (owner approval 2026-10-01): background-only (QUIET)
  // notes fold into one row on TODAY; anything SURFACE or INTERRUPT stays
  // open exactly as before.
  if (!open && rows.every((row) => row.attentionLevel === "QUIET")) {
    return <CollapsibleRow name="ADVISORY" summary={describeAdvisorySummary(rows)} onOpen={() => setOpen(true)} />;
  }
  return (
    <div className="equipment-row">
      <p className="tool-label" style={{ marginBottom: 4 }}>ADVISORY</p>
      {rows.map((row) => (
        <AdvisoryRowView key={row.key} row={row} busy={busy} onLogWater={onLogWater} onOpenMinimumDay={onOpenMinimumDay} />
      ))}
    </div>
  );
}
