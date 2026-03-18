import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getActorMode, getSiloName, FEATURES } from '../mode-gate.js';

describe('mode-gate utility', () => {
    let originalEnv: string | undefined;

    beforeEach(() => {
        // Backup the original ACTOR_MODE environment variable
        originalEnv = process.env.ACTOR_MODE;
    });

    afterEach(() => {
        // Restore original ACTOR_MODE after each test
        if (originalEnv === undefined) {
            delete process.env.ACTOR_MODE;
        } else {
            process.env.ACTOR_MODE = originalEnv;
        }
    });

    describe('getActorMode', () => {
        it('should default to PUBLIC when ACTOR_MODE is not set', () => {
            delete process.env.ACTOR_MODE;
            expect(getActorMode()).toBe('PUBLIC');
        });

        it('should return INTERNAL when ACTOR_MODE is INTERNAL', () => {
            process.env.ACTOR_MODE = 'INTERNAL';
            expect(getActorMode()).toBe('INTERNAL');
        });

        it('should return SAAS when ACTOR_MODE is SAAS', () => {
            process.env.ACTOR_MODE = 'SAAS';
            expect(getActorMode()).toBe('SAAS');
        });

        it('should return PUBLIC when ACTOR_MODE is PUBLIC', () => {
            process.env.ACTOR_MODE = 'PUBLIC';
            expect(getActorMode()).toBe('PUBLIC');
        });

        it('should handle lowercase environment variables', () => {
            process.env.ACTOR_MODE = 'internal';
            expect(getActorMode()).toBe('INTERNAL');
        });
    });

    describe('getSiloName', () => {
        it('should return the correct name for INTERNAL', () => {
            process.env.ACTOR_MODE = 'INTERNAL';
            expect(getSiloName()).toBe('Consultant Audit Tool (Private)');
        });

        it('should return the correct name for SAAS', () => {
            process.env.ACTOR_MODE = 'SAAS';
            expect(getSiloName()).toBe('Revenue Journey SaaS Engine');
        });

        it('should return the correct name for PUBLIC', () => {
            process.env.ACTOR_MODE = 'PUBLIC';
            expect(getSiloName()).toBe('Unified Social Media Scraper (Open Marketplace)');
        });

        it('should return "Unknown Silo" for unrecognized modes', () => {
            process.env.ACTOR_MODE = 'UNKNOWN_MODE';
            expect(getSiloName()).toBe('Unknown Silo');
        });
    });

    describe('FEATURES configuration', () => {
        it('should enable directUpsert only in INTERNAL mode', () => {
            process.env.ACTOR_MODE = 'INTERNAL';
            expect(FEATURES.directUpsert()).toBe(true);

            process.env.ACTOR_MODE = 'SAAS';
            expect(FEATURES.directUpsert()).toBe(false);

            process.env.ACTOR_MODE = 'PUBLIC';
            expect(FEATURES.directUpsert()).toBe(false);
        });

        it('should enable revenueScoring in INTERNAL and SAAS, but not PUBLIC', () => {
            process.env.ACTOR_MODE = 'INTERNAL';
            expect(FEATURES.revenueScoring()).toBe(true);

            process.env.ACTOR_MODE = 'SAAS';
            expect(FEATURES.revenueScoring()).toBe(true);

            process.env.ACTOR_MODE = 'PUBLIC';
            expect(FEATURES.revenueScoring()).toBe(false);
        });

        it('should enable hubForensics in INTERNAL and SAAS, but not PUBLIC', () => {
            process.env.ACTOR_MODE = 'INTERNAL';
            expect(FEATURES.hubForensics()).toBe(true);

            process.env.ACTOR_MODE = 'SAAS';
            expect(FEATURES.hubForensics()).toBe(true);

            process.env.ACTOR_MODE = 'PUBLIC';
            expect(FEATURES.hubForensics()).toBe(false);
        });

        it('should enable deepLinkAudit in INTERNAL and SAAS, but not PUBLIC', () => {
            process.env.ACTOR_MODE = 'INTERNAL';
            expect(FEATURES.deepLinkAudit()).toBe(true);

            process.env.ACTOR_MODE = 'SAAS';
            expect(FEATURES.deepLinkAudit()).toBe(true);

            process.env.ACTOR_MODE = 'PUBLIC';
            expect(FEATURES.deepLinkAudit()).toBe(false);
        });

        it('should enable fullSchemaParity in INTERNAL and SAAS, but not PUBLIC', () => {
            process.env.ACTOR_MODE = 'INTERNAL';
            expect(FEATURES.fullSchemaParity()).toBe(true);

            process.env.ACTOR_MODE = 'SAAS';
            expect(FEATURES.fullSchemaParity()).toBe(true);

            process.env.ACTOR_MODE = 'PUBLIC';
            expect(FEATURES.fullSchemaParity()).toBe(false);
        });

        it('should enable tierGating only in SAAS mode', () => {
            process.env.ACTOR_MODE = 'INTERNAL';
            expect(FEATURES.tierGating()).toBe(false);

            process.env.ACTOR_MODE = 'SAAS';
            expect(FEATURES.tierGating()).toBe(true);

            process.env.ACTOR_MODE = 'PUBLIC';
            expect(FEATURES.tierGating()).toBe(false);
        });

        it('should correctly proxy getSiloName', () => {
            process.env.ACTOR_MODE = 'SAAS';
            expect(FEATURES.getSiloName()).toBe('Revenue Journey SaaS Engine');
        });
    });
});
