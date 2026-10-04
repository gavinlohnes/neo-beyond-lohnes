export interface BuilderIdentityInput {
  installation: { id?: number | string; app_id?: number | string; app_slug?: string };
  expectedAppId: number | string;
  expectedInstallationId: number | string;
  expectedSlug: string;
}

export function verifyBuilderInstallation(input: BuilderIdentityInput): {
  app_slug: string;
  installation_id: number | string;
};
export function verifyBuilderBot(user: { login?: string; type?: string }, expectedSlug: string): string;

export function replacementBranchName(sourceSha: string): string;
export function replaceCandidateRouting(text: string, replacementUrl: string, replacementBranch: string): string;
export function candidateBranchName(dropId: string, sourceSha: string): string;
export function routeCandidate(text: string, input: {
  dropId: string;
  sourceBranch: string;
  candidateUrl: string;
  candidateBranch: string;
}): string;
