import { describe, it, expect } from 'vitest';
import { runMechanism as run } from '../helpers/get-mechanism.js';
import { buildHub, buildDegradedHub } from '../helpers/hub-fixture.js';
import { buildPlatform } from '../helpers/platform-fixture.js';

describe('decision mechanisms', () => {
    describe('pricing_transparency', () => {
        it('degraded -> 0', () => expect(run('pricing_transparency', { hub: buildDegradedHub() }).score).toBe(0));
        it('not detected -> 0', () => expect(run('pricing_transparency', { hub: buildHub({ pricing: { detected: false } }) }).score).toBe(0));
        it('quotes only -> 1', () => expect(run('pricing_transparency', { hub: buildHub({ pricing: { detected: true, has_tiers: false, has_quotes_only: true } }) }).score).toBe(1));
        it('page, no tiers -> 2', () => expect(run('pricing_transparency', { hub: buildHub({ pricing: { detected: true, has_tiers: false, has_quotes_only: false } }) }).score).toBe(2));
        it('clear tiers -> 3', () => expect(run('pricing_transparency', { hub: buildHub({ pricing: { detected: true, has_tiers: true, tier_count: 3 } }) }).score).toBe(3));
    });

    describe('booking_cta', () => {
        it('no booking -> 0', () => expect(run('booking_cta', { hub: buildHub({ booking: { detected: false, provider: null }, forms: { types: ['contact'] } }), platforms: {} }).score).toBe(0));
        it('booking, not instant -> 1', () => expect(run('booking_cta', { hub: buildHub({ booking: { detected: true, provider: null } }), platforms: {} }).score).toBe(1));
        it('instant integration -> 3', () => expect(run('booking_cta', { hub: buildHub({ booking: { detected: true, provider: 'calendly' } }), platforms: {} }).score).toBe(3));
    });

    describe('contact_accessibility', () => {
        const noGbp = { platforms: {} };
        it('none -> 0', () => expect(run('contact_accessibility', { hub: buildHub({ forms: { count: 0 }, contact_info: { phone: null, email: null } }), ...noGbp }).score).toBe(0));
        it('one method -> 1', () => expect(run('contact_accessibility', { hub: buildHub({ forms: { count: 0 }, contact_info: { phone: '555', email: null } }), ...noGbp }).score).toBe(1));
        it('two methods -> 2', () => expect(run('contact_accessibility', { hub: buildHub({ forms: { count: 0 }, contact_info: { phone: '555', email: 'a@b.c' } }), ...noGbp }).score).toBe(2));
        it('three methods -> 3', () => expect(run('contact_accessibility', { hub: buildHub({ forms: { count: 2 }, contact_info: { phone: '555', email: 'a@b.c' } }), ...noGbp }).score).toBe(3));
    });

    describe('privacy_compliance', () => {
        it('neither -> 0', () => expect(run('privacy_compliance', { hub: buildHub({ privacy: { detected: false }, cookie_consent: { detected: false } }) }).score).toBe(0));
        it('privacy only -> 1', () => expect(run('privacy_compliance', { hub: buildHub({ privacy: { detected: true }, cookie_consent: { detected: false } }) }).score).toBe(1));
        // LATENT BUG (locked): privacy+cookie hits the score-2 branch, so score 3 is unreachable.
        it('privacy + cookie -> 2 (score-3 branch is dead code)', () => expect(run('privacy_compliance', { hub: buildHub({ privacy: { detected: true }, cookie_consent: { detected: true } }) }).score).toBe(2));
    });

    describe('platform_decision_signals', () => {
        it('none -> 0', () => expect(run('platform_decision_signals', { platforms: {} }).score).toBe(0));
        it('1 feature -> 1', () => expect(run('platform_decision_signals', { platforms: { instagram: buildPlatform('instagram', { has_shop: true }) } }).score).toBe(1));
        it('2-3 features -> 2', () => expect(run('platform_decision_signals', { platforms: { instagram: buildPlatform('instagram', { has_shop: true }), tiktok: buildPlatform('tiktok', { has_shop: true }) } }).score).toBe(2));
        it('4 features -> 3', () => expect(run('platform_decision_signals', {
            platforms: {
                instagram: buildPlatform('instagram', { has_shop: true }),
                tiktok: buildPlatform('tiktok', { has_shop: true }),
                youtube: buildPlatform('youtube', { has_membership: true }),
                facebook: buildPlatform('facebook', { cta_button_type: 'Shop now' }),
            },
        }).score).toBe(3));
    });
});
