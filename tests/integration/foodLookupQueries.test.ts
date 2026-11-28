import { describe, expect, it, vi } from "vitest";
import { searchFoods, USDA_SEARCH_DATA_TYPES } from "../../src/application/foodLookupQueries";

/**
 * NUTRITION-002 (2026-09-02). USDA's live FoodData Central API is not
 * reachable from this sandbox's network policy, so these tests exercise
 * the module's own parsing/abstention logic against hand-built payloads
 * shaped exactly like FDC's documented /foods/search response (fdcId,
 * description, foodNutrients[] keyed by USDA's stable nutrientId) — never
 * against the real network. searchFoods accepts an injectable fetchImpl
 * for exactly this reason.
 */

function fakeFetch(body: unknown, ok = true): typeof fetch {
  return vi.fn(async () => ({
    ok,
    json: async () => body,
  })) as unknown as typeof fetch;
}

const BANANA_FOOD = {
  fdcId: 1105073,
  description: "Bananas, raw",
  servingSize: 100,
  servingSizeUnit: "g",
  foodNutrients: [
    { nutrientId: 1008, nutrientName: "Energy", unitName: "KCAL", value: 89 },
    { nutrientId: 1003, nutrientName: "Protein", unitName: "G", value: 1.09 },
    { nutrientId: 1005, nutrientName: "Carbohydrate, by difference", unitName: "G", value: 22.8 },
    { nutrientId: 1004, nutrientName: "Total lipid (fat)", unitName: "G", value: 0.33 },
  ],
};

/** Recorded from USDA's live Branded search on 2026-11-27; nutrient values are the documented per-100 g basis. */
const BRANDED_CEREAL = {
  fdcId: 2517161,
  description: "Cheerios Cereal",
  brandOwner: "General Mills",
  dataType: "Branded",
  servingSize: 20,
  servingSizeUnit: "GRM",
  foodNutrients: [
    { nutrientId: 1008, unitName: "KCAL", value: 359 },
    { nutrientId: 1003, unitName: "G", value: 12.8 },
    { nutrientId: 1005, unitName: "G", value: 74.4 },
    { nutrientId: 1004, unitName: "G", value: 6.41 },
    { nutrientId: 1079, unitName: "G", value: 9.2 },
    { nutrientId: 1093, unitName: "MG", value: 412 },
  ],
};

