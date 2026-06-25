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

describe('health-check.ts', () => {
    const originalFetch = global.fetch;

    beforeEach(() => {
        vi.clearAllMocks();
        global.fetch = vi.fn();
    });

    afterEach(() => {
        global.fetch = originalFetch;
    });

    it('should fail if no cookie is provided', async () => {
        const result = await checkSessionHealth('linkedin', undefined);
        expect(result.ok).toBe(false);
        expect(result.error).toContain('No authentication tokens');
    });

    it('should pass for non-authenticated platforms', async () => {
        const result = await checkSessionHealth('reddit', undefined);
        expect(result.ok).toBe(true);
    });

    it('should pass for youtube since it uses anonymous visitor cookies', async () => {
        const result = await checkSessionHealth('youtube', 'dummy-cookie');
        expect(result.ok).toBe(true);
    });

    it('should pass for healthy linkedin sessions', async () => {
        const mockResponse = {
            status: 200,
            headers: new Map(),
            text: vi.fn().mockResolvedValue('<html><body>Welcome User</body></html>')
        };
        (global.fetch as any).mockResolvedValue(mockResponse);

        const result = await checkSessionHealth('linkedin', 'li_at=valid-cookie');
        expect(result.ok).toBe(true);
    });

    it('should fail if redirected to a login wall', async () => {
        const headers = new Map();
        headers.set('location', 'https://www.linkedin.com/login?from=feed');
        const mockResponse = {
            status: 302,
            headers,
            text: vi.fn().mockResolvedValue('')
        };
        (global.fetch as any).mockResolvedValue(mockResponse);

        const result = await checkSessionHealth('linkedin', 'li_at=expired-cookie');
        expect(result.ok).toBe(false);
        expect(result.error).toContain('Redirected to login wall');
    });

    it('should fail if redirected to a security checkpoint', async () => {
        const headers = new Map();
        headers.set('location', 'https://www.linkedin.com/checkpoint/challenge/verify');
        const mockResponse = {
            status: 302,
            headers,
            text: vi.fn().mockResolvedValue('')
        };
        (global.fetch as any).mockResolvedValue(mockResponse);

        const result = await checkSessionHealth('linkedin', 'li_at=expired-cookie');
        expect(result.ok).toBe(false);
        expect(result.error).toContain('Redirected to login wall');
    });

    it('should fail if response has a 200 status but contains login form text', async () => {
        const mockResponse = {
            status: 200,
            headers: new Map(),
            text: vi.fn().mockResolvedValue('<html><form>Login:<input type="password" name="password"></form></html>')
        };
        (global.fetch as any).mockResolvedValue(mockResponse);

        const result = await checkSessionHealth('linkedin', 'li_at=expired-cookie');
        expect(result.ok).toBe(false);
        // Body-heuristic match is non-conclusive (browser-gated platforms wall bare fetches).
        expect(result.error).toContain('heuristic');
        expect(result.definitive).toBe(false);
    });

    it('should handle network/connection errors gracefully', async () => {
        (global.fetch as any).mockRejectedValue(new Error('Connection timed out'));

        const result = await checkSessionHealth('linkedin', 'li_at=some-cookie');
        expect(result.ok).toBe(false);
        expect(result.error).toContain('Connection failed during pre-flight check: Connection timed out');
    });
});
