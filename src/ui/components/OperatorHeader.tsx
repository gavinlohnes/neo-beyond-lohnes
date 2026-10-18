import { createContext, useContext, useId, type ComponentProps, type Ref } from "react";
import { Icon } from "../icons/Icon";
import { useLongPress } from "../hooks/useLongPress";
import "./stealth.css";

/**
 * COMMAND-CENTER-001: the header glyph is the emblem — tapping it goes to
 * TODAY's root. The shell provides the action; without one (component tests,
 * isolated screens) the glyph stays a plain mark. The glyph keeps its locked
 * geometry: this changes what it does, not what it is.
 */
export const EmblemContext = createContext<(() => void) | null>(null);

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
export function OperatorHeader({ destination, children, headingId, headingRef, focusable = false }: OperatorHeaderProps) {
  const goHome = useContext(EmblemContext);
  const toggleStealth = useContext(StealthToggleContext);
  const press = useLongPress(() => toggleStealth?.());
  const hintId = useId();
  return (
    <div className="field-header">
      {goHome ? (
        <button type="button" className="operator-emblem" aria-label="BEYOND emblem: go to TODAY"
          aria-describedby={toggleStealth ? hintId : undefined}
          {...(toggleStealth ? press.handlers : {})}
          onClick={(event) => { if (!press.swallowClick(event)) goHome(); }}>
          <Icon name={destination} size={22} />
          {press.pressing && toggleStealth && <span aria-hidden="true" className="operator-emblem__press" />}
          {toggleStealth && <span id={hintId} className="visually-hidden">Long-press for stealth.</span>}
        </button>
      ) : (
        <Icon name={destination} size={22} />
      )}
      <h1 id={headingId} ref={headingRef} tabIndex={focusable ? -1 : undefined} className="eyebrow">
        {children}
      </h1>
    </div>
  );
}