describe("searchFoods", () => {
  it("returns an empty array for blank queries without calling fetch", async () => {
    const fetchImpl = fakeFetch({ foods: [] });
    expect(await searchFoods("   ", { fetchImpl })).toEqual([]);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("parses a well-formed FDC response into FoodSearchResult", async () => {
    const results = await searchFoods("banana", { fetchImpl: fakeFetch({ foods: [BANANA_FOOD] }) });
    expect(results).toEqual([
      {
        fdcId: 1105073,
        description: "Bananas, raw",
        calories: 89,
        proteinG: 1.09,
        carbsG: 22.8,
        fatG: 0.33,
        servingDescription: "100 g",
      },
    ]);
  });

  it("sends every approved USDA data type explicitly", async () => {
    const fetchImpl = fakeFetch({ foods: [] });
    await searchFoods("egg", { fetchImpl });
    const [url, init] = vi.mocked(fetchImpl).mock.calls[0]!;
    expect(new URL(String(url)).searchParams.get("api_key")).toBeTruthy();
    expect(init).toMatchObject({ method: "POST", headers: { "Content-Type": "application/json" } });
    expect(JSON.parse(String(init?.body))).toEqual({ query: "egg", pageSize: 10, dataType: USDA_SEARCH_DATA_TYPES });
    expect(USDA_SEARCH_DATA_TYPES).toEqual(["Foundation", "SR Legacy", "Survey (FNDDS)", "Branded"]);
  });

  it("scales a recorded branded per-100 g response to the label's gram serving", async () => {
    const [result] = await searchFoods("cheerios", { fetchImpl: fakeFetch({ foods: [BRANDED_CEREAL] }) });
    expect(result).toMatchObject({ fdcId: 2517161, servingDescription: "20 g", calories: 71.8 });
    expect(result!.proteinG).toBeCloseTo(2.56);
    expect(result!.carbsG).toBeCloseTo(14.88);
    expect(result!.fatG).toBeCloseTo(1.282);
    expect(result!.fiberG).toBeCloseTo(1.84);
    expect(result!.sodiumMg).toBeCloseTo(82.4);
  });

  it("scales branded milliliter servings, including USDA's MLT unit", async () => {
    const milk = { ...BRANDED_CEREAL, fdcId: 2, description: "Drink", servingSize: 240, servingSizeUnit: "MLT" };
    const [result] = await searchFoods("drink", { fetchImpl: fakeFetch({ foods: [milk] }) });
    expect(result).toMatchObject({ servingDescription: "240 ml", calories: 861.6 });
    expect(result!.proteinG).toBeCloseTo(30.72);
  });

  it("does not claim per-serving numbers when a branded serving unit cannot be converted", async () => {
    const each = { ...BRANDED_CEREAL, servingSize: 1, servingSizeUnit: "container" };
    const [result] = await searchFoods("cereal", { fetchImpl: fakeFetch({ foods: [each] }) });
    expect(result).toMatchObject({ servingDescription: "100 g", calories: 359, proteinG: 12.8 });
  });

  it.each([
    { dataType: "Foundation", fdcId: 747997, description: "Eggs, Grade A, Large, egg white", calories: 55, proteinG: 10.7, carbsG: 2.36, fatG: 0 },
    { dataType: "SR Legacy", fdcId: 174901, description: "Bagels, egg", calories: 278, proteinG: 10.6, carbsG: 53, fatG: 2.1 },
    { dataType: "Survey (FNDDS)", fdcId: 2707180, description: "Egg, Benedict", calories: 288, proteinG: 13.81, carbsG: 8.48, fatG: 22.1 },
  ])("keeps a recorded $dataType response on its returned 100 g basis", async ({ dataType, fdcId, description, calories, proteinG, carbsG, fatG }) => {
    const food = { dataType, fdcId, description, foodNutrients: [
      { nutrientId: 1008, unitName: "KCAL", value: calories }, { nutrientId: 1003, unitName: "G", value: proteinG },
      { nutrientId: 1005, unitName: "G", value: carbsG }, { nutrientId: 1004, unitName: "G", value: fatG },
    ] };
    const [result] = await searchFoods("egg", { fetchImpl: fakeFetch({ foods: [food] }) });
    expect(result).toMatchObject({ fdcId, description, servingDescription: "100 g", calories, proteinG, carbsG, fatG });
  });

  it("includes brandOwner only when present", async () => {
    const results = await searchFoods("chips", {
      fetchImpl: fakeFetch({ foods: [{ ...BANANA_FOOD, brandOwner: "Acme Foods" }] }),
    });
    expect(results[0]?.brandOwner).toBe("Acme Foods");
  });

  it("falls back to '100 g' when servingSize/servingSizeUnit are absent", async () => {
    const { servingSize, servingSizeUnit, ...withoutServing } = BANANA_FOOD;
    void servingSize;
    void servingSizeUnit;
    const results = await searchFoods("banana", { fetchImpl: fakeFetch({ foods: [withoutServing] }) });
    expect(results[0]?.servingDescription).toBe("100 g");
  });

  it("excludes a food missing a required macro rather than defaulting it to zero", async () => {
    const missingFat = {
      ...BANANA_FOOD,
      foodNutrients: BANANA_FOOD.foodNutrients.filter((n) => n.nutrientId !== 1004),
    };
    const results = await searchFoods("banana", { fetchImpl: fakeFetch({ foods: [missingFat] }) });
    expect(results).toEqual([]);
  });

  it("excludes a food whose energy is reported in the wrong unit", async () => {
    const wrongUnit = {
      ...BANANA_FOOD,
      foodNutrients: BANANA_FOOD.foodNutrients.map((n) => (n.nutrientId === 1008 ? { ...n, unitName: "KJ" } : n)),
    };
    const results = await searchFoods("banana", { fetchImpl: fakeFetch({ foods: [wrongUnit] }) });
    expect(results).toEqual([]);
  });

  it("returns an empty array on a non-OK HTTP response rather than throwing", async () => {
    const results = await searchFoods("banana", { fetchImpl: fakeFetch({}, false) });
    expect(results).toEqual([]);
  });

  it("returns an empty array when the fetch itself rejects", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("network down");
    }) as unknown as typeof fetch;
    const results = await searchFoods("banana", { fetchImpl });
    expect(results).toEqual([]);
  });

  it("returns an empty array for a malformed payload (foods missing)", async () => {
    const results = await searchFoods("banana", { fetchImpl: fakeFetch({}) });
    expect(results).toEqual([]);
  });
});
