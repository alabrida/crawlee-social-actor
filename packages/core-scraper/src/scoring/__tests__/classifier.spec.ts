import { describe, it, expect } from 'vitest';
import { classifyBusiness } from '../classifier.js';

const hub = (over: any = {}) => ({
    scrapeSuccess: true,
    ecommerce: { detected: false, platform: null, has_cart: false },
    pricing: { detected: false, has_tiers: false },
    seo: { meta_description: '', title: '', hero_headings: [], json_ld: {}, json_ld_schema: {} },
    contact_info: {},
    ...over,
});

describe('classifyBusiness', () => {
    it('ecommerce: cart/checkout signals win', () => {
        const r = classifyBusiness({}, hub({ ecommerce: { detected: true, platform: 'Shopify', has_cart: true }, seo: { meta_description: 'Shop our online store', title: 'Store', hero_headings: [], json_ld: {}, json_ld_schema: {} } }));
        expect(r.detected_class).toBe('ecommerce');
    });

    it('saas: software JSON-LD + pricing tiers win', () => {
        const r = classifyBusiness({}, hub({ pricing: { detected: true, has_tiers: true }, seo: { json_ld_schema: { type: 'SoftwareApplication' }, meta_description: 'Our software platform', title: 'App', hero_headings: [], json_ld: {} } }));
        expect(r.detected_class).toBe('saas');
    });

    it('local: GBP + LocalBusiness JSON-LD win', () => {
        const r = classifyBusiness(
            { google_business_profile: { url: 'https://maps.google.com/x', phone: '555', claimed_status: true } },
            hub({ seo: { json_ld_schema: { type: 'LocalBusiness' }, meta_description: 'serving near me', title: '', hero_headings: [], json_ld: {} }, contact_info: { address: '1 Main St' } }),
        );
        expect(r.detected_class).toBe('local');
    });

    it('professional_services: ProfessionalService JSON-LD + consulting keywords win', () => {
        const r = classifyBusiness({}, hub({ seo: { json_ld_schema: { type: 'ProfessionalService' }, meta_description: 'consulting agency services', title: '', hero_headings: ['Strategic consulting firm'], json_ld: {} } }));
        expect(r.detected_class).toBe('professional_services');
    });

    it('manual override -> class with confidence 1.0', () => {
        const r = classifyBusiness({}, hub(), 'local');
        expect(r.detected_class).toBe('local');
        expect(r.confidence).toBe(1.0);
    });

    it('no signals -> professional_services fallback @ 0.50', () => {
        const r = classifyBusiness({}, hub());
        expect(r.detected_class).toBe('professional_services');
        expect(r.confidence).toBe(0.5);
    });

    // Regression guard for the Best Buy failure: an e-commerce retailer with a successful
    // crawl must NOT be misclassified as saas (the false pricing-tier signal must lose).
    it('Best Buy guard: ecommerce retailer is not classified saas', () => {
        const r = classifyBusiness(
            { facebook: { url: 'https://facebook.com/bestbuy', followers: 7900000 }, youtube: { url: 'https://youtube.com/@bestbuy', subscribers: 837000 } },
            hub({ ecommerce: { detected: true, platform: 'Magento', has_cart: true }, pricing: { detected: true, has_tiers: true }, seo: { meta_description: 'Shop electronics and more', title: 'Best Buy', hero_headings: [], json_ld: {}, json_ld_schema: {} } }),
        );
        expect(r.detected_class).not.toBe('saas');
        expect(r.detected_class).toBe('ecommerce');
    });
});
