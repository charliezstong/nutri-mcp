# Data Sources

| Source | Used for | Key | Limits enforced locally |
|--------|----------|-----|------------------------|
| [Open Food Facts](https://world.openfoodfacts.org) product API **v3.4** | Products, nutrients, Nutri-Score, Green-Score, NOVA, ingredients, allergens, additives | No | 15 reads/min |
| [search-a-licious](https://search.openfoodfacts.org) | `searchProducts`, category search for alternatives (legacy `cgi/search.pl` as fallback) | No | 10 searches/min |
| [Open Prices](https://prices.openfoodfacts.org) | All price tools | No | 60/min |
| [Robotoff](https://robotoff.openfoodfacts.org) | `getProductInsights`, `getAIQuestions` | No | 60/min |
| OFF additives taxonomy | Additive names, functions, EFSA over-exposure risk (downloaded once, cached 24 h) | No | – |
| [openFDA food enforcement](https://open.fda.gov/apis/food/enforcement/) | `checkRecalls` (US recalls, updated weekly) | No | 240/min |
| [USDA FoodData Central](https://fdc.nal.usda.gov) | US branded foods by GTIN, nutrient gap filling | `USDA_API_KEY` (free) | 1,000/hour |
| [Nutritionix](https://www.nutritionix.com/api) | UPC lookup, `estimateNutritionFromText` | `NUTRITIONIX_APP_ID` + `NUTRITIONIX_APP_KEY` (paid) | 200/day |

## Open Food Facts

- The product API is pinned to **v3.4**: it keeps the flat `nutriments` object and exposes the renamed `environmental_score_*` fields. (v3.5+ moves nutrition data to `nutrition.aggregated_set`.)
- `nutriments.<nutrient>_100g` values are in **grams** (energy in kcal/kJ, alcohol in % vol). The mapper converts sodium, cholesterol, caffeine and minerals to mg and vitamins A, D, K, B9, B12 and selenium to mcg before computing % Daily Value.
- Nutri-Score uses the **2023** algorithm when OFF has computed it, with the negative (energy, sugars, saturated fat, salt) and positive (fiber, protein, fruits/vegetables/legumes) components and their points. Grades `unknown`/`not-applicable` are reported as "not available".
- **Green-Score** (renamed from Eco-Score in 2025) grades are `A+`, `A`–`F`.
- `ingredients_analysis_tags` (vegan / vegetarian / palm oil) drive the diet checks, with multilingual keyword matching as a fallback.
- OFF tags wheat-based products with `en:gluten`; `checkAllergen(wheat)` therefore reports gluten as a possible wheat source.
- Every request sends `User-Agent: nutri-mcp/<version> (<OFF_CONTACT_EMAIL or repository URL>)`.
- Set `OFF_BASE_URL=https://world.openfoodfacts.net` to use the staging server.

## Open Prices

- Prices are crowdsourced and backed by receipts or price-tag photos (`proofType`).
- The API has no country filter, so `country` is applied client-side to the newest 100 prices.
- Statistics, history and comparisons are always computed per currency.

## openFDA

- Searches `product_description` and `code_info` for the UPC spellings of a barcode, then the product name and brand. Matches by text are possible, not certain (`matchedBy: "text"`).
- US only; FDA asks not to rely on openFDA for medical decisions.

## USDA FoodData Central

- Barcode lookups search Branded Foods and match `gtinUpc` ignoring leading zeros (USDA mixes 12-digit UPCs and 14-digit GTINs).
- Details come from `/food/{fdcId}` (nested nutrient shape); search results use the flat shape. Both are supported.

## Nutritionix

- Nutritionix closed its public free tier; trials are available on request.
- Values are per serving; they are normalized to per 100 g using the serving weight so they compare with other sources.

## Merging

`getProductByBarcode` queries every configured source in parallel. The first result (Open Food Facts when it knows the barcode) is the base record; other sources fill missing nutrients, brand, quantity, serving and ingredients, and allergen lists are combined. If every source fails, the error is returned instead of "not found".

## Licenses

Open Food Facts and Open Prices data: [Open Database License](https://opendatacommons.org/licenses/odbl/1-0/). openFDA: public domain. USDA FoodData Central: public domain (CC0). Nutritionix: commercial terms.

## Adding a source

See [architecture.md](architecture.md#adding-a-provider).
