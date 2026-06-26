import { describe, it, expect } from 'vitest';
import { runMechanism as run } from '../helpers/get-mechanism.js';
import { buildHub } from '../helpers/hub-fixture.js';
import { buildPlatform } from '../helpers/platform-fixture.js';

describe('retention mechanisms', () => {
    describe('content_consistency', () => {
        const d = (days: number | undefined) => ({ instagram: buildPlatform('instagram', { days_since_post: days }) });
        it('no data -> 0', () => expect(run('content_consistency', { platforms: d(undefined) }).score).toBe(0));
        it('avg >60 -> 0', () => expect(run('content_consistency', { platforms: d(90) }).score).toBe(0));
        it('avg >14 -> 1', () => expect(run('content_consistency', { platforms: d(30) }).score).toBe(1));
        it('avg >3 -> 2', () => expect(run('content_consistency', { platforms: d(10) }).score).toBe(2));
        it('avg <=3 -> 3', () => expect(run('content_consistency', { platforms: d(2) }).score).toBe(3));
    });

    describe('cross_platform_connectivity', () => {
        const profile = (linkBack: boolean) => buildPlatform('instagram', linkBack ? { link_in_bio: { url: 'https://example.com' } } : {});
        // social_links replaced at top level (deepMerge keeps default keys on an empty override).
        const hubLinks = (links: Record<string, string>) => ({ ...buildHub(), social_links: links });
        it('none -> 0', () => expect(run('cross_platform_connectivity', { hub: hubLinks({}), platforms: { instagram: profile(false) } }).score).toBe(0));
        it('minimal -> 1', () => expect(run('cross_platform_connectivity', { hub: hubLinks({ a: 'x', b: 'y' }), platforms: { instagram: profile(true) } }).score).toBe(1));
        it('good -> 2', () => expect(run('cross_platform_connectivity', { hub: hubLinks({ a: 'x', b: 'y', c: 'z' }), platforms: { instagram: profile(true), facebook: buildPlatform('facebook', { link_in_bio: { url: 'https://example.com' } }) } }).score).toBe(2));
        it('full ecosystem -> 3', () => expect(run('cross_platform_connectivity', { hub: hubLinks({ a: 'x', b: 'y', c: 'z' }), platforms: { instagram: profile(false) } }).score).toBe(3));
    });

    describe('community_presence', () => {
        it('none -> 0', () => expect(run('community_presence', { hub: buildHub({ social_links: {} }), platforms: {} }).score).toBe(0));
        it('1 channel -> 1', () => expect(run('community_presence', { hub: buildHub({ social_links: {} }), platforms: { reddit: buildPlatform('reddit') } }).score).toBe(1));
        it('2 channels -> 2', () => expect(run('community_presence', { hub: buildHub({ social_links: {} }), platforms: { reddit: buildPlatform('reddit'), youtube: buildPlatform('youtube', { content_tabs: ['videos', 'community'] }) } }).score).toBe(2));
        it('3+ channels -> 3', () => expect(run('community_presence', { hub: buildHub({ social_links: { d: 'https://discord.gg/x' } }), platforms: { reddit: buildPlatform('reddit'), youtube: buildPlatform('youtube', { content_tabs: ['videos', 'community'] }) } }).score).toBe(3));
    });

    describe('gbp_review_engagement', () => {
        const gbp = (o: any) => ({ google_business_profile: buildPlatform('google_business_profile', o) });
        it('no reviews -> 0', () => expect(run('gbp_review_engagement', { platforms: gbp({ reviews_count: 0 }) }).score).toBe(0));
        it('0% response -> 0', () => expect(run('gbp_review_engagement', { platforms: gbp({ reviews_count: 50, owner_response_rate: 0 }) }).score).toBe(0));
        it('<25% -> 1', () => expect(run('gbp_review_engagement', { platforms: gbp({ reviews_count: 50, owner_response_rate: 0.1 }) }).score).toBe(1));
        it('<75% -> 2', () => expect(run('gbp_review_engagement', { platforms: gbp({ reviews_count: 50, owner_response_rate: 0.5 }) }).score).toBe(2));
        it('>=75% -> 3', () => expect(run('gbp_review_engagement', { platforms: gbp({ reviews_count: 50, owner_response_rate: 0.9 }) }).score).toBe(3));
    });

    describe('content_organization', () => {
        it('none -> 0', () => expect(run('content_organization', { platforms: {} }).score).toBe(0));
        it('1 feature -> 1', () => expect(run('content_organization', { platforms: { youtube: buildPlatform('youtube', { playlist_count: 5 }) } }).score).toBe(1));
        it('2-3 features -> 2', () => expect(run('content_organization', { platforms: { youtube: buildPlatform('youtube', { playlist_count: 5 }), pinterest: buildPlatform('pinterest', { board_count: 8 }) } }).score).toBe(2));
        it('4 features -> 3', () => expect(run('content_organization', {
            platforms: {
                youtube: buildPlatform('youtube', { playlist_count: 5 }),
                pinterest: buildPlatform('pinterest', { board_count: 8 }),
                instagram: buildPlatform('instagram', { content_mix: { highlights: 6 } }),
                linkedin: buildPlatform('linkedin', { featured_section: true }),
            },
        }).score).toBe(3));
    });
});
