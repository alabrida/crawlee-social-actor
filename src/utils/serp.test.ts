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

describe('sanitizeQuery', () => {
    it('should trim whitespace', () => {
        expect(sanitizeQuery('  hello world  ')).toBe('hello world');
    });

    it('should remove control characters', () => {
        const input = 'hello\x00world\x1F';
        expect(sanitizeQuery(input)).toBe('helloworld');
    });

    it('should limit length', () => {
        const input = 'a'.repeat(600);
        expect(sanitizeQuery(input, 500)).toHaveLength(500);
    });

    it('should handle empty input', () => {
        expect(sanitizeQuery('')).toBe('');
        // @ts-ignore
        expect(sanitizeQuery(null)).toBe('');
    });
});

describe('fetchSerpApi', () => {
    it('should use sanitized query in the request', async () => {
        const query = '  search query\x00  ';
        const apiKey = 'test_key';

        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({ organic_results: [] }),
        });

        await fetchSerpApi(query, apiKey);

        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining(`q=search+query`)
        );
        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining(`api_key=${apiKey}`)
        );
    });
});
