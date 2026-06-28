import { describe, it, expect } from 'vitest';
import { collapsePlatforms, classifyLinkInBio } from '../profile-aggregator.js';

describe('classifyLinkInBio', () => {
    it('classifies link aggregators', () => {
        expect(classifyLinkInBio('https://linktr.ee/bestbuy')?.type).toBe('link_aggregator');
        expect(classifyLinkInBio('https://beacons.ai/x')?.type).toBe('link_aggregator');
    });
    it('classifies booking links', () => {
        expect(classifyLinkInBio('https://calendly.com/acme/intro')?.type).toBe('booking');
    });
    it('treats a plain website as direct_website', () => {
        expect(classifyLinkInBio('https://www.bestbuy.com')?.type).toBe('direct_website');
    });
    it('returns null for empty/invalid input', () => {
        expect(classifyLinkInBio(null)).toBeNull();
        expect(classifyLinkInBio('not a url')).toBeNull();
    });
});

describe('collapsePlatforms', () => {
    it('passes through a single profile unchanged', () => {
        const p = { url: 'https://x.com', followers: 10 };
        expect(collapsePlatforms({ instagram: [p] }).instagram).toEqual(p);
    });

    it('normalizes the GBP handler field names so reviews reach the rubric (the real BestBuy bug)', () => {
        // Handler emits gbp_reviews_count/gbp_rating; the reviews_ratings rubric reads
        // reviews_count/rating. Single-profile passthrough used to leave the prefixed names,
        // so a scraped count scored 0. Collapse must expose the canonical names.
        const out = collapsePlatforms({
            google_business_profile: [{ url: 'm', gbp_business_name: 'Best Buy', gbp_rating: 4.1, gbp_reviews_count: 7127 }],
        });
        expect(out.google_business_profile.reviews_count).toBe(7127);
        expect(out.google_business_profile.rating).toBe(4.1);
    });

    it('normalizes Facebook reviewsCount (camelCase) to reviews_count', () => {
        const out = collapsePlatforms({ facebook: [{ url: 'f', reviewsCount: 50, rating: 4.5 }] });
        expect(out.facebook.reviews_count).toBe(50);
    });

    it('bridges camelCase handler fields to the snake_case the rubric reads', () => {
        const out = collapsePlatforms({
            youtube: [{ url: 'y', playlistCount: 12, hasMembership: true, contentTabs: ['videos', 'shorts'] }],
            facebook: [{ url: 'f', ctaButtonType: 'Shop Now' }],
            instagram: [{ url: 'i', hasShop: true }],
        });
        expect(out.youtube.playlist_count).toBe(12);
        expect(out.youtube.has_membership).toBe(true);
        expect(out.youtube.content_tabs).toEqual(['videos', 'shorts']);
        expect(out.facebook.cta_button_type).toBe('Shop Now');
        expect(out.instagram.has_shop).toBe(true);
    });

    it('computes days_since_post from a latest-activity date for single profiles (the recency bug)', () => {
        const tenDaysAgo = new Date(Date.now() - 10 * 86400000).toISOString();
        const out = collapsePlatforms({ instagram: [{ url: 'i', latestPostDate: tenDaysAgo }] });
        expect(out.instagram.days_since_post).toBeGreaterThanOrEqual(9);
        expect(out.instagram.days_since_post).toBeLessThanOrEqual(11);
    });

    it('structures a raw externalUrl into link_in_bio for the link mechanisms', () => {
        const out = collapsePlatforms({ instagram: [{ url: 'i', externalUrl: 'https://linktr.ee/bestbuy' }] });
        expect(out.instagram.link_in_bio).toEqual({ type: 'link_aggregator', url: 'https://linktr.ee/bestbuy' });
    });

    it('SUMs followers across profiles', () => {
        const out = collapsePlatforms({ instagram: [{ url: 'a', followers: 100 }, { url: 'b', followers: 200 }] });
        expect(out.instagram.followers).toBe(300);
    });

    it('SUMs reviews and weight-averages rating by review count', () => {
        const out = collapsePlatforms({
            google_maps: [
                { url: 'a', reviews_count: 10, rating: 4.0 },
                { url: 'b', reviews_count: 20, rating: 5.0 },
            ],
        });
        expect(out.google_maps.reviews_count).toBe(30);
        // (4.0*10 + 5.0*20) / 30 = 4.666...
        expect(out.google_maps.rating).toBeCloseTo(4.667, 2);
    });

    it('ORs boolean flags and MINs days_since_post', () => {
        const out = collapsePlatforms({
            instagram: [
                { url: 'a', verified: false, days_since_post: 30 },
                { url: 'b', verified: true, days_since_post: 5 },
            ],
        });
        expect(out.instagram.verified).toBe(true);
        expect(out.instagram.days_since_post).toBe(5);
    });

    it('drops empty platform arrays', () => {
        expect(collapsePlatforms({ instagram: [] })).toEqual({});
    });
});
