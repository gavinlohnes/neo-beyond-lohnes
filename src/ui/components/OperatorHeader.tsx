import type { ComponentProps, Ref } from "react";
import { Icon } from "../icons/Icon";

type OperatorHeaderProps = {
  destination: ComponentProps<typeof Icon>["name"];
  children: string;
  headingId?: string;
  headingRef?: Ref<HTMLHeadingElement>;
  focusable?: boolean;
};

/** Shared presentation-only identity frame for a primary operating surface. */
export function OperatorHeader({ destination, children, headingId, headingRef, focusable = false }: OperatorHeaderProps) {
  return (
    <div className="field-header">
      <Icon name={destination} size={22} />
      <h1 id={headingId} ref={headingRef} tabIndex={focusable ? -1 : undefined} className="eyebrow">
        {children}
      </h1>
    </div>
  );
}
