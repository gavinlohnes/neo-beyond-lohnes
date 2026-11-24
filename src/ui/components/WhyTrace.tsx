import type { WhyTrace } from "../../domain/intelligence/types";
import { WhyDisclosure } from "./WhyDisclosure";
import "./whyTrace.css";

/**
 * GRAYSON C6.4 ("Why am I seeing this?" everywhere): one disclosure for every Delta line, coach card and advisory
 * note: the rule that produced it and the facts it read. Native <details> through WhyDisclosure (DEPTH-001), so it
 * is instant, closed by default and fully readable by a screen reader. An optional action opens the records.
 */
export function WhyTraceDisclosure({ why, records }: { why: WhyTrace; records?: { label: string; onOpen: () => void } | undefined }) {
  return (
    <WhyDisclosure summary="WHY THIS?">
      <WhyTraceBody why={why} records={records} />
    </WhyDisclosure>
  );
}

/** The same content without its own disclosure, for a surface that already sits behind one (ADVISORY's WHY). */
export function WhyTraceBody({ why, records }: { why: WhyTrace; records?: { label: string; onOpen: () => void } | undefined }) {
  return (
    <div className="why-trace" data-why-trace>
      <p className="why-trace__rule"><span className="why-trace__key">RULE</span> <span>{why.rule}</span></p>
      {why.facts.length > 0 && (
        <dl className="why-trace__facts">
          {why.facts.map((fact) => (
            <div className="why-trace__fact" key={fact.label}>
              <dt>{fact.label}</dt>
              <dd>{fact.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {records && <button type="button" className="btn-secondary why-trace__records" onClick={records.onOpen}>{records.label}</button>}
    </div>
  );
}
