import { describe, it, expect } from 'vitest';
import { runMechanism } from '../helpers/get-mechanism.js';
import { buildHub, buildDegradedHub } from '../helpers/hub-fixture.js';
import { buildPlatform } from '../helpers/platform-fixture.js';

const run = (name: string, ctx: any) => runMechanism(name, ctx);

describe('awareness mechanisms', () => {
    describe('website_ssl', () => {
        it('degraded crawl -> 0', () => {
            expect(run('website_ssl', { hub: buildDegradedHub() }).score).toBe(0);
        });
        it('http only -> 1', () => {
            const r = run('website_ssl', { hub: buildHub({ ssl: { present: false }, loadedUrl: 'http://example.com' }) });
            expect(r.score).toBe(1);
            expect(r.evidence).toMatch(/HTTP only/i);
        });
        it('https but slow (>3s) -> 2', () => {
            const r = run('website_ssl', { hub: buildHub({ performance: { ttfb_ms: 4000 } }) });
            expect(r.score).toBe(2);
            expect(r.evidence).toMatch(/slow/i);
        });
        it('https + fast -> 3', () => {
            expect(run('website_ssl', { hub: buildHub() }).score).toBe(3);
        });
    });

    describe('seo_foundations', () => {
        it('none -> 0', () => {
            expect(run('seo_foundations', { hub: buildHub({ seo: { meta_description: null, canonical: null, json_ld: { present: false } } }) }).score).toBe(0);
        });
        it('meta only -> 1', () => {
            expect(run('seo_foundations', { hub: buildHub({ seo: { canonical: null, json_ld: { present: false } } }) }).score).toBe(1);
        });
        it('meta + canonical -> 2', () => {
            expect(run('seo_foundations', { hub: buildHub({ seo: { json_ld: { present: false } } }) }).score).toBe(2);
        });
        it('all three -> 3', () => {
            expect(run('seo_foundations', { hub: buildHub() }).score).toBe(3);
        });
    });

    describe('analytics_tracking', () => {
        it('none -> 0', () => {
            expect(run('analytics_tracking', { hub: buildHub({ analytics: { google_analytics: false, tag_manager: false, intent_pixels: [], facebook_pixel: false, hubspot: false } }) }).score).toBe(0);
        });
        it('GA only -> 1', () => {
            expect(run('analytics_tracking', { hub: buildHub({ analytics: { tag_manager: false, intent_pixels: [], facebook_pixel: false, hubspot: false } }) }).score).toBe(1);
        });
        it('GA + GTM, no pixel -> 2', () => {
            expect(run('analytics_tracking', { hub: buildHub({ analytics: { intent_pixels: [], facebook_pixel: false, hubspot: false } }) }).score).toBe(2);
        });
        it('GA + GTM + pixel -> 3', () => {
            expect(run('analytics_tracking', { hub: buildHub() }).score).toBe(3);
        });
    });

    describe('serp_discoverability', () => {
        it('no serp data -> 0', () => {
            expect(run('serp_discoverability', { hub: buildHub(), serp: null }).score).toBe(0);
        });
        it('rank 20 -> 1', () => {
            expect(run('serp_discoverability', { hub: buildHub(), serp: { serpRankingPosition: 20 } }).score).toBe(1);
        });
        it('rank 5 -> 2', () => {
            expect(run('serp_discoverability', { hub: buildHub(), serp: { serpRankingPosition: 5 } }).score).toBe(2);
        });
        it('rank 2 -> 3', () => {
            expect(run('serp_discoverability', { hub: buildHub(), serp: { serpRankingPosition: 2 } }).score).toBe(3);
        });
    });

    describe('gbp_presence', () => {
        it('no listing -> 0', () => {
            expect(run('gbp_presence', { platforms: {} }).score).toBe(0);
        });
        it('unclaimed/incomplete -> 1', () => {
            expect(run('gbp_presence', { platforms: { google_business_profile: buildPlatform('google_business_profile', { claimed_status: false, photo_count: 1 }) } }).score).toBe(1);
        });
        it('claimed, <10 photos -> 2', () => {
            expect(run('gbp_presence', { platforms: { google_business_profile: buildPlatform('google_business_profile', { photo_count: 5 }) } }).score).toBe(2);
        });
        it('claimed, 10+ photos -> 3', () => {
            expect(run('gbp_presence', { platforms: { google_business_profile: buildPlatform('google_business_profile', { photo_count: 25 }) } }).score).toBe(3);
        });
    });

    describe('social_presence', () => {
        const plat = (n: number) => {
            const names = ['instagram', 'facebook', 'linkedin', 'youtube', 'tiktok', 'twitter', 'pinterest'];
            const out: any = {};
            for (let i = 0; i < n; i++) out[names[i]] = buildPlatform(names[i]);
            return out;
        };
        it('<=1 -> 0', () => expect(run('social_presence', { platforms: plat(1) }).score).toBe(0));
        it('2-3 -> 1', () => expect(run('social_presence', { platforms: plat(3) }).score).toBe(1));
        it('4-5 -> 2', () => expect(run('social_presence', { platforms: plat(5) }).score).toBe(2));
        it('>=6 -> 3', () => expect(run('social_presence', { platforms: plat(6) }).score).toBe(3));
    });

    describe('follower_reach', () => {
        const fr = (followers: number) => ({ platforms: { instagram: buildPlatform('instagram', { followers }) } });
        it('<100 -> 0', () => expect(run('follower_reach', fr(50)).score).toBe(0));
        it('100-999 -> 1', () => expect(run('follower_reach', fr(500)).score).toBe(1));
        it('1k-9.9k -> 2', () => expect(run('follower_reach', fr(5000)).score).toBe(2));
        it('>=10k -> 3', () => expect(run('follower_reach', fr(50000)).score).toBe(3));
    });

    describe('content_marketing', () => {
        it('degraded -> 0', () => expect(run('content_marketing', { hub: buildDegradedHub() }).score).toBe(0));
        it('no blog -> 0', () => expect(run('content_marketing', { hub: buildHub({ blog: { detected: false } }) }).score).toBe(0));
        it('inactive (<5 posts) -> 1', () => expect(run('content_marketing', { hub: buildHub({ blog: { detected: true, post_count: 2, days_since_post: 5 } }) }).score).toBe(1));
        it('recent but >90 days -> 2', () => expect(run('content_marketing', { hub: buildHub({ blog: { detected: true, post_count: 8, days_since_post: 120 } }) }).score).toBe(2));
        it('active blog -> 3', () => expect(run('content_marketing', { hub: buildHub({ blog: { detected: true, post_count: 8, days_since_post: 10 } }) }).score).toBe(3));
    });
});
