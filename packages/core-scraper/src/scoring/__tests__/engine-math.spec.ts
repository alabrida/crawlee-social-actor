import { describe, it, expect } from 'vitest';
import { calculateAssessment } from '../engine.js';
import { STAGE_WEIGHTS } from '../rubric.js';
import { buildHub, buildDegradedHub } from './helpers/hub-fixture.js';
import { buildPlatform } from './helpers/platform-fixture.js';

const STAGES = ['awareness', 'consideration', 'decision', 'conversion', 'retention'] as const;

function recomputeOverall(res: any): number {
    const w: any = STAGE_WEIGHTS[res.business_class as keyof typeof STAGE_WEIGHTS];
    const s = res.assessment_detail.stages;
    const o = STAGES.reduce((acc, st) => acc + s[st].score * w[st], 0);
    return Math.round(o * 10) / 10;
}

describe('engine math', () => {
    it('overall_score equals Σ(stage · STAGE_WEIGHTS[class])', () => {
        const res = calculateAssessment(
            { instagram: buildPlatform('instagram'), google_business_profile: buildPlatform('google_business_profile') },
            buildHub(), { serpRankingPosition: 2 }, 'Brand', 'https://example.com',
        );
        expect(res.overall_score).toBeCloseTo(recomputeOverall(res), 5);
    });

    it('every stage score and overall stay within 0-10', () => {
        const res = calculateAssessment({}, buildHub(), null, 'Brand', 'https://example.com');
        for (const st of STAGES) {
            const v = res.assessment_detail.stages[st].score;
            expect(v).toBeGreaterThanOrEqual(0);
            expect(v).toBeLessThanOrEqual(10);
        }
        expect(res.overall_score).toBeGreaterThanOrEqual(0);
        expect(res.overall_score).toBeLessThanOrEqual(10);
    });

    it('degraded crawl + no platforms -> near-zero overall (false-negative zeros)', () => {
        const res = calculateAssessment({}, buildDegradedHub(), null, 'Brand', 'https://example.com');
        expect(res.overall_score).toBeLessThan(2);
    });

    it('maturity_tier matches the overall-score thresholds', () => {
        const res = calculateAssessment({ instagram: buildPlatform('instagram') }, buildHub(), { serpRankingPosition: 2 }, 'Brand', 'https://example.com');
        const tier = res.assessment_detail.classification.maturity_tier;
        const o = res.overall_score;
        if (o > 7.5) expect(tier).toBe('Market Leader');
        else if (o >= 4.0) expect(tier).toBe('Established');
        else expect(tier).toBe('Foundational');
    });

    it('weakest_stage is the lowest-scoring stage', () => {
        const res = calculateAssessment({ instagram: buildPlatform('instagram') }, buildHub(), null, 'Brand', 'https://example.com');
        const stages = res.assessment_detail.stages;
        const min = Math.min(...STAGES.map(s => stages[s].score));
        expect(stages[res.weakest_stage as typeof STAGES[number]].score).toBe(min);
    });
});
