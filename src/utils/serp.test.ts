import { describe, it, expect, vi } from 'vitest';
import { sanitizeQuery } from './validation.js';
import { fetchSerpApi } from './serp.js';

vi.mock('./logger.js', () => ({
    log: {
        info: vi.fn(),
        error: vi.fn(),
    },
}));

// Mock global fetch
global.fetch = vi.fn();

describe('fetchSerpApi', () => {
    it('should use sanitized query in the request', async () => {
        const query = '  search query\x00  ';
        const apiKey = 'test_key';

        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({ organic_results: [] }),
        });

        await fetchSerpApi(query, apiKey);

        const expectedQuery = 'search query';
        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining(`q=${encodeURIComponent(expectedQuery)}`)
        );
        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining(`api_key=${apiKey}`)
        );
    });
});
