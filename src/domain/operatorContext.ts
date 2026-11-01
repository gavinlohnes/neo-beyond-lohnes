/** Disposable read model. Canonical records keep their existing owners and lifecycles. */
export type ContextKind = "MISSION" | "MEMORY" | "ALFRED_MEMORY" | "DAY" | "OBLIGATION" | "SCHEDULE"
  | "PROJECT" | "ROUTINE" | "CURRENT_DAY" | "WORK" | "CHECK_IN" | "FOOD" | "QUIT"
  | "TARGETS" | "FORECAST" | "MEASURED" | "SLEEP_SUMMARY" | "NOTE" | "SAVED_MEAL";
export type ContextClassification = "Operator statement" | "Recorded event" | "Measurement" | "Configured forecast" | "Derived from records";
export interface ContextSource {
  key: string; kind: ContextKind; id: string; revision: string; title: string; text: string;
  classification: ContextClassification;
  lifecycle: string;
  at?: string; confirmedAt?: string;
  /** A source's own date is not a claim that the operator is currently available or recovered. */
  freshness: string;
  truncated?: boolean;
}
export interface ContextCoverage {
  category: string; state: "available" | "empty" | "excluded" | "unavailable" | "partial";
  count: number; supplied: number;
}
export interface OperatorContext {
  readAt: string; purpose: "conversation" | "automatic" | "local";
  sources: ContextSource[]; coverage: ContextCoverage[]; omitted: number; text: string;
  /** Exact, local-only fingerprint. Never serialized into the provider request. */
  recordVersion: string;
  taskVersions: Record<string, string>; routineVersions: Record<string, string>;
}
