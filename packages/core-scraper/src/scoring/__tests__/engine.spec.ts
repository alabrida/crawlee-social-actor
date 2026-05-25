import { describe, it, expect } from 'vitest';
import { classifyBusiness } from '../classifier.js';
import { calculateAssessment } from '../engine.js';

describe('Business Classifier', () => {
    it('should detect local business class based on GBP presence', () => {
        const platforms = {
            google_business_profile: { url: 'https://maps.google.com/123', phone: '123-456' }
        };
        const hubForensics = { scrapeSuccess: true };
        const result = classifyBusiness(platforms, hubForensics);
        expect(result.detected_class).toBe('local');
    });

    it('should detect e-commerce based on cart presence', () => {
        const platforms = {};
        const hubForensics = {
            scrapeSuccess: true,
            ecommerce: { detected: true, platform: 'shopify', has_cart: true }
        };
        const result = classifyBusiness(platforms, hubForensics);
        expect(result.detected_class).toBe('ecommerce');
    });

    it('should detect SaaS based on pricing tiers', () => {
        const platforms = {};
        const hubForensics = {
            scrapeSuccess: true,
            pricing: { detected: true, has_tiers: true },
            seo: { json_ld: { present: true, type: 'SoftwareApplication' } }
        };
        const result = classifyBusiness(platforms, hubForensics);
        expect(result.detected_class).toBe('saas');
    });

    it('should respect manual class override', () => {
        const platforms = {};
        const hubForensics = { scrapeSuccess: true };
        const result = classifyBusiness(platforms, hubForensics, 'saas');
        expect(result.detected_class).toBe('saas');
        expect(result.confidence).toBe(1.0);
    });
});

describe('Scoring Engine', () => {
    it('should calculate complete assessment results correctly', () => {
        const platforms = {
            instagram: {
                url: 'https://instagram.com/test',
                followers: 1500,
                postsCount: 10,
                latestPostDate: new Date().toISOString()
            }
        };
        const hubForensics = {
            scrapeSuccess: true,
            ssl: { present: true },
            performance: { ttfb_ms: 250 },
            seo: {
                title: 'Test Business',
                meta_description: 'Valid description',
                canonical: 'https://example.com'
            }
        };
        const serpData = { serpRankingPosition: 3 };

        const result = calculateAssessment(
            platforms,
            hubForensics,
            serpData,
            'Test Brand',
            'https://example.com'
        );

        expect(result.assessment_id).toBeDefined();
        expect(result.brand_name).toBe('Test Brand');
        expect(result.business_url).toBe('https://example.com');
        expect(result.overall_score).toBeGreaterThanOrEqual(0);
        expect(result.overall_score).toBeLessThanOrEqual(10);
        expect(result.weakest_stage).toBeDefined();
        expect(result.strongest_stage).toBeDefined();
        expect(result.platforms_found).toContain('instagram');
        expect(result.total_platforms).toBe(1);
        expect(result.assessment_detail.stages.awareness).toBeDefined();
    });
});
