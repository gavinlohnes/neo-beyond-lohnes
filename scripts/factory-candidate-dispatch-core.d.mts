export const CANDIDATE_STATE: Readonly<Record<string, string>>;
export function candidateIdentity(input: Record<string, unknown>): Readonly<Record<string, unknown>>;
export function candidateMarker(identity: Record<string, unknown>, headSha: string, sourceHeadSha?: string): Record<string, unknown>;
export function reconcileCandidates(input: Record<string, unknown>): Record<string, unknown>;
export function dispatchEnvelope(input: Record<string, unknown>): Record<string, unknown>;
