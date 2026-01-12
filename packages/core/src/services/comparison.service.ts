import type { Product, ProductComparison, NutrientComparison, ScoreComparison } from '../types/product.types.js';
import { getNutritionService } from './nutrition.service.js';

/**
 * Product Comparison Service
 */
export class ComparisonService {
  private nutritionService = getNutritionService();

  /**
   * Compare two or more products
   */
  compare(products: Product[]): ProductComparison {
    if (products.length < 2) {
      throw new Error('At least 2 products required for comparison');
    }

    const nutritionComparison = this.compareNutrients(products);
    const scoreComparison = this.compareScores(products);
    const winner = this.determineWinner(products, nutritionComparison);

    return {
      products,
      comparison: {
        winner: winner
          ? { barcode: winner.barcode, reason: winner.reason }
          : undefined,
        nutritionComparison,
        scoreComparison,
        summary: this.generateSummary(products, winner),
      },
    };
  }

  /**
   * Find healthier alternatives
   */
  findHealthierAlternative(
    original: Product,
    alternatives: Product[],
  ): { alternative: Product; improvements: string[] } | null {
    let best: { product: Product; score: number; improvements: string[] } | null = null;

    for (const alt of alternatives) {
      if (alt.barcode === original.barcode) continue;

      const { score, improvements } = this.scoreHealthiness(original, alt);

      if (score > 0 && (!best || score > best.score)) {
        best = { product: alt, score, improvements };
      }
    }

    return best ? { alternative: best.product, improvements: best.improvements } : null;
  }

  /**
   * Compare nutrient density
   */
  compareNutrientDensity(products: Product[]): {
    ranking: { barcode: string; name: string; density: number }[];
    best: string;
  } {
    const ranking = products
      .map((p) => ({
        barcode: p.barcode,
        name: p.name,
        density: this.nutritionService.calculateNutrientDensity(p),
      }))
      .sort((a, b) => b.density - a.density);

    return {
      ranking,
      best: ranking[0]?.barcode ?? '',
    };
  }

  /**
   * Compare by specific nutrient
   */
  rankByNutrient(
    products: Product[],
    nutrientId: string,
    ascending = true,
  ): { barcode: string; name: string; value: number }[] {
    return products
      .map((p) => {
        const nutrient = p.nutrients.find((n) => n.id === nutrientId);
        return {
          barcode: p.barcode,
          name: p.name,
          value: nutrient?.value ?? 0,
        };
      })
      .sort((a, b) => ascending ? a.value - b.value : b.value - a.value);
  }

  /**
   * Compare nutrients between products
   */
  private compareNutrients(products: Product[]): NutrientComparison[] {
    const comparisons: NutrientComparison[] = [];
    const nutrientIds = new Set<string>();

    // Collect all nutrient IDs
    for (const p of products) {
      for (const n of p.nutrients) {
        nutrientIds.add(n.id);
      }
    }

    // Compare each nutrient
    for (const id of nutrientIds) {
      const values: { barcode: string; value: number; unit: string }[] = [];
      let betterBarcode: string | undefined;
      let betterValue: number | undefined;

      // For these, lower is better
      const lowerIsBetter = ['sodium', 'saturated_fat', 'sugars', 'cholesterol', 'energy_kcal'];
      const lowerBetter = lowerIsBetter.includes(id);

      for (const p of products) {
        const nutrient = p.nutrients.find((n) => n.id === id);
        const value = nutrient?.value ?? 0;
        const unit = nutrient?.unit ?? 'g';

        values.push({ barcode: p.barcode, value, unit });

        if (betterValue === undefined) {
          betterValue = value;
          betterBarcode = p.barcode;
        } else {
          const isBetter = lowerBetter ? value < betterValue : value > betterValue;
          if (isBetter) {
            betterValue = value;
            betterBarcode = p.barcode;
          }
        }
      }

      const nutrient = products[0]?.nutrients.find((n) => n.id === id);

      comparisons.push({
        nutrientId: id,
        name: nutrient?.name ?? id,
        values,
        better: betterBarcode,
      });
    }

    return comparisons;
  }

