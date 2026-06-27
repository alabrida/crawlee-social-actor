import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { checkSessionHealth } from '../health-check.js';

// Mock log
vi.mock('../logger.js', () => ({
    log: {
        info: vi.fn(),
        debug: vi.fn(),
        error: vi.fn(),
        warning: vi.fn(),
    },
}));

// The rewrite's whole point: pre-flight must NOT touch the network for the operator's
// account-sensitive platforms. A non-browser fetch carrying the session cookie to an
// account page (e.g. instagram.com/accounts/edit) from an unfamiliar IP is exactly what
// trips Meta/X "verify it's you" checkpoints. So the only safe signal is cookie presence.
describe('health-check.ts (no-network, account-protection safe)', () => {
    const originalFetch = global.fetch;

    beforeEach(() => {
        vi.clearAllMocks();
        global.fetch = vi.fn();
    });

    afterEach(() => {
        global.fetch = originalFetch;
    });

    it('NEVER performs a network request for account-sensitive platforms', async () => {
        for (const p of ['instagram', 'facebook', 'twitter', 'linkedin'] as const) {
            await checkSessionHealth(p, 'cookie=present');
        }
        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('defers validity (ok) when a cookie is present for a sensitive platform', async () => {
        expect(await checkSessionHealth('instagram', 'sessionid=abc')).toEqual({ ok: true });
        expect(await checkSessionHealth('linkedin', 'li_at=valid')).toEqual({ ok: true });
    });

    it('fails conclusively when no cookie is present (cheap, no request)', async () => {
        const result = await checkSessionHealth('instagram', undefined);
        expect(result.ok).toBe(false);
        expect(result.definitive).toBe(true);
        expect(result.error).toContain('No authentication tokens');
        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('passes for non-authenticated platforms', async () => {
        expect((await checkSessionHealth('reddit', undefined)).ok).toBe(true);
    });

    it('passes for youtube (anonymous visitor cookies)', async () => {
        expect((await checkSessionHealth('youtube', 'dummy-cookie')).ok).toBe(true);
    });
});
