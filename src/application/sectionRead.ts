/**
 * LIFE-PATTERN-001: one read per screen section, failing on its own.
 * An unread source is "unavailable", never an empty list, so a screen can say what is missing
 * instead of showing a false "nothing here".
 */
export type SectionRead<T> = { state: "ready"; value: T } | { state: "unavailable" };

export async function readSection<T>(query: () => Promise<T>): Promise<SectionRead<T>> {
  try { return { state: "ready", value: await query() }; }
  catch { return { state: "unavailable" }; }
}

export const sectionValue = <T,>(read: SectionRead<T> | null | undefined): T | null => read?.state === "ready" ? read.value : null;
