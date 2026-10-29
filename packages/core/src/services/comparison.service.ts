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
   * Rank by a specific nutrient. Products without data for it go last.
   */
  rankByNutrient(
    products: Product[],
    nutrientId: string,
    ascending = true,
  ): { barcode: string; name: string; value: number | null; unit?: string }[] {
    return products
      .map((p) => {
        const nutrient = p.nutrients.find((n) => n.id === nutrientId);
        return {
          barcode: p.barcode,
          name: p.name,
          value: nutrient?.value ?? null,
          unit: nutrient?.unit,
        };
      })
      .sort((a, b) => {
        if (a.value === null) return 1;
        if (b.value === null) return -1;
        return ascending ? a.value - b.value : b.value - a.value;
      });
  }

  /**
   * Compare nutrients between products. A product without data for a
   * nutrient is reported with value null and never "wins" that nutrient.
   */
  private compareNutrients(products: Product[]): NutrientComparison[] {
    const comparisons: NutrientComparison[] = [];
    const nutrientIds = new Set<string>();
    const lowerIsBetter = ['fat', 'sodium', 'salt', 'saturated_fat', 'trans_fat', 'sugars', 'added_sugars', 'cholesterol', 'energy_kcal', 'energy_kj'];

    for (const p of products) {
      for (const n of p.nutrients) {
        nutrientIds.add(n.id);
      }
    }

    for (const id of nutrientIds) {
      const lowerBetter = lowerIsBetter.includes(id);
      const values = products.map((p) => {
        const nutrient = p.nutrients.find((n) => n.id === id);
        return { barcode: p.barcode, value: nutrient?.value ?? null, unit: nutrient?.unit ?? '' };
      });

      const known = values.filter((v): v is { barcode: string; value: number; unit: string } => v.value !== null);
      let better: string | undefined;
      if (known.length >= 2) {
        const sorted = [...known].sort((a, b) => (lowerBetter ? a.value - b.value : b.value - a.value));
        // No winner on a tie
        if (sorted[0]!.value !== sorted[1]!.value) better = sorted[0]!.barcode;
      }

      const name = products.flatMap((p) => p.nutrients).find((n) => n.id === id)?.name ?? id;
      comparisons.push({ nutrientId: id, name, values, better });
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
      greenScore: products
        .filter((p) => p.greenScore)
        .map((p) => ({ barcode: p.barcode, grade: p.greenScore!.grade })),
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
    const wins: Record<string, string[]> = {};
    for (const p of products) {
      scores[p.barcode] = 0;
      wins[p.barcode] = [];
    }

    // One point per key nutrient (avoids double counting kcal/kJ or salt/sodium)
    const scored: Record<string, string> = {
      energy_kcal: 'fewer calories',
      saturated_fat: 'less saturated fat',
      sugars: 'less sugar',
      salt: 'less salt',
      fiber: 'more fiber',
      protein: 'more protein',
    };
    for (const comp of nutritionComparison) {
      const label = scored[comp.nutrientId];
      if (label && comp.better) {
        scores[comp.better]!++;
        wins[comp.better]!.push(label);
      }
    }

    // Nutri-Score bonus only when it can actually be compared
    const order = ['A', 'B', 'C', 'D', 'E'];
    const graded = products
      .filter((p) => p.nutriScore)
      .sort((a, b) => order.indexOf(a.nutriScore!.grade) - order.indexOf(b.nutriScore!.grade));
    const [first, second] = graded;
    let nutriScoreWinner: string | undefined;
    if (first && second && first.nutriScore!.grade !== second.nutriScore!.grade) {
      scores[first.barcode]! += 3;
      nutriScoreWinner = first.barcode;
    }

    const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const [best, runnerUp] = ranked;
    if (!best || best[1] === 0 || (runnerUp && runnerUp[1] === best[1])) return null;

    const winner = best[0];
    const product = products.find((p) => p.barcode === winner)!;
    const reasons = [
      ...(nutriScoreWinner === winner ? [`better Nutri-Score (${product.nutriScore!.grade})`] : []),
      ...wins[winner]!,
    ];
    return { barcode: winner, reason: `Per 100 g: ${reasons.join(', ')}` };
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

    // Lower NOVA group = less processed
    if (original.novaGroup && alternative.novaGroup && alternative.novaGroup < original.novaGroup) {
      score += original.novaGroup - alternative.novaGroup;
      improvements.push(`Less processed: NOVA ${alternative.novaGroup} vs ${original.novaGroup}`);
    }

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
      { id: 'salt', name: 'salt', lowerBetter: true },
      { id: 'saturated_fat', name: 'saturated fat', lowerBetter: true },
      { id: 'sugars', name: 'sugar', lowerBetter: true },
      { id: 'fiber', name: 'fiber', lowerBetter: false },
      { id: 'protein', name: 'protein', lowerBetter: false },
    ];

    for (const { id, name, lowerBetter } of nutrientComparisons) {
      const origValue = original.nutrients.find((n) => n.id === id)?.value;
      const altValue = alternative.nutrients.find((n) => n.id === id)?.value;
      if (origValue === undefined || altValue === undefined) continue;

      const isBetter = lowerBetter ? altValue < origValue : altValue > origValue;
      const diff = Math.abs(altValue - origValue);

      if (isBetter && diff > origValue * 0.1) {
        score++;
        const direction = lowerBetter ? 'Less' : 'More';
        improvements.push(`${direction} ${name}: ${altValue.toFixed(1)} vs ${origValue.toFixed(1)} per 100 g`);
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
    return `Comparison of ${names}: ${winnerProduct?.name ?? 'Unknown'} is the healthier choice. ${winner.reason}.`;
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
