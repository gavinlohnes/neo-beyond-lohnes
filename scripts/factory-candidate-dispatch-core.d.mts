export interface CandidateIdentity {
  campaign_id: string;
  campaign_revision: string;
  campaign_digest: string;
  drop_id: string;
  activation_baseline: string;
  protected_contract: { path: string; sha256: string };
}

export const CANDIDATE_MARKER: string;
export function protectedContractIdentity(input: { path: string; content: string }): CandidateIdentity["protected_contract"];
export function candidateIdentity(input: CandidateIdentity): CandidateIdentity;
export function encodeCandidateMarker(identity: CandidateIdentity): string;
export function parseCandidateMarker(body: string): { state: string; identity?: CandidateIdentity; code?: string };
export function reconcileCandidates(input: {
  expected_identity: CandidateIdentity;
  expected_builder_login: string;
  candidates?: Array<Record<string, unknown>>;
  evidence_source?: string;
}): Record<string, unknown>;
