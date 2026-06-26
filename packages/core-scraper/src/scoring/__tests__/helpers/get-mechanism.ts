/**
 * @module scoring/__tests__/helpers/get-mechanism
 * @description Locate and run a single scoring mechanism by name, mirroring the engine's
 * evaluate(platforms, hub, serp) call so unit tests exercise the real rubric code.
 */

import { MECHANISMS } from '../../rubric.js';
import type { MechanismConfig } from '../../types.js';

export function getMechanism(name: string): MechanismConfig {
    const m = MECHANISMS.find(x => x.name === name);
    if (!m) throw new Error(`Mechanism not found: ${name}`);
    return m;
}

export function runMechanism(
    name: string,
    ctx: { platforms?: Record<string, any>; hub?: any; serp?: any } = {},
): { score: number; evidence: string | null } {
    return getMechanism(name).evaluate(ctx.platforms || {}, ctx.hub, ctx.serp);
}
