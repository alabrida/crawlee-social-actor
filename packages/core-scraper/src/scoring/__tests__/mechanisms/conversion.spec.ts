import { describe, it, expect } from 'vitest';
import { runMechanism as run } from '../helpers/get-mechanism.js';
import { buildHub, buildDegradedHub } from '../helpers/hub-fixture.js';
import { buildPlatform } from '../helpers/platform-fixture.js';

describe('conversion mechanisms', () => {
    describe('forms_lead_capture', () => {
        it('0 forms -> 0', () => expect(run('forms_lead_capture', { hub: buildHub({ forms: { count: 0, types: [] } }) }).score).toBe(0));
        it('1 form -> 1', () => expect(run('forms_lead_capture', { hub: buildHub({ forms: { count: 1, types: ['contact'] } }) }).score).toBe(1));
        it('>=2 types -> 2', () => expect(run('forms_lead_capture', { hub: buildHub({ forms: { count: 3, types: ['contact', 'newsletter'] } }) }).score).toBe(2));
        it('multiple, <2 types -> 3', () => expect(run('forms_lead_capture', { hub: buildHub({ forms: { count: 3, types: ['contact'] } }) }).score).toBe(3));
    });

    describe('ecommerce_checkout', () => {
        it('degraded -> 0', () => expect(run('ecommerce_checkout', { hub: buildDegradedHub() }).score).toBe(0));
        it('no indicators -> 0', () => expect(run('ecommerce_checkout', { hub: buildHub({ ecommerce: { detected: false, platform: null } }) }).score).toBe(0));
        it('products, no cart -> 1', () => expect(run('ecommerce_checkout', { hub: buildHub({ ecommerce: { detected: true, platform: null, has_cart: false } }) }).score).toBe(1));
        it('cart, no checkout -> 2', () => expect(run('ecommerce_checkout', { hub: buildHub({ ecommerce: { detected: true, platform: 'Shopify', has_cart: true, has_checkout: false } }) }).score).toBe(2));
        it('full checkout -> 3', () => expect(run('ecommerce_checkout', { hub: buildHub({ ecommerce: { detected: true, platform: 'Shopify', has_cart: true, has_checkout: true } }) }).score).toBe(3));
    });

    describe('mobile_optimization', () => {
        it('no signals -> 0', () => expect(run('mobile_optimization', { hub: buildHub({ mobile: { viewport_meta: false, responsive: false } }) }).score).toBe(0));
        it('viewport, not responsive -> 1', () => expect(run('mobile_optimization', { hub: buildHub({ mobile: { viewport_meta: true, responsive: false } }) }).score).toBe(1));
        it('responsive but slow -> 2', () => expect(run('mobile_optimization', { hub: buildHub({ mobile: { viewport_meta: true, responsive: true }, performance: { ttfb_ms: 3000 } }) }).score).toBe(2));
        it('responsive + fast -> 3', () => expect(run('mobile_optimization', { hub: buildHub({ mobile: { viewport_meta: true, responsive: true }, performance: { ttfb_ms: 800 } }) }).score).toBe(3));
    });

    describe('email_newsletter_capture', () => {
        it('neither -> 0', () => expect(run('email_newsletter_capture', { hub: buildHub({ forms: { types: ['contact'] } }), platforms: {} }).score).toBe(0));
        it('newsletter only -> 1', () => expect(run('email_newsletter_capture', { hub: buildHub({ forms: { types: ['newsletter'] } }), platforms: {} }).score).toBe(1));
        it('lead magnet only -> 2', () => expect(run('email_newsletter_capture', { hub: buildHub({ forms: { types: ['lead_magnet'] } }), platforms: {} }).score).toBe(2));
        it('both -> 3', () => expect(run('email_newsletter_capture', { hub: buildHub({ forms: { types: ['newsletter', 'lead_magnet'] } }), platforms: {} }).score).toBe(3));
    });

    describe('chat_realtime', () => {
        it('degraded -> 0', () => expect(run('chat_realtime', { hub: buildDegradedHub() }).score).toBe(0));
        it('not detected -> 0', () => expect(run('chat_realtime', { hub: buildHub({ chat: { detected: false } }) }).score).toBe(0));
        it('generic (no provider) -> 1', () => expect(run('chat_realtime', { hub: buildHub({ chat: { detected: true, provider: null } }) }).score).toBe(1));
        it('provider, no bot -> 2', () => expect(run('chat_realtime', { hub: buildHub({ chat: { detected: true, provider: 'zendesk', has_bot: false } }) }).score).toBe(2));
        it('AI/bot -> 3', () => expect(run('chat_realtime', { hub: buildHub({ chat: { detected: true, provider: 'intercom', has_bot: true } }) }).score).toBe(3));
    });
});