  /**
   * Compare scores (Nutri-Score, Eco-Score, NOVA)
   */
  private compareScores(products: Product[]): ScoreComparison {
    return {
      nutriScore: products
        .filter((p) => p.nutriScore)
        .map((p) => ({ barcode: p.barcode, grade: p.nutriScore!.grade })),
      ecoScore: products
        .filter((p) => p.ecoScore)
        .map((p) => ({ barcode: p.barcode, grade: p.ecoScore!.grade })),
      novaGroup: products
        .filter((p) => p.novaGroup)
        .map((p) => ({ barcode: p.barcode, group: p.novaGroup! })),
    };
  }

  /**
   * Determine overall winner
   */
  private determineWinner(
    products: Product[],
    nutritionComparison: NutrientComparison[],
  ): { barcode: string; reason: string } | null {
    const scores: Record<string, number> = {};

    // Initialize
    for (const p of products) {
      scores[p.barcode] = 0;
    }

    // Score based on nutrient comparisons
    for (const comp of nutritionComparison) {
      if (comp.better) {
        scores[comp.better]!++;
      }
    }

    // Bonus for better Nutri-Score
    const nutriScoreOrder = ['A', 'B', 'C', 'D', 'E'];
    const sortedByNutriScore = [...products]
      .filter((p) => p.nutriScore)
      .sort((a, b) => {
        const aIdx = nutriScoreOrder.indexOf(a.nutriScore!.grade);
        const bIdx = nutriScoreOrder.indexOf(b.nutriScore!.grade);
        return aIdx - bIdx;
      });

    if (sortedByNutriScore.length > 0) {
      scores[sortedByNutriScore[0]!.barcode]! += 3;
    }

    // Find winner
    let winner: string | null = null;
    let maxScore = 0;

    for (const [barcode, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        winner = barcode;
      }
    }

    if (!winner) return null;

    const winnerProduct = products.find((p) => p.barcode === winner);
    const reason = winnerProduct?.nutriScore
      ? `Better overall nutrition with Nutri-Score ${winnerProduct.nutriScore.grade}`
      : 'Better overall nutritional profile';

    return { barcode: winner, reason };
  }

  /**
   * Score healthiness improvement
   */
  private scoreHealthiness(
    original: Product,
    alternative: Product,
  ): { score: number; improvements: string[] } {
    let score = 0;
    const improvements: string[] = [];

    // Compare Nutri-Score
    if (original.nutriScore && alternative.nutriScore) {
      const order = ['A', 'B', 'C', 'D', 'E'];
      const origIdx = order.indexOf(original.nutriScore.grade);
      const altIdx = order.indexOf(alternative.nutriScore.grade);
      if (altIdx < origIdx) {
        score += (origIdx - altIdx) * 2;
        improvements.push(`Better Nutri-Score: ${alternative.nutriScore.grade} vs ${original.nutriScore.grade}`);
      }
    }

    // Compare key nutrients
    const nutrientComparisons = [
      { id: 'sodium', name: 'sodium', lowerBetter: true },
      { id: 'saturated_fat', name: 'saturated fat', lowerBetter: true },
      { id: 'sugars', name: 'sugar', lowerBetter: true },
      { id: 'fiber', name: 'fiber', lowerBetter: false },
      { id: 'protein', name: 'protein', lowerBetter: false },
    ];

    for (const { id, name, lowerBetter } of nutrientComparisons) {
      const origValue = original.nutrients.find((n) => n.id === id)?.value ?? 0;
      const altValue = alternative.nutrients.find((n) => n.id === id)?.value ?? 0;

      const isBetter = lowerBetter ? altValue < origValue : altValue > origValue;
      const diff = Math.abs(altValue - origValue);

      if (isBetter && diff > origValue * 0.1) {
        score++;
        const direction = lowerBetter ? 'Less' : 'More';
        improvements.push(`${direction} ${name}: ${altValue.toFixed(1)} vs ${origValue.toFixed(1)}`);
      }
    }

    return { score, improvements };
  }

  /**
   * Generate comparison summary
   */
  private generateSummary(
    products: Product[],
    winner: { barcode: string; reason: string } | null,
  ): string {
    const names = products.map((p) => p.name).join(' vs ');

    if (!winner) {
      return `Comparison of ${names}: No clear winner determined.`;
    }

    const winnerProduct = products.find((p) => p.barcode === winner.barcode);
    return `Comparison of ${names}: ${winnerProduct?.name ?? 'Unknown'} is the healthier choice. ${winner.reason}`;
  }
}

// Singleton
let instance: ComparisonService | null = null;

export function getComparisonService(): ComparisonService {
  if (!instance) {
    instance = new ComparisonService();
  }
  return instance;
}
