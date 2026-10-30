import type { FoodSearchResult } from "./foodLookupQueries";

/**
 * FOOD-001 (owner go 2026-10-30: barcode scanning, Open Food Facts as the provider): one product by
 * its barcode from Open Food Facts' public API. Like the USDA search it is a live, uncached lookup and
 * only ever pre-fills a form; nothing from Open Food Facts' database is kept except what the owner
 * logs. Data © Open Food Facts contributors, ODbL — the sheet says so beside every result.
 * Never throws: an unknown barcode, a product without the four macros, or a network failure is null.
 */
const OFF_PRODUCT_URL = "https://world.openfoodfacts.org/api/v2/product/";
const FIELDS = "product_name,brands,serving_size,serving_quantity,nutriments";

type Nutriments = Record<string, number | string | undefined>;
interface RawProduct { product_name?: string; brands?: string; serving_size?: string; serving_quantity?: number | string; nutriments?: Nutriments }

function num(value: unknown): number | null {
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isFinite(n) && n >= 0 ? n : null;
}

/** Per serving when the product gives one; otherwise per 100 g, said so. */
export function toBarcodeResult(code: string, product: RawProduct): FoodSearchResult | null {
  const name = product.product_name?.trim();
  if (!name) return null;
  const n = product.nutriments ?? {};
  const read = (suffix: string) => ({
    calories: num(n[`energy-kcal${suffix}`]), proteinG: num(n[`proteins${suffix}`]), carbsG: num(n[`carbohydrates${suffix}`]), fatG: num(n[`fat${suffix}`]),
  });
  const serving = read("_serving");
  const per100 = read("_100g");
  const complete = (m: ReturnType<typeof read>) => m.calories !== null && m.proteinG !== null && m.carbsG !== null && m.fatG !== null;
  const useServing = complete(serving) && !!product.serving_size;
  const macros = useServing ? serving : complete(per100) ? per100 : null;
  if (!macros) return null;
  return {
    fdcId: Number(code),
    description: name,
    ...(product.brands ? { brandOwner: product.brands.split(",")[0]!.trim() } : {}),
    calories: macros.calories!, proteinG: macros.proteinG!, carbsG: macros.carbsG!, fatG: macros.fatG!,
    servingDescription: useServing ? product.serving_size!.trim() : "100 g",
  };
}

export async function lookupBarcode(code: string, options?: { fetchImpl?: typeof fetch }): Promise<FoodSearchResult | null> {
  const digits = code.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 14) return null;
  try {
    const response = await (options?.fetchImpl ?? fetch)(`${OFF_PRODUCT_URL}${digits}.json?fields=${FIELDS}`);
    if (!response.ok) return null;
    const data = (await response.json()) as { status?: number; product?: RawProduct };
    return data.status === 1 && data.product ? toBarcodeResult(digits, data.product) : null;
  } catch {
    return null;
  }
}
