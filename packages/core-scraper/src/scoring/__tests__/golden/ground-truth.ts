/**
 * @module scoring/__tests__/golden/ground-truth
 * @description Human-verified golden cases. Each is a known business shape with the
 * assessment values a correct pipeline must produce. Seeded with synthetic-but-realistic
 * cases across business classes; real captures (via scripts/capture-golden.ts) are added
 * here over time, each becoming a permanent regression guard.
 */

import { buildHub } from '../helpers/hub-fixture.js';
import { buildPlatform } from '../helpers/platform-fixture.js';
import type { GoldenCase } from './replay.js';

export const GOLDEN_CASES: GoldenCase[] = [
    {
        slug: 'demo-ecommerce',
        brand: 'Demo Store',
        businessUrl: 'https://shop.example.com/',
        items: [
            {
                platform: 'general_hub',
                url: 'https://shop.example.com/',
                data: buildHub({
                    ecommerce: { detected: true, platform: 'Shopify', has_cart: true, has_checkout: true },
                    pricing: { detected: false, has_tiers: false },
                    seo: { meta_description: 'Shop our online store — buy products and gear', title: 'Demo Store', json_ld_schema: { type: 'Product' }, json_ld: { present: true, type: 'Product' } },
                }),
            },
            { platform: 'instagram', url: 'https://instagram.com/demostore', data: buildPlatform('instagram', { followers: 62000, followerCount: 62000, verified: true, days_since_post: 2 }) },
            { platform: 'tiktok', url: 'https://tiktok.com/@demostore', data: buildPlatform('tiktok', { followers: 30000, followerCount: 30000 }) },
        ],
        expected: {
            business_class: 'ecommerce',
            has_ecommerce: true,
            platform_followers: { instagram: { value: 62000, tolerance_pct: 5 } },
            min_conversion: 4,
            min_overall: 3,
        },
    },
    {
        slug: 'demo-local-restaurant',
        brand: 'Demo Bistro',
        businessUrl: 'https://demobistro.com/',
        items: [
            {
                platform: 'general_hub',
                url: 'https://demobistro.com/',
                data: buildHub({
                    ecommerce: { detected: false, platform: null, has_cart: false, has_checkout: false },
                    pricing: { detected: false, has_tiers: false },
                    seo: { meta_description: 'best local restaurant near me in Birmingham', title: 'Demo Bistro', hero_headings: ['Family restaurant in Birmingham'], json_ld_schema: { type: 'Restaurant' }, json_ld: { present: true, type: 'Restaurant' } },
                    contact_info: { phone: '+1-205-555-0100', email: 'eat@demobistro.com', address: '1 Main St', has_address: true },
                }),
            },
            { platform: 'google_business_profile', url: 'https://maps.google.com/?cid=1', data: buildPlatform('google_business_profile', { reviews_count: 120, rating: 4.7, claimed_status: true, photo_count: 30 }) },
        ],
        expected: {
            business_class: 'local',
            has_ecommerce: false,
            gbp_rating: { value: 4.7, tol: 0.1 },
            min_overall: 3,
        },
    },
    {
        slug: 'demo-saas',
        brand: 'Demo Cloud',
        businessUrl: 'https://democloud.io/',
        items: [
            {
                platform: 'general_hub',
                url: 'https://democloud.io/',
                data: buildHub({
                    ecommerce: { detected: false, platform: null, has_cart: false, has_checkout: false },
                    pricing: { detected: true, has_tiers: true, tier_count: 3 },
                    seo: { meta_description: 'our cloud software platform with a powerful api', title: 'Demo Cloud', hero_headings: ['The analytics platform for teams'], json_ld_schema: { type: 'SoftwareApplication' }, json_ld: { present: true, type: 'SoftwareApplication' } },
                }),
            },
            { platform: 'linkedin', url: 'https://linkedin.com/company/democloud', data: buildPlatform('linkedin', { followers: 12000, followerCount: 12000 }) },
        ],
        expected: {
            business_class: 'saas',
            has_ecommerce: false,
            platform_followers: { linkedin: { value: 12000, tolerance_pct: 5 } },
            min_overall: 3,
        },
    },
];
