import { describe, it, expect } from 'vitest';
import { classifyBusiness } from '../classifier.js';
import { calculateAssessment } from '../engine.js';
import { resolveBestSerp, generateRecommendedKeywords } from '../keyword-helper.js';

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

    it('should detect influencer based on high follower count and collab bio keywords', () => {
        const platforms = {
            instagram: {
                url: 'https://instagram.com/influencer',
                followers: 60000,
                bio_analysis: {
                    bioText: 'For business inquiries and brand sponsorships contact management',
                    hasConversionCta: false,
                    hasAuthorityProof: false,
                    hasClearRevenueModel: false
                },
                link_in_bio: { tool: 'linktree', url: 'https://linktr.ee/influencer' }
            }
        };
        const hubForensics = { scrapeSuccess: false }; // no website
        const result = classifyBusiness(platforms, hubForensics);
        expect(result.detected_class).toBe('influencer');
    });

    it('should detect content creator based on monetization link-in-bio tool and creator headings', () => {
        const platforms = {
            instagram: {
                url: 'https://instagram.com/creator',
                followers: 12000,
                bio_analysis: {
                    bioText: 'Join my new course and newsletter',
                    hasConversionCta: true,
                    hasAuthorityProof: false,
                    hasClearRevenueModel: true
                },
                link_in_bio: { tool: 'stan', url: 'https://stan.store/creator' }
            }
        };
        const hubForensics = {
            scrapeSuccess: true,
            seo: {
                hero_headings: ['My Masterclass & Training Program', 'Get the digital templates']
            }
        };
        const result = classifyBusiness(platforms, hubForensics);
        expect(result.detected_class).toBe('content_creator');
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

    it('should handle and aggregate multiple profiles for the same platform correctly', () => {
        const platforms = {
            linkedin: [
                {
                    url: 'https://linkedin.com/company/test-company',
                    isPersonalProfile: false,
                    followerCount: 500
                },
                {
                    url: 'https://linkedin.com/in/test-personal',
                    isPersonalProfile: true,
                    connectionsCount: 300,
                    featured_section: true
                }
            ],
            instagram: [
                {
                    url: 'https://instagram.com/test1',
                    followers: 1200
                },
                {
                    url: 'https://instagram.com/test2',
                    followers: 800
                }
            ]
        };

        const hubForensics = { scrapeSuccess: true };
        const serpData = null;

        const result = calculateAssessment(
            platforms,
            hubForensics,
            serpData,
            'Multi Test',
            'https://example.com'
        );

        expect(result.platforms_found).toContain('linkedin');
        expect(result.platforms_found).toContain('instagram');
        expect(result.total_platforms).toBe(2);
        
        const aggregated = result.assessment_detail.platforms;
        expect(aggregated.linkedin).toHaveLength(2);
        expect(aggregated.instagram).toHaveLength(2);
    });

    it('should resolve the best SERP ranking from multiple results', () => {
        const serpResults = [
            { serpKeyword: 'keyword 1', serpRankingPosition: 12 },
            { serpKeyword: 'keyword 2', serpRankingPosition: 3 },
            { serpKeyword: 'keyword 3', serpRankingPosition: null }
        ];

        const best = resolveBestSerp(serpResults);
        expect(best.serpRankingPosition).toBe(3);
        expect(best.serpKeyword).toBe('keyword 2');
    });

    it('should generate appropriate recommended target keywords based on business class', () => {
        const saasKeywords = generateRecommendedKeywords('saas', 'MyBrand');
        expect(saasKeywords).toContain('MyBrand pricing');

        const localKeywords = generateRecommendedKeywords('local', 'BurgerShop');
        expect(localKeywords).toContain('BurgerShop near me');
    });

    it('should assign accurate NAICS code lookup for a restaurant category', () => {
        const platforms = {
            google_business_profile: {
                url: 'https://maps.google.com/123',
                gbp_category: 'Restaurant'
            }
        };
        const hubForensics = { scrapeSuccess: true };
        const serpData = null;

        const result = calculateAssessment(
            platforms,
            hubForensics,
            serpData,
            'Yummy Pizza',
            'https://yummy.com'
        );

        expect(result.assessment_detail.classification.naics_code).toBe('722511');
        expect(result.assessment_detail.classification.naics_title).toBe('Full-Service Restaurants');
        expect(result.assessment_detail.classification.local_archetype).toBe('Local Storefront');
    });

    it('should assign correct maturity tier and bottleneck based on scoring thresholds', () => {
        const platforms = {};
        const hubForensics = { scrapeSuccess: false };
        const serpData = null;

        const result = calculateAssessment(
            platforms,
            hubForensics,
            serpData,
            'Poor Business',
            'https://poor.com'
        );

        expect(result.overall_score).toBeLessThan(4.0);
        expect(result.assessment_detail.classification.maturity_tier).toBe('Foundational');
        expect(result.assessment_detail.classification.primary_bottleneck).toBeDefined();
    });
});
