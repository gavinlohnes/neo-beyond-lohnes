export interface CandidateTarget { campaign_id: string; campaign_revision: string; campaign_digest: string; drop_id: string; baseline: string; contract: { path: string; digest: string } }
export interface CandidateIdentity extends CandidateTarget { key: string; canonical: string }
export function candidateIdentity(target: CandidateTarget): CandidateIdentity;
export function candidateMarker(target: CandidateTarget): Record<string, unknown>;
export function parseCandidateMarker(body: string): { marker?: Record<string, unknown>; error?: string };
export function reconcileCandidates(input: { target: CandidateTarget; candidates?: Array<Record<string, unknown>> }): Record<string, unknown>;
