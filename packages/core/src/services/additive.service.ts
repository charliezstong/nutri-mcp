import { getCache } from '../resilience/cache.js';
import { fetchJson } from '../resilience/http.js';
import type { Additive } from '../types/product.types.js';
import { getLogger } from '../transport/logger.js';

const logger = getLogger().child('additive-service');

const TAXONOMY_URL = 'https://static.openfoodfacts.org/data/taxonomies/additives.json';
const CACHE_KEY = 'off:taxonomy:additives';

type LocalizedField = Record<string, string>;

interface TaxonomyEntry {
  name?: LocalizedField;
  additives_classes?: LocalizedField;
  efsa_evaluation_overexposure_risk?: LocalizedField;
  efsa_evaluation_url?: LocalizedField;
  vegan?: LocalizedField;
  vegetarian?: LocalizedField;
}

export interface AdditiveDetails extends Additive {
  classes: string[];
  vegan?: string;
  vegetarian?: string;
  efsaEvaluationUrl?: string;
}

/**
 * Additive names, functions and EFSA over-exposure risk from the Open Food
 * Facts additives taxonomy (downloaded once and cached for 24 h).
 */
export class AdditiveService {
  private cache = getCache();
  private pending: Promise<Record<string, TaxonomyEntry> | null> | null = null;

  private async taxonomy(): Promise<Record<string, TaxonomyEntry> | null> {
    const cached = this.cache.get<Record<string, TaxonomyEntry>>(CACHE_KEY);
    if (cached) return cached.value;

    this.pending ??= fetchJson<Record<string, TaxonomyEntry>>(TAXONOMY_URL, {
      provider: 'openfoodfacts',
      endpoint: 'product',
      timeoutMs: 20_000,
    })
      .then((data) => {
        this.cache.set(CACHE_KEY, data, 'taxonomy');
        return data;
      })
      .catch((error: unknown) => {
        logger.warn('Could not load additives taxonomy', error);
        return null;
      })
      .finally(() => {
        this.pending = null;
      });

    return this.pending;
  }

  /**
   * Enrich additive codes (e.g. "E322I") with names and risk levels.
   */
  async describe(additives: Additive[]): Promise<AdditiveDetails[]> {
    const taxonomy = additives.length > 0 ? await this.taxonomy() : null;

    return additives.map((additive) => {
      const entry = taxonomy?.[`en:${additive.code.toLowerCase()}`];
      if (!entry) return { ...additive, classes: [] };

      const risk = entry.efsa_evaluation_overexposure_risk?.['en'];
      return {
        code: additive.code,
        name: entry.name?.['en'] ?? additive.name,
        riskLevel: risk === 'en:high' ? 'high' : risk === 'en:moderate' ? 'moderate' : risk === 'en:no' ? 'low' : 'unknown',
        description: risk
          ? `EFSA over-exposure risk: ${risk.replace('en:', '')}`
          : undefined,
        classes: (entry.additives_classes?.['en'] ?? '')
          .split(',')
          .map((c) => c.trim().replace(/^en:/, '').replace(/-/g, ' '))
          .filter(Boolean),
        vegan: entry.vegan?.['en'],
        vegetarian: entry.vegetarian?.['en'],
        efsaEvaluationUrl: entry.efsa_evaluation_url?.['en'],
      };
    });
  }
}

// Singleton
let instance: AdditiveService | null = null;

export function getAdditiveService(): AdditiveService {
  if (!instance) {
    instance = new AdditiveService();
  }
  return instance;
}
