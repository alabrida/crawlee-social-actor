/**
 * @module scoring/__tests__/helpers/platform-fixture
 * @description Builder for per-platform test fixtures (the collapsed `platforms` object
 * the rubric reads). Only includes fields the mechanisms/classifier consult.
 */

export function buildPlatform(type: string, overrides: any = {}): any {
    const base: any = {
        url: `https://${type}.com/example`,
        followers: 5000,
        followerCount: 5000,
        verified: false,
        biography: 'We help customers.',
        bio_analysis: { hasAuthorityProof: false, hasConversionCta: false, bioText: '' },
        days_since_post: 5,
    };

    if (type === 'google_business_profile' || type === 'google_maps') {
        Object.assign(base, {
            reviews_count: 50,
            rating: 4.5,
            claimed_status: true,
            photo_count: 12,
            phone: '+1-555-0100',
            owner_response_rate: 0.8,
            gbp_category: 'Store',
        });
    }
    if (type === 'linkedin') {
        Object.assign(base, {
            isPersonalProfile: false,
            companyName: 'Example Co',
            websiteUrl: 'https://example.com',
            about_length: 400,
            connectionsCount: 500,
            featured_section: true,
            newsletter: true,
        });
    }
    if (type === 'youtube') {
        Object.assign(base, { subscribers: 5000, has_membership: true, has_merch: true, playlist_count: 6, content_tabs: ['videos', 'community'] });
    }
    if (type === 'instagram') Object.assign(base, { has_shop: true, postsCount: 300, content_mix: { highlights: 8 } });
    if (type === 'tiktok') Object.assign(base, { has_shop: true });
    if (type === 'pinterest') Object.assign(base, { board_count: 12 });
    if (type === 'facebook') Object.assign(base, { reviews_count: 30, rating: 4.2, cta_button_type: 'Shop now' });
    if (type === 'reddit') Object.assign(base, { url: 'https://reddit.com/r/example' });

    return { ...base, ...overrides };
}
