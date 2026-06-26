import { describe, it, expect } from 'vitest';
import { runMechanism as run } from '../helpers/get-mechanism.js';
import { buildHub, buildDegradedHub } from '../helpers/hub-fixture.js';
import { buildPlatform } from '../helpers/platform-fixture.js';

const gbp = (o: any = {}) => ({ google_business_profile: buildPlatform('google_business_profile', o) });

describe('consideration mechanisms', () => {
    describe('reviews_ratings', () => {
        it('no reviews -> 0', () => expect(run('reviews_ratings', { platforms: {} }).score).toBe(0));
        it('few reviews (<10) -> 1', () => expect(run('reviews_ratings', { platforms: gbp({ reviews_count: 5, rating: 4.5 }) }).score).toBe(1));
        it('functional (10-24) -> 2', () => expect(run('reviews_ratings', { platforms: gbp({ reviews_count: 20, rating: 4.5 }) }).score).toBe(2));
        it('strong (>=25, >=4.0) -> 3', () => expect(run('reviews_ratings', { platforms: gbp({ reviews_count: 50, rating: 4.5 }) }).score).toBe(3));
    });

    describe('case_studies', () => {
        it('degraded -> 0', () => expect(run('case_studies', { hub: buildDegradedHub() }).score).toBe(0));
        it('not detected -> 0', () => expect(run('case_studies', { hub: buildHub({ case_studies: { detected: false } }) }).score).toBe(0));
        it('detected but uncountable (null) -> 1 (not a fabricated high score)', () => expect(run('case_studies', { hub: buildHub({ case_studies: { detected: true, type: null, count: null } }) }).score).toBe(1));
        it('logo wall / single -> 1', () => expect(run('case_studies', { hub: buildHub({ case_studies: { detected: true, type: 'logo_wall', count: 1 } }) }).score).toBe(1));
        it('2 entries -> 2', () => expect(run('case_studies', { hub: buildHub({ case_studies: { detected: true, type: 'case_study', count: 2 } }) }).score).toBe(2));
        it('3+ rich -> 3', () => expect(run('case_studies', { hub: buildHub({ case_studies: { detected: true, type: 'case_study', count: 4 } }) }).score).toBe(3));
    });

    describe('testimonials', () => {
        it('not detected -> 0', () => expect(run('testimonials', { hub: buildHub({ testimonials: { detected: false } }) }).score).toBe(0));
        it('unattributed -> 1', () => expect(run('testimonials', { hub: buildHub({ testimonials: { detected: true, has_named_source: false } }) }).score).toBe(1));
        it('attributed <3 -> 2', () => expect(run('testimonials', { hub: buildHub({ testimonials: { detected: true, has_named_source: true, count: 2 } }) }).score).toBe(2));
        it('rich -> 3', () => expect(run('testimonials', { hub: buildHub({ testimonials: { detected: true, has_named_source: true, count: 5 } }) }).score).toBe(3));
    });

    describe('content_recency', () => {
        const d = (days: number | null) => ({ instagram: buildPlatform('instagram', { days_since_post: days }) });
        it('no data -> 0', () => expect(run('content_recency', { platforms: { instagram: buildPlatform('instagram', { days_since_post: undefined }) } }).score).toBe(0));
        it('>180 -> 0', () => expect(run('content_recency', { platforms: d(200) }).score).toBe(0));
        it('>30 -> 1', () => expect(run('content_recency', { platforms: d(45) }).score).toBe(1));
        it('>7 -> 2', () => expect(run('content_recency', { platforms: d(10) }).score).toBe(2));
        it('<=7 -> 3', () => expect(run('content_recency', { platforms: d(3) }).score).toBe(3));
    });

    describe('authority_signals', () => {
        const p = (o: any) => ({ instagram: buildPlatform('instagram', o) });
        it('none -> 0', () => expect(run('authority_signals', { platforms: p({ verified: false, bio_analysis: { hasAuthorityProof: false } }) }).score).toBe(0));
        it('bio authority only -> 1', () => expect(run('authority_signals', { platforms: p({ verified: false, bio_analysis: { hasAuthorityProof: true } }) }).score).toBe(1));
        it('verified only (no bio authority) -> 2', () => expect(run('authority_signals', { platforms: p({ verified: true, bio_analysis: { hasAuthorityProof: false } }) }).score).toBe(2));
        it('verified + bio authority -> 3', () => expect(run('authority_signals', { platforms: p({ verified: true, bio_analysis: { hasAuthorityProof: true } }) }).score).toBe(3));
    });

    describe('external_link_quality', () => {
        const lib = (type: string | null) => ({ instagram: buildPlatform('instagram', type ? { link_in_bio: { type } } : {}) });
        it('no link-in-bio -> 0', () => expect(run('external_link_quality', { platforms: lib(null) }).score).toBe(0));
        it('present but broken -> 1', () => expect(run('external_link_quality', { platforms: lib('unknown') }).score).toBe(1));
        it('direct website -> 2', () => expect(run('external_link_quality', { platforms: lib('direct_website') }).score).toBe(2));
        it('aggregator/booking -> 3', () => expect(run('external_link_quality', { platforms: lib('link_aggregator') }).score).toBe(3));
    });

    describe('linkedin_presence', () => {
        const li = (o: any) => ({ linkedin: buildPlatform('linkedin', o) });
        it('no url -> 0', () => expect(run('linkedin_presence', { platforms: { linkedin: { url: null } } }).score).toBe(0));
        it('company, no website/desc -> 1', () => expect(run('linkedin_presence', { platforms: li({ websiteUrl: null, about_length: 0 }) }).score).toBe(1));
        it('company, website only -> 2', () => expect(run('linkedin_presence', { platforms: li({ websiteUrl: 'https://x.com', about_length: 0 }) }).score).toBe(2));
        it('company, website + desc -> 3', () => expect(run('linkedin_presence', { platforms: li({ websiteUrl: 'https://x.com', about_length: 400 }) }).score).toBe(3));
    });
});
