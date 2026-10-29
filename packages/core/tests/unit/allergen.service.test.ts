import { describe, it, expect } from 'vitest';
import { AllergenService } from '../../src/services/allergen.service.js';
import { mapOFFProduct } from '../../src/providers/openfoodfacts/mapper.js';
import type { OFFProduct } from '../../src/providers/openfoodfacts/types.js';
import { fixture } from '../helpers/fetch-stub.js';
import { makeProduct, nutrient } from '../helpers/products.js';

const service = new AllergenService();
const nutella = mapOFFProduct(fixture<{ product: OFFProduct }>('off-product-3017620422003.json').product);
const prince = mapOFFProduct(fixture<{ product: OFFProduct }>('off-product-7622210449283.json').product);

describe('AllergenService.checkAllergen', () => {
  it('detects declared allergens', () => {
    expect(service.checkAllergen(nutella, 'dairy').safe).toBe(false);
    expect(service.checkAllergen(nutella, 'peanuts').safe).toBe(true);
  });

  it('treats a gluten declaration as a possible wheat source', () => {
    const result = service.checkAllergen(prince, 'wheat');
    expect(result.safe).toBe(false);
    expect(result.note).toMatch(/gluten/);
  });

  it('flags traces', () => {
    const result = service.checkAllergen(prince, 'eggs');
    expect(result.safe).toBe(false);
  });
});

describe('AllergenService.checkDietCompliance', () => {
  it('rejects Nutella for vegans (milk) and accepts it for vegetarians', () => {
    expect(service.checkDietCompliance(nutella, 'vegan').verdict).toBe('not_compliant');
    expect(service.checkDietCompliance(nutella, 'vegetarian').verdict).toBe('compliant');
  });

  it('does not confuse plant-based phrases with animal products', () => {
    const product = makeProduct({
      ingredientsText: 'Eggplant, coconut milk, peanut butter, cocoa butter, salt',
      ingredientsAnalysis: { vegan: 'yes', vegetarian: 'yes', palmOilFree: 'yes' },
    });
    const result = service.checkDietCompliance(product, 'vegan');
    expect(result.verdict).toBe('compliant');
    expect(result.violations).toEqual([]);
  });

  it('detects Spanish and French animal ingredients without OFF analysis', () => {
    const es = makeProduct({ ingredientsText: 'harina de trigo, huevo, azúcar' });
    const fr = makeProduct({ ingredientsText: 'farine, sucre, lait écrémé' });
    expect(service.checkDietCompliance(es, 'vegan').verdict).toBe('not_compliant');
    expect(service.checkDietCompliance(fr, 'vegan').verdict).toBe('not_compliant');
  });

  it('uses per-100 g sodium in mg for low_sodium (EU claim: 120 mg)', () => {
    expect(service.checkDietCompliance(nutella, 'low_sodium').verdict).toBe('compliant');
    const salty = makeProduct({ nutrients: [nutrient('sodium', 600, 'mg')] });
    expect(service.checkDietCompliance(salty, 'low_sodium').verdict).toBe('not_compliant');
  });

  it('is uncertain without data', () => {
    expect(service.checkDietCompliance(makeProduct(), 'low_sugar').verdict).toBe('uncertain');
    expect(service.checkDietCompliance(makeProduct(), 'vegan').verdict).toBe('uncertain');
  });

  it('uses net carbs for keto', () => {
    const product = makeProduct({ nutrients: [nutrient('carbohydrates', 14), nutrient('fiber', 9)] });
    expect(service.checkDietCompliance(product, 'keto').verdict).toBe('compliant');
  });

  it('requires a certification label for halal/kosher', () => {
    expect(service.checkDietCompliance(makeProduct({ ingredientsText: 'water' }), 'halal').verdict).toBe('uncertain');
    expect(service.checkDietCompliance(makeProduct({ ingredientsText: 'water', labels: ['halal'] }), 'halal').verdict).toBe('compliant');
  });
});
