import { describe, it, expect } from 'vitest';
import { STAGE_WEIGHTS, MECHANISMS } from '../rubric.js';

const CLASSES = ['local', 'professional_services', 'ecommerce', 'saas', 'content_creator', 'influencer'] as const;
const STAGES = ['awareness', 'consideration', 'decision', 'conversion', 'retention'] as const;

describe('stage weights & mechanism weight coverage', () => {
    it('STAGE_WEIGHTS sum to 1.0 for every business class', () => {
        for (const c of CLASSES) {
            const sum = STAGES.reduce((acc, s) => acc + (STAGE_WEIGHTS[c] as any)[s], 0);
            expect(sum, `weights for ${c}`).toBeCloseTo(1.0, 5);
        }
    });

    it('every mechanism has a weight for all 6 business classes (no silent 0)', () => {
        for (const m of MECHANISMS) {
            for (const c of CLASSES) {
                expect(typeof m.weights[c], `${m.name}.weights.${c}`).toBe('number');
            }
        }
    });

    it('exactly 30 mechanisms across the 5 stages', () => {
        expect(MECHANISMS.length).toBe(30);
        for (const s of STAGES) {
            expect(MECHANISMS.filter(m => m.stage === s).length, `stage ${s}`).toBeGreaterThan(0);
        }
    });
});
