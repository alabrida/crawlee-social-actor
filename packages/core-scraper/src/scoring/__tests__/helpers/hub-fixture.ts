/**
 * @module scoring/__tests__/helpers/hub-fixture
 * @description Builders for hub_forensics test fixtures. buildHub() returns a complete,
 * "healthy" hub covering every field the rubric mechanisms read, deep-merged with
 * overrides so each mechanism test only sets what it asserts. buildDegradedHub() models
 * a blocked/failed crawl for the false-negative path.
 */

function isObj(v: any): boolean {
    return v && typeof v === 'object' && !Array.isArray(v);
}

function deepMerge(base: any, over: any): any {
    if (!isObj(over)) return over === undefined ? base : over;
    const out: any = { ...base };
    for (const k of Object.keys(over)) {
        out[k] = isObj(over[k]) && isObj(base?.[k]) ? deepMerge(base[k], over[k]) : over[k];
    }
    return out;
}

export function buildHub(overrides: any = {}): any {
    const base = {
        scrapeSuccess: true,
        loadedUrl: 'https://example.com',
        ssl: { present: true },
        performance: { ttfb_ms: 800 },
        seo: {
            title: 'Example Co',
            meta_description: 'We help customers do things well.',
            canonical: 'https://example.com',
            json_ld: { present: true, type: 'Organization' },
            json_ld_schema: { type: 'Organization' },
            hero_headings: ['Welcome to Example'],
            suggested_keywords: [],
        },
        analytics: { google_analytics: true, tag_manager: true, intent_pixels: ['meta'], facebook_pixel: true, hubspot: false },
        blog: { detected: true, post_count: 8, days_since_post: 10 },
        pricing: { detected: true, has_tiers: true, has_quotes_only: false, tier_count: 3 },
        case_studies: { detected: true, type: 'case_study', count: 4 },
        testimonials: { detected: true, has_named_source: true, count: 5 },
        forms: { count: 3, types: ['contact', 'newsletter', 'lead_magnet'] },
        ecommerce: { detected: true, platform: 'Shopify', has_cart: true, has_checkout: true },
        mobile: { viewport_meta: true, responsive: true },
        chat: { detected: true, provider: 'intercom', has_bot: true },
        contact_info: { phone: '+1-555-0100', email: 'hi@example.com', address: '1 Main St', has_address: true },
        privacy: { detected: true },
        terms: { detected: true },
        cookie_consent: { detected: true },
        booking: { detected: true, provider: 'calendly' },
        social_links: {
            instagram: 'https://instagram.com/example',
            facebook: 'https://facebook.com/example',
            linkedin: 'https://linkedin.com/company/example',
        },
        pages_crawled: 5,
        smart_stop_reason: 'signal_saturation',
        screenshotUrl: 'https://example.com/shot.png',
    };
    return deepMerge(base, overrides);
}

/** Blocked/failed crawl — mechanisms guard on scrapeSuccess === false and high TTFB. */
export function buildDegradedHub(overrides: any = {}): any {
    return buildHub({ scrapeSuccess: false, performance: { ttfb_ms: 30000 }, pages_crawled: 1, ...overrides });
}
