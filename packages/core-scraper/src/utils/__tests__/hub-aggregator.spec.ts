import { describe, it, expect } from 'vitest';
import { aggregateHubItem } from '../hub-aggregator.js';

const item = (url: string, data: any) => ({ url, data });
const base = (over: any = {}) => ({
    ssl: { present: true },
    analytics: {},
    blog: { detected: false, post_count: 0 },
    pricing: { detected: false, has_tiers: false },
    case_studies: { detected: false, count: 0 },
    forms: { count: 0, types: [] as string[] },
    ecommerce: { detected: false, platform: null, has_cart: false, has_checkout: false },
    chat: { detected: false, provider: null },
    performance: { ttfb_ms: 500 },
    social_links: {},
    scrapeSuccess: true,
    pages_crawled: 1,
    ...over,
});

describe('aggregateHubItem', () => {
    it('initializes hub_forensics from the homepage', () => {
        const h = aggregateHubItem(null, item('https://x.com/', base({ ecommerce: { detected: true, platform: 'Shopify', has_cart: true, has_checkout: false } })), 'https://x.com');
        expect(h.ecommerce.detected).toBe(true);
    });

    it('pollution: one subpage flips a hub flag true (documents the OR-merge risk)', () => {
        let h = aggregateHubItem(null, item('https://x.com/', base()), 'https://x.com');
        h = aggregateHubItem(h, item('https://x.com/sub', base({ ecommerce: { detected: true, platform: 'Shopify', has_cart: true, has_checkout: false } })), 'https://x.com');
        expect(h.ecommerce.detected).toBe(true);
    });

    it('degraded masking: min-TTFB hides a slow/blocked subpage (documents the risk)', () => {
        let h = aggregateHubItem(null, item('https://x.com/', base({ performance: { ttfb_ms: 30000 } })), 'https://x.com');
        h = aggregateHubItem(h, item('https://x.com/sub', base({ performance: { ttfb_ms: 500 } })), 'https://x.com');
        expect(h.performance.ttfb_ms).toBe(500);
    });

    it('forms count SUM + types union across pages', () => {
        let h = aggregateHubItem(null, item('https://x.com/', base({ forms: { count: 1, types: ['contact'] } })), 'https://x.com');
        h = aggregateHubItem(h, item('https://x.com/sub', base({ forms: { count: 2, types: ['newsletter'] } })), 'https://x.com');
        expect(h.forms.count).toBe(3);
        expect([...h.forms.types].sort()).toEqual(['contact', 'newsletter']);
    });

    it('scrapeSuccess stays true once any page succeeds', () => {
        let h = aggregateHubItem(null, item('https://x.com/', base({ scrapeSuccess: true })), 'https://x.com');
        h = aggregateHubItem(h, item('https://x.com/sub', base({ scrapeSuccess: true })), 'https://x.com');
        expect(h.scrapeSuccess).toBe(true);
    });
});
