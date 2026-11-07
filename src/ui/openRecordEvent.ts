/** CONNECT-002: one tap on a [[link]] or a Connections entry opens the record it names. */
export const OPEN_RECORD_EVENT = "beyond:open-record";
export type OpenRecordTarget =
  | { kind: "TASK"; id: string } | { kind: "PROJECT"; id: string } | { kind: "DAY"; id: string }
  | { kind: "JOURNAL"; id: string } | { kind: "HIGHLIGHT"; id: string };
export function openRecord(target: OpenRecordTarget): void {
  window.dispatchEvent(new CustomEvent<OpenRecordTarget>(OPEN_RECORD_EVENT, { detail: target }));
}
