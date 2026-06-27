/**
 * @module scoring/__tests__/golden/replay
 * @description Replays a golden case's saved per-platform scraped items through the real
 * scoring pipeline (hub aggregation -> SERP resolution -> calculateAssessment), mirroring
 * main.ts's aggregateAndUpsertData. Lets us assert the assessment a known business produces
 * against human-verified ground truth, fully offline.
 */

import { aggregateHubItem } from '../../../utils/hub-aggregator.js';
import { resolveBestSerp } from '../../keyword-helper.js';
import { calculateAssessment } from '../../engine.js';
import type { AssessmentResult, BusinessClass } from '../../types.js';

export interface GoldenExpected {
    business_class: BusinessClass;
    has_ecommerce?: boolean;
    /** Expected per-platform follower/subscriber counts with a percent tolerance. */
    platform_followers?: Record<string, { value: number; tolerance_pct: number }>;
    gbp_rating?: { value: number; tol: number };
    /** Optional stage-score floors (0-10) to guard against regressions. */
    min_conversion?: number;
    min_overall?: number;
}

export interface GoldenCase {
    slug: string;
    brand: string;
    businessUrl: string;
    /** Saved scraped items: { platform, url, data } — the handler OUTPUTS. */
    items: Array<{ platform: string; url: string; data: any }>;
    expected: GoldenExpected;
    classOverride?: BusinessClass | null;
}

export function scoreCase(c: GoldenCase): AssessmentResult {
    const platforms: Record<string, any[]> = {};
    let hubForensics: any = null;
    const serpResults: any[] = [];

    for (const item of c.items) {
        const p = item.platform;
        if (p === 'general' || p === 'general_hub') {
            hubForensics = aggregateHubItem(hubForensics, item, c.businessUrl);
        } else if (p === 'seo_serp') {
            if (item.data) serpResults.push(item.data);
        } else {
            (platforms[p] ??= []).push({ url: item.url, ...item.data });
        }
    }

    const bestSerp = resolveBestSerp(serpResults);
    return calculateAssessment(platforms, hubForensics, bestSerp, c.brand, c.businessUrl, c.classOverride ?? null);
}

/** A single signal comparison verdict for the accuracy table. */
export interface SignalVerdict {
    case: string;
    signal: string;
    expected: any;
    actual: any;
    pass: boolean;
}

export function compareCase(c: GoldenCase, res: AssessmentResult): SignalVerdict[] {
    const v: SignalVerdict[] = [];
    const e = c.expected;

    v.push({ case: c.slug, signal: 'business_class', expected: e.business_class, actual: res.business_class, pass: res.business_class === e.business_class });

    if (e.has_ecommerce !== undefined) {
        const actual = !!res.assessment_detail.hub_forensics?.ecommerce?.detected;
        v.push({ case: c.slug, signal: 'has_ecommerce', expected: e.has_ecommerce, actual, pass: actual === e.has_ecommerce });
    }

    for (const [plat, { value, tolerance_pct }] of Object.entries(e.platform_followers || {})) {
        const col = `${plat}_followers` as keyof AssessmentResult;
        const actual = (res as any)[col] ?? (res as any)[`${plat}_subscribers`] ?? null;
        const pass = typeof actual === 'number' && Math.abs(actual - value) <= value * (tolerance_pct / 100);
        v.push({ case: c.slug, signal: `${plat}_followers (±${tolerance_pct}%)`, expected: value, actual, pass });
    }

    if (e.gbp_rating) {
        const actual = res.gbp_rating ?? null;
        const pass = typeof actual === 'number' && Math.abs(actual - e.gbp_rating.value) <= e.gbp_rating.tol;
        v.push({ case: c.slug, signal: 'gbp_rating', expected: e.gbp_rating.value, actual, pass });
    }

    if (e.min_conversion !== undefined) {
        v.push({ case: c.slug, signal: `conversion >= ${e.min_conversion}`, expected: `>=${e.min_conversion}`, actual: res.conversion_score, pass: res.conversion_score >= e.min_conversion });
    }
    if (e.min_overall !== undefined) {
        v.push({ case: c.slug, signal: `overall >= ${e.min_overall}`, expected: `>=${e.min_overall}`, actual: res.overall_score, pass: res.overall_score >= e.min_overall });
    }

    return v;
}
