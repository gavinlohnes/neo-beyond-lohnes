# GRAYSON-MEAL-LOOKUP-001 — Delta logs meals from real numbers

Owner authorization: Gavin, 2026-11-27. Slice A moved to Launch 1.0 as row A1; slices B and C remain deferred to
Launch 1.1 and are unchanged by this decision record.

## Slice A: USDA search numbers are right

- Search requests name USDA's supported `Foundation`, `SR Legacy`, `Survey (FNDDS)` and `Branded` data types
  explicitly.
- USDA standardizes Branded nutrient values to a 100 g or 100 ml basis. When a branded search row gives a gram or
  milliliter serving, BEYOND scales calories, protein, carbs, fat, fiber and sodium to that serving and labels it with
  normalized `g` or `ml` units.
- When a branded serving unit cannot identify the 100-unit basis, BEYOND does not guess a conversion and labels the
  returned numbers `100 g`.
- The existing meal-search review and logging flow is otherwise unchanged. Search remains a live, uncached proposal;
  manual entry remains available when lookup fails.

Live evidence on 2026-11-27: USDA `/foods/search`, filtered to `Branded`, returned Cheerios FDC `2517161` with a
20 `GRM` serving and 359 kcal per 100 g. The corrected result is 71.8 kcal per 20 g serving.

Slices B and C—Delta lookup/tool authority, source fields, Open Food Facts name search, settings, usual-meal matching,
CSV/backup changes and free-helper lookup—are explicitly not implemented here.
