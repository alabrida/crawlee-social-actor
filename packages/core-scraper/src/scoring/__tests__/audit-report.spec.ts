import { describe, it, expect } from 'vitest';
import { buildAuditReport } from '../audit-report.js';
import { calculateAssessment } from '../engine.js';
import { buildHub, buildDegradedHub } from './helpers/hub-fixture.js';
import { buildPlatform } from './helpers/platform-fixture.js';

describe('audit report (via engine)', () => {
    it('covers every one of the 30 mechanisms exactly once', () => {
        const res = calculateAssessment({ instagram: buildPlatform('instagram') }, buildHub(), null, 'Brand', 'https://example.com');
        const audit = res.assessment_detail.audit;
        expect(audit.mechanisms.length).toBe(30);
        const names = new Set(audit.mechanisms.map((m: any) => m.name));
        expect(names.size).toBe(30);
    });

    it('healthy crawl -> ok, nothing flagged', () => {
        const res = calculateAssessment({ instagram: buildPlatform('instagram') }, buildHub(), null, 'Brand', 'https://example.com');
        expect(res.assessment_detail.crawl_quality.status).toBe('ok');
        expect(res.assessment_detail.audit.needs_review_count).toBe(0);
    });

    it('degraded crawl flags hub-derived mechanisms for review', () => {
        const res = calculateAssessment({}, buildDegradedHub(), null, 'Brand', 'https://example.com');
        expect(res.assessment_detail.crawl_quality.status).toBe('failed');
        expect(res.assessment_detail.audit.needs_review_count).toBeGreaterThan(0);
    });
});

describe('buildAuditReport (direct)', () => {
    const scored = [
        { name: 'ecommerce_checkout', label: 'E-Commerce Checkout', score: 0, max: 3, evidence: 'No e-commerce indicators detected', recommendation: 'x' },
        { name: 'follower_reach', label: 'Aggregate Follower Reach', score: 3, max: 3, evidence: 'reach', recommendation: null },
    ];

    it('Best Buy shape: degraded crawl + low confidence flag the suspicious hub zero', () => {
        const report = buildAuditReport(scored as any, buildDegradedHub({ ecommerce: { detected: false, platform: null, has_cart: false, has_checkout: false } }), {}, 0.33);
        expect(report.low_confidence_classification).toBe(true);
        const eco = report.mechanisms.find(m => m.name === 'ecommerce_checkout')!;
        expect(eco.needs_review).toBe(true);
        expect(eco.review_reason).toMatch(/false negative/i);
        expect(eco.raw_signal['hub.ecommerce.detected']).toBe(false);
        // platform-only mechanism on a degraded hub is not flagged (it doesn't read the hub).
        expect(report.mechanisms.find(m => m.name === 'follower_reach')!.needs_review).toBe(false);
    });

    it('high confidence + ok crawl -> not flagged', () => {
        const report = buildAuditReport(scored as any, buildHub(), {}, 0.8);
        expect(report.low_confidence_classification).toBe(false);
        expect(report.needs_review_count).toBe(0);
    });
});
