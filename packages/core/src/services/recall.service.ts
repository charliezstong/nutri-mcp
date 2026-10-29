import { API_URLS } from '../config/constants.js';
import { getCache, LRUCache } from '../resilience/cache.js';
import { fetchJson } from '../resilience/http.js';
import { gtinVariants } from '../utils/barcode.js';

/**
 * A food recall / enforcement report from openFDA.
 */
export interface Recall {
  recallNumber: string;
  status: string;                 // Ongoing | Completed | Terminated
  classification: string;         // Class I (most serious) | Class II | Class III
  reportDate?: string;            // ISO date
  recallInitiationDate?: string;  // ISO date
  recallingFirm: string;
  productDescription: string;
  reason: string;
  codeInfo?: string;
  distribution?: string;
  country?: string;
  matchedBy: 'barcode' | 'text';
}

interface OpenFdaEnforcement {
  recall_number: string;
  status: string;
  classification: string;
  report_date?: string;
  recall_initiation_date?: string;
  recalling_firm: string;
  product_description: string;
  reason_for_recall: string;
  code_info?: string;
  distribution_pattern?: string;
  country?: string;
}

interface OpenFdaResponse {
  meta?: { results?: { total: number } };
  results?: OpenFdaEnforcement[];
}

export interface RecallSearch {
  barcode?: string;
  /** Free text matched against the product description (e.g. product or brand name). */
  text?: string;
  /** Only ongoing recalls. */
  ongoingOnly?: boolean;
  limit?: number;
}

/**
 * openFDA food enforcement reports (US recalls), updated weekly.
 * https://open.fda.gov/apis/food/enforcement/
 */
export class RecallService {
  private cache = getCache();

  async search({ barcode, text, ongoingOnly = false, limit = 10 }: RecallSearch): Promise<Recall[]> {
    const results: Recall[] = [];

    if (barcode) {
      // UPCs are printed as 12 digits on US labels; descriptions rarely use EAN-13 padding
      const codes = gtinVariants(barcode).filter((c) => c.length >= 11 && c.length <= 13);
      const clause = codes
        .flatMap((c) => [`product_description:"${c}"`, `code_info:"${c}"`])
        .join('+');
      results.push(...(await this.query(clause, ongoingOnly, limit, 'barcode')));
    }

    if (text && results.length < limit) {
      const words = text
        .replace(/[^\p{L}\p{N}\s'-]/gu, ' ')
        .trim()
        .split(/\s+/)
        .filter((w) => w.length > 1)
        .slice(0, 6);
      if (words.length > 0) {
        const clause = words.map((w) => `product_description:"${w}"`).join('+AND+');
        const textResults = await this.query(clause, ongoingOnly, limit, 'text');
        const seen = new Set(results.map((r) => r.recallNumber));
        results.push(...textResults.filter((r) => !seen.has(r.recallNumber)));
      }
    }

    return results
      .sort((a, b) => (b.reportDate ?? '').localeCompare(a.reportDate ?? ''))
      .slice(0, limit);
  }

  private async query(
    clause: string,
    ongoingOnly: boolean,
    limit: number,
    matchedBy: Recall['matchedBy'],
  ): Promise<Recall[]> {
    const search = ongoingOnly ? `(${clause})+AND+status:"Ongoing"` : clause;
    // openFDA expects literal "+" as the term separator, so build the query string by hand
    const url = `${API_URLS.openfda.foodEnforcement}?search=${encodeSearch(search)}&limit=${Math.min(limit, 100)}&sort=report_date:desc`;

    const cacheKey = LRUCache.makeKey('recall', url);
    const cached = this.cache.get<Recall[]>(cacheKey);
    if (cached && !cached.stale) {
      return cached.value;
    }

    // openFDA answers 404 when nothing matches
    const data = await fetchJson<OpenFdaResponse>(url, { provider: 'openfda', allowNotFound: true });
    const recalls = (data?.results ?? []).map((r) => mapRecall(r, matchedBy));
    this.cache.set(cacheKey, recalls, 'recall');
    return recalls;
  }
}

/**
 * Percent-encode an openFDA search expression while keeping "+" separators.
 */
function encodeSearch(search: string): string {
  return search.split('+').map((part) => encodeURIComponent(part)).join('+');
}

function toIsoDate(value: string | undefined): string | undefined {
  if (!value || !/^\d{8}$/.test(value)) return undefined;
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
}

function mapRecall(r: OpenFdaEnforcement, matchedBy: Recall['matchedBy']): Recall {
  return {
    recallNumber: r.recall_number,
    status: r.status,
    classification: r.classification,
    reportDate: toIsoDate(r.report_date),
    recallInitiationDate: toIsoDate(r.recall_initiation_date),
    recallingFirm: r.recalling_firm,
    productDescription: r.product_description,
    reason: r.reason_for_recall,
    codeInfo: r.code_info,
    distribution: r.distribution_pattern,
    country: r.country,
    matchedBy,
  };
}

// Singleton
let instance: RecallService | null = null;

export function getRecallService(): RecallService {
  if (!instance) {
    instance = new RecallService();
  }
  return instance;
}
