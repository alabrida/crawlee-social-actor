/**
 * @module scoring/__tests__/golden/golden.spec
 * @description Extraction-accuracy regression guard. Each human-verified golden case is
 * replayed through the real scoring pipeline and every expected signal is asserted. A
 * per-signal accuracy summary is printed so false-positive/negative drift is visible.
 */

import { describe, it, expect } from 'vitest';
import { GOLDEN_CASES } from './ground-truth.js';
import { scoreCase, compareCase, type SignalVerdict } from './replay.js';

describe('golden ground-truth extraction accuracy', () => {
    const all: SignalVerdict[] = [];

    for (const c of GOLDEN_CASES) {
        describe(c.slug, () => {
            const res = scoreCase(c);
            const verdicts = compareCase(c, res);
            all.push(...verdicts);

            for (const v of verdicts) {
                it(`${v.signal} -> expected ${JSON.stringify(v.expected)}`, () => {
                    expect(v.pass, `${c.slug}/${v.signal}: expected ${JSON.stringify(v.expected)}, got ${JSON.stringify(v.actual)}`).toBe(true);
                });
            }
        });
    }

    it('summary: no signal regressions', () => {
        const failed = all.filter((v) => !v.pass);
        const total = all.length;
        // eslint-disable-next-line no-console
        console.log(`[golden] ${total - failed.length}/${total} signals correct across ${GOLDEN_CASES.length} cases`);
        if (failed.length) {
            // eslint-disable-next-line no-console
            console.log('[golden] FAILURES:\n' + failed.map((f) => `  ${f.case}/${f.signal}: expected ${JSON.stringify(f.expected)} got ${JSON.stringify(f.actual)}`).join('\n'));
        }
        expect(failed).toEqual([]);
    });
});
