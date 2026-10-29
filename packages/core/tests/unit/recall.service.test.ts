import { describe, it, expect, afterEach, vi } from 'vitest';
import { RecallService } from '../../src/services/recall.service.js';
import { stubFetch, defaultRoutes } from '../helpers/fetch-stub.js';

afterEach(() => vi.unstubAllGlobals());

describe('RecallService', () => {
  it('builds openFDA queries with literal "+" separators', async () => {
    const mock = stubFetch(defaultRoutes());
    const recalls = await new RecallService().search({ text: 'Peanut butter!', ongoingOnly: true, limit: 2 });
    const url = String(mock.mock.calls[0]![0]);
    expect(url).toContain('search=(product_description%3A%22Peanut%22+AND+product_description%3A%22butter%22)+AND+status%3A%22Ongoing%22');
    expect(recalls).toHaveLength(2);
    expect(recalls[0]).toMatchObject({ matchedBy: 'text' });
    expect(recalls[0]!.reportDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('searches UPC spellings for barcodes and treats 404 as no recalls', async () => {
    const mock = stubFetch([{ match: (u) => u.hostname === 'api.fda.gov', status: 404 }]);
    expect(await new RecallService().search({ barcode: '0041196910759' })).toEqual([]);
    const url = decodeURIComponent(String(mock.mock.calls[0]![0]));
    expect(url).toContain('product_description:"041196910759"');
    expect(url).toContain('code_info:"041196910759"');
  });
});
