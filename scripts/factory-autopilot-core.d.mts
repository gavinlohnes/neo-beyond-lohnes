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
export function reconcileActiveDrops(candidates: Array<Record<string, unknown>>): { active?: Record<string, unknown> | null; error?: string; ids?: string[] };
export function validateCampaignAuthorization(input: Record<string, unknown>): Record<string, unknown>;
export function canonicalCampaignPayload(campaign: Record<string, unknown>): string;
export function campaignDigest(campaign: Record<string, unknown>): string;
