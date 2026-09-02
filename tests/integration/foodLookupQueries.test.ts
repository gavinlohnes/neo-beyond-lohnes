import { describe, expect, it, vi } from "vitest";
import { searchFoods } from "../../src/application/foodLookupQueries";

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
