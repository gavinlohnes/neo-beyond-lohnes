export const NEXT_ACTION: Readonly<Record<string, string>>;

export interface FactoryAutopilotResult {
  ok: boolean;
  action: string;
  campaign_id?: string;
  drop_id?: string;
  head_sha?: string;
  integration_sha?: string;
  reviewed_shas?: string[];
  escalation?: { code: string; detail: string };
}

export function deriveNextAction(input: Record<string, unknown>): FactoryAutopilotResult;

export function normalizeReviewEvidence(text: unknown): {
  reviewed_sha: string;
  verdict: string;
  findings: string;
  merge_readiness: string;
} | null;
