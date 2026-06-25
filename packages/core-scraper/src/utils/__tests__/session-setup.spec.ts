import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupSessionAndAuth } from '../session-setup.js';
import type { ActorInput } from '../../types.js';

// Mock logger
vi.mock('../logger.js', () => ({
    log: {
        info: vi.fn(),
        debug: vi.fn(),
        error: vi.fn(),
        warning: vi.fn(),
    },
}));

// Mock SessionVault
const mockSessionVaultInstance = {
    initialize: vi.fn().mockResolvedValue(undefined),
    needsRefresh: vi.fn().mockReturnValue(false),
    isEmpty: vi.fn().mockReturnValue(false),
    ageDays: vi.fn().mockReturnValue(1),
    runInteractiveSetup: vi.fn().mockResolvedValue(undefined),
    getTokens: vi.fn().mockResolvedValue({ facebook: 'vault-fb-cookie' }),
};
vi.mock('../session-vault.js', () => {
    return {
        SessionVault: vi.fn().mockImplementation(() => mockSessionVaultInstance),
    };
});

// Mock health check
const mockCheckSessionHealth = vi.fn().mockResolvedValue({ ok: true });
vi.mock('../health-check.js', () => {
    return {
        checkSessionHealth: (platform: string, token: string) => mockCheckSessionHealth(platform, token),
    };
});

// Mock Supabase
const mockGetExistingAssessment = vi.fn().mockResolvedValue(null);
vi.mock('../supabase.js', () => {
    return {
        getExistingAssessment: (businessUrl: string, url: string, key: string) => mockGetExistingAssessment(businessUrl, url, key),
    };
});

describe('session-setup.ts', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockSessionVaultInstance.initialize.mockResolvedValue(undefined);
        mockSessionVaultInstance.needsRefresh.mockReturnValue(false);
        mockSessionVaultInstance.getTokens.mockResolvedValue({ facebook: 'vault-fb-cookie' });
        mockCheckSessionHealth.mockResolvedValue({ ok: true });
        mockGetExistingAssessment.mockResolvedValue(null);
    });

    it('should initialize session vault and load tokens if missing', async () => {
        const input: ActorInput = {
            businessUrl: 'https://example.com',
            urls: [{ platform: 'facebook', url: 'https://facebook.com/test' }],
            platforms: ['facebook'],
            maxConcurrency: 10,
            maxRequestRetries: 3,
            proxy: { useApifyProxy: true, apifyProxyGroups: [] },
            linkedinDailyLimit: 10,
            googleMapsGrid: { enabled: false, cellSizeKm: 1 }
        };

        await setupSessionAndAuth(input);

        expect(mockSessionVaultInstance.initialize).toHaveBeenCalled();
        expect(input.authTokens?.facebook).toBe('vault-fb-cookie');
    });

    it('should skip the platform (not abort) when session check fails definitively and no historical data exists', async () => {
        mockCheckSessionHealth.mockResolvedValue({ ok: false, error: 'Session expired', definitive: true });
        mockGetExistingAssessment.mockResolvedValue(null);

        const input: ActorInput = {
            businessUrl: 'https://example.com',
            urls: [
                { platform: 'facebook', url: 'https://facebook.com/test' },
                { platform: 'tiktok', url: 'https://tiktok.com/@test' },
            ],
            platforms: ['facebook', 'tiktok'],
            maxConcurrency: 10,
            maxRequestRetries: 3,
            proxy: { useApifyProxy: true, apifyProxyGroups: [] },
            linkedinDailyLimit: 10,
            googleMapsGrid: { enabled: false, cellSizeKm: 1 }
        };

        // A stale social cookie must degrade gracefully, not abort the whole audit.
        await expect(setupSessionAndAuth(input)).resolves.toBeUndefined();

        // Facebook (gated, failed) is dropped; the non-gated tiktok platform survives.
        expect(input.urls.map(u => u.platform)).toEqual(['tiktok']);
        expect(input.platforms).toEqual(['tiktok']);
    });

    it('should attempt the crawl when the failure is inconclusive (non-definitive)', async () => {
        // FB-style: lightweight check matched a login-wall heuristic but can't auth a
        // browser-gated platform. The platform must NOT be skipped — the browser decides.
        mockCheckSessionHealth.mockResolvedValue({ ok: false, error: 'heuristic', definitive: false });
        mockGetExistingAssessment.mockResolvedValue(null);

        const input: ActorInput = {
            businessUrl: 'https://example.com',
            urls: [{ platform: 'facebook', url: 'https://facebook.com/test' }],
            platforms: ['facebook'],
            maxConcurrency: 10,
            maxRequestRetries: 3,
            proxy: { useApifyProxy: true, apifyProxyGroups: [] },
            linkedinDailyLimit: 10,
            googleMapsGrid: { enabled: false, cellSizeKm: 1 }
        };

        await setupSessionAndAuth(input);

        // Facebook is kept for the browser crawl despite the inconclusive pre-flight.
        expect(input.urls.map(u => u.platform)).toEqual(['facebook']);
        expect(input.platforms).toEqual(['facebook']);
    });

    it('should skip crawl and fallback to merge if session check fails definitively and historical data exists', async () => {
        mockCheckSessionHealth.mockResolvedValue({ ok: false, error: 'Session expired', definitive: true });
        mockGetExistingAssessment.mockResolvedValue({
            assessment_detail: {
                platforms: {
                    facebook: [{ url: 'https://facebook.com/test', followers: 1234 }]
                }
            }
        });

        const input: ActorInput = {
            businessUrl: 'https://example.com',
            urls: [{ platform: 'facebook', url: 'https://facebook.com/test' }],
            platforms: ['facebook'],
            maxConcurrency: 10,
            maxRequestRetries: 3,
            proxy: { useApifyProxy: true, apifyProxyGroups: [] },
            linkedinDailyLimit: 10,
            googleMapsGrid: { enabled: false, cellSizeKm: 1 },
            supabaseUrl: 'https://supabase.url',
            supabaseServiceKey: 'key'
        };

        await setupSessionAndAuth(input);

        // check that facebook was removed from the crawl list (urls and platforms)
        expect(input.urls.length).toBe(0);
        expect(input.platforms.length).toBe(0);
    });
});
