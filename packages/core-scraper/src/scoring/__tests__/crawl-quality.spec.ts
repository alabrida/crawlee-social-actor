import { describe, it, expect } from 'vitest';
import { assessCrawlQuality } from '../crawl-quality.js';
import { buildHub } from './helpers/hub-fixture.js';

describe('assessCrawlQuality', () => {
    it('healthy crawl -> ok', () => {
        const q = assessCrawlQuality(buildHub());
        expect(q.status).toBe('ok');
        expect(q.reasons).toEqual([]);
    });

    it('scrapeSuccess false -> failed', () => {
        expect(assessCrawlQuality(buildHub({ scrapeSuccess: false })).status).toBe('failed');
    });

    it('null hub -> failed', () => {
        expect(assessCrawlQuality(null).status).toBe('failed');
    });

    it('slow TTFB (Best Buy 30s) -> degraded', () => {
        const q = assessCrawlQuality(buildHub({ performance: { ttfb_ms: 30000 } }));
        expect(q.status).toBe('degraded');
        expect(q.reasons.join(' ')).toMatch(/TTFB/);
    });

    it('only homepage crawled -> degraded', () => {
        const q = assessCrawlQuality(buildHub({ pages_crawled: 1 }));
        expect(q.status).toBe('degraded');
        expect(q.reasons.join(' ')).toMatch(/homepage/);
    });
});
