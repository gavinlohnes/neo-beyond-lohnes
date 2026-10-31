import { createContext, useContext, useId, type ComponentProps, type Ref } from "react";
import type { Icon } from "../icons/Icon";
import { CcIcon } from "../cc/ccIcons";
import { Emblem } from "./Emblem";
import { useMinuteClock } from "../cc/useMinuteClock";
import { useLongPress } from "../hooks/useLongPress";
import "./stealth.css";

/**
 * COMMAND-CENTER-001: the header glyph is the emblem — tapping it goes to
 * TODAY's root. The shell provides the action; without one (component tests,
 * isolated screens) the glyph stays a plain mark. The glyph keeps its locked
 * geometry: this changes what it does, not what it is.
 * SUIT-ALIVE-001 (owner ruling 2026-10-28): the emblem is now the original red bat mark.
 */
export const EmblemContext = createContext<(() => void) | null>(null);

/** FIND-001 → POLISH-002: record search, one tap from every primary screen, beside the header clock. */
export const HeaderSearchContext = createContext<(() => void) | null>(null);
/** ALFRED-001: opens Alfred from every screen's header. */
export const HeaderAlfredContext = createContext<(() => void) | null>(null);

/** SUIT-001: a long-press on the emblem toggles stealth. Absent, the emblem only goes home. */
export const StealthToggleContext = createContext<(() => void) | null>(null);

type OperatorHeaderProps = {
  destination: ComponentProps<typeof Icon>["name"];
  children: string;
  headingId?: string;
  headingRef?: Ref<HTMLHeadingElement>;
  focusable?: boolean;
};

/** Shared presentation-only identity frame for a primary operating surface. */
export function OperatorHeader({ destination: _destination, children, headingId, headingRef, focusable = false }: OperatorHeaderProps) {
  const goHome = useContext(EmblemContext);
  const toggleStealth = useContext(StealthToggleContext);
  const press = useLongPress(() => toggleStealth?.());
  const hintId = useId();
  const clock = useMinuteClock();
  const search = useContext(HeaderSearchContext);
  const alfred = useContext(HeaderAlfredContext);
  // POLISH-002: the prototype's header row — emblem, BEYOND // WHERE, the clock on the right.
  const split = children.indexOf(" // ");
  const lead = split < 0 ? children : children.slice(0, split);
  const where = split < 0 ? "" : children.slice(split);
  return (
    <div className="field-header cc-hdr">
      <div className="cc-hdr-row">
        {goHome ? (
          <button type="button" className={`operator-emblem cc-emblem${press.pressing && toggleStealth ? " cc-pressing" : ""}`} aria-label="BEYOND emblem: go to TODAY"
            aria-describedby={toggleStealth ? hintId : undefined}
            {...(toggleStealth ? press.handlers : {})}
            onClick={(event) => { if (!press.swallowClick(event)) goHome(); }}>
            <Emblem size={30} />
            {press.pressing && toggleStealth && <span aria-hidden="true" className="operator-emblem__press" />}
            {toggleStealth && <span id={hintId} className="visually-hidden">Long-press for stealth.</span>}
          </button>
        ) : (
          <span className="cc-emblem cc-emblem--mark" aria-hidden="true"><Emblem size={30} /></span>
        )}
        <h1 id={headingId} ref={headingRef} tabIndex={focusable ? -1 : undefined} className="eyebrow cc-title">
          {lead}{where && <span className="cc-where">{where}</span>}
        </h1>
        {alfred && <button type="button" className="cc-alfred-btn" aria-label="Ask Alfred" onClick={alfred} style={search ? undefined : { marginLeft: "auto" }}>
          {/* An angular speech mark in BEYOND's geometry. */}
          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h18v12h-9l-5 4v-4H3z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="miter" /><path d="M8 10h8" stroke="currentColor" strokeWidth="1.6" /></svg>
        </button>}
        {search && <button type="button" className="cc-search-btn" aria-label="Search everything" onClick={search}><CcIcon.command /></button>}
        {/* Decorative: it repeats the phone's own clock, so it stays out of text and the a11y tree. */}
        <span className="cc-clock" aria-hidden="true" data-clock={clock} />
      </div>
    </div>
  );
}
