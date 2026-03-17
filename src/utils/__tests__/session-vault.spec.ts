import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SessionVault, type VaultData } from '../session-vault.js';
import { Actor } from 'apify';

// Mock Apify Actor KeyValueStore
vi.mock('apify', () => {
    return {
        Actor: {
            openKeyValueStore: vi.fn(),
        }
    };
});

describe('SessionVault', () => {
    let mockStore: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockStore = {
            id: 'mock-store-id',
            getValue: vi.fn(),
            setValue: vi.fn()
        };
        (Actor.openKeyValueStore as any).mockResolvedValue(mockStore);
    });

    it('should initialize with empty data if vault is empty', async () => {
        mockStore.getValue.mockResolvedValue(null);

        const vault = new SessionVault();
        await vault.initialize();

        expect(Actor.openKeyValueStore).toHaveBeenCalledWith('AUTH_SESSION_VAULT');
        expect(mockStore.getValue).toHaveBeenCalledWith('tokens');

        // Even though it is brand new, the code initializes `updatedAt` to `new Date()`.
        // This means it thinks it was just updated 0 days ago.
        // What we really want to check is that tokens are empty:
        const tokens = await vault.getTokens();
        expect(tokens).toEqual({});
        expect(vault.needsRefresh()).toBe(false);
    });

    it('should calculate needsRefresh correctly for old tokens', async () => {
        // 21 days ago
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 21);

        const staleData: VaultData = {
            updatedAt: pastDate.toISOString(),
            tokens: { linkedin: 'stale-token' }
        };

        mockStore.getValue.mockResolvedValue(staleData);

        const vault = new SessionVault();
        await vault.initialize();

        expect(vault.needsRefresh()).toBe(true);
    });

    it('should not need refresh for recent tokens', async () => {
        // 5 days ago
        const recentDate = new Date();
        recentDate.setDate(recentDate.getDate() - 5);

        const recentData: VaultData = {
            updatedAt: recentDate.toISOString(),
            tokens: { linkedin: 'fresh-token' }
        };

        mockStore.getValue.mockResolvedValue(recentData);

        const vault = new SessionVault();
        await vault.initialize();

        expect(vault.needsRefresh()).toBe(false);
    });

    it('should save tokens and update timestamp', async () => {
        mockStore.getValue.mockResolvedValue(null);

        const vault = new SessionVault();
        await vault.initialize();

        await vault.saveTokens({ facebook: 'new-fb-token' });

        expect(mockStore.setValue).toHaveBeenCalled();

        const storedTokens = await vault.getTokens();
        expect(storedTokens).toEqual({ facebook: 'new-fb-token' });
        expect(vault.needsRefresh()).toBe(false); // Just saved
    });
});
