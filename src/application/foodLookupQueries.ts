/**
 * NUTRITION-002 (2026-09-02, owner-approved — see docs/agent/CAPABILITY_MAP.md's
 * NUTRITION entry: "USDA FoodData Central as the preferred food-lookup data
 * source... Own the UX/logs/intelligence; do not build a proprietary food
 * database."). This module is a thin, uncached passthrough to USDA's public
 * FoodData Central Search API — it never stores a local copy of USDA's food
 * database (each search is a live network call), matching that ruling
 * exactly. A search result is always a PROPOSAL: BodyScreen only ever uses
 * it to pre-fill the existing "ADD MEAL" form, which the operator must
 * still review and submit — this module writes nothing to Dexie itself.
 *
 * API key: FoodData Central requires a key on every request. This is a
 * fully static, client-side-only PWA with no backend to hide a secret
 * behind, and FDC keys are free, low-stakes, and trivially regenerated —
 * so VITE_USDA_FDC_API_KEY is read as a plain build-time Vite env var (see
 * vite-env.d.ts), wired only in .github/workflows/deploy-pages.yml's build
 * step from an optional USDA_FDC_API_KEY repo secret. When absent (any
 * local/PR build, or a production deploy before that secret is set), this
 * falls back to USDA's own public "DEMO_KEY" — functional but rate-limited
 * rather than broken.
 *
 * Network/parsing failures degrade gracefully per the Product Constitution's
 * "graceful degradation": a failed or malformed search returns an empty
 * array rather than throwing, and manual macro entry — the pre-existing
 * "ADD MEAL" form — remains fully available regardless of search outcome.
 */

export interface FoodSearchResult {
  fdcId: number;
  description: string;
  brandOwner?: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  /** What the four macros above are measured per, e.g. "100 g" or "240 ml" — always shown, never assumed. */
  servingDescription: string;
}

const FDC_SEARCH_URL = "https://api.nal.usda.gov/fdc/v1/foods/search";

// USDA's own stable nutrient ids (https://fdc.nal.usda.gov/) — matched by
// id, not name, since branded-food nutrient names vary slightly (e.g.
// "Total lipid (fat)" vs "Total Fat") while ids stay constant across every
// FDC data type.
const NUTRIENT_ID = { CALORIES: 1008, PROTEIN: 1003, CARBS: 1005, FAT: 1004 } as const;

interface RawFoodNutrient {
  nutrientId?: number;
  unitName?: string;
  value?: number;
}

interface RawFood {
  fdcId?: number;
  description?: string;
  brandOwner?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  foodNutrients?: RawFoodNutrient[];
}

interface RawSearchResponse {
  foods?: RawFood[];
}

function resolveApiKey(): string {
  return import.meta.env.VITE_USDA_FDC_API_KEY?.trim() || "DEMO_KEY";
}

function macroValue(nutrients: RawFoodNutrient[], nutrientId: number, expectedUnit: string): number | null {
  const match = nutrients.find((n) => n.nutrientId === nutrientId);
  if (!match || typeof match.value !== "number" || match.unitName?.toUpperCase() !== expectedUnit) return null;
  return match.value;
}

// Excludes rather than defaults-to-zero any food missing one of the four
// required macros in the expected unit — inventing a 0 would be silent
// wrong data, which the Trust Contract forbids ("must never pretend to
// know more than it knows"). A skipped result just doesn't appear in the
// list; manual entry remains available regardless.
function toSearchResult(raw: RawFood): FoodSearchResult | null {
  if (typeof raw.fdcId !== "number" || !raw.description) return null;
  const nutrients = raw.foodNutrients ?? [];
  const calories = macroValue(nutrients, NUTRIENT_ID.CALORIES, "KCAL");
  const proteinG = macroValue(nutrients, NUTRIENT_ID.PROTEIN, "G");
  const carbsG = macroValue(nutrients, NUTRIENT_ID.CARBS, "G");
  const fatG = macroValue(nutrients, NUTRIENT_ID.FAT, "G");
  if (calories === null || proteinG === null || carbsG === null || fatG === null) return null;

  const servingDescription =
    typeof raw.servingSize === "number" && raw.servingSizeUnit ? `${raw.servingSize} ${raw.servingSizeUnit}` : "100 g";

  return {
    fdcId: raw.fdcId,
    description: raw.description,
    ...(raw.brandOwner ? { brandOwner: raw.brandOwner } : {}),
    calories,
    proteinG,
    carbsG,
    fatG,
    servingDescription,
  };
}

/**
 * Never throws — a network failure, non-OK response, or malformed payload
 * all resolve to an empty array so the caller's UI can show "no results"
 * rather than an error boundary for what is always an optional lookup.
 * `fetchImpl` exists only so tests can inject a fake without touching the
 * real network.
 */
export async function searchFoods(query: string, options?: { fetchImpl?: typeof fetch }): Promise<FoodSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const doFetch = options?.fetchImpl ?? fetch;
  const url = new URL(FDC_SEARCH_URL);
  url.searchParams.set("query", trimmed);
  url.searchParams.set("pageSize", "10");
  url.searchParams.set("api_key", resolveApiKey());

  try {
    const response = await doFetch(url.toString());
    if (!response.ok) return [];
    const data = (await response.json()) as RawSearchResponse;
    const foods = data.foods ?? [];
    return foods.map(toSearchResult).filter((f): f is FoodSearchResult => f !== null);
  } catch {
    return [];
  }
}
