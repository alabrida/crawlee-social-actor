/**
 * @module scoring/rubric
 * @description Exports the 30 mechanisms, weights, and scoring rules for the Revenue Journey.
 * Modularized for compliance with the 250-line maintenance mandate.
 */

import { BusinessClass, MechanismConfig } from './types.js';
import { AWARENESS_MECHANISMS } from './rubric/awareness.js';
import { CONSIDERATION_MECHANISMS } from './rubric/consideration.js';
import { DECISION_MECHANISMS } from './rubric/decision.js';
import { CONVERSION_MECHANISMS } from './rubric/conversion.js';
import { RETENTION_MECHANISMS } from './rubric/retention.js';

export const STAGE_WEIGHTS: Record<BusinessClass, Record<string, number>> = {
    local: {
        awareness: 0.25,
        consideration: 0.20,
        decision: 0.15,
        conversion: 0.25,
        retention: 0.15
    },
    professional_services: {
        awareness: 0.20,
        consideration: 0.25,
        decision: 0.20,
        conversion: 0.20,
        retention: 0.15
    },
    ecommerce: {
        awareness: 0.20,
        consideration: 0.15,
        decision: 0.20,
        conversion: 0.30,
        retention: 0.15
    },
    saas: {
        awareness: 0.15,
        consideration: 0.20,
        decision: 0.25,
        conversion: 0.25,
        retention: 0.15
    },
    content_creator: {
        awareness: 0.25,
        consideration: 0.20,
        decision: 0.15,
        conversion: 0.25,
        retention: 0.15
    }
};

export const MECHANISMS: MechanismConfig[] = [
    ...AWARENESS_MECHANISMS,
    ...CONSIDERATION_MECHANISMS,
    ...DECISION_MECHANISMS,
    ...CONVERSION_MECHANISMS,
    ...RETENTION_MECHANISMS
];
