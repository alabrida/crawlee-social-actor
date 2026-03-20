import { describe, it, expect, vi, beforeEach } from 'vitest';
import { injectCookies } from '../auth.js';
import { log } from '../logger.js';

// Mock log
vi.mock('../logger.js', () => ({
    log: {
        info: vi.fn(),
        debug: vi.fn(),
        error: vi.fn(),
        warning: vi.fn(),
    },
}));

describe('auth.ts', () => {
    let mockPage: any;
    let mockContext: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockContext = {
            addCookies: vi.fn().mockResolvedValue(undefined),
        };
        mockPage = {
            context: vi.fn().mockReturnValue(mockContext),
        };
    });

    it('should inject cookies correctly', async () => {
        const tokenString = 'name1=value1; name2=value2;';
        const url = 'https://www.linkedin.com/feed/';
        const platform = 'linkedin' as any;

        await injectCookies(mockPage, platform, tokenString, url);

        expect(mockContext.addCookies).toHaveBeenCalledWith([
            { name: 'name1', value: 'value1', domain: '.linkedin.com', path: '/' },
            { name: 'name2', value: 'value2', domain: '.linkedin.com', path: '/' },
        ]);

        expect(log.info).toHaveBeenCalledWith(
            expect.stringContaining('Injecting 2 auth cookies for linkedin')
        );
    });

    it('should handle empty token string', async () => {
        await injectCookies(mockPage, 'linkedin' as any, '', 'https://linkedin.com');
        expect(mockContext.addCookies).not.toHaveBeenCalled();
    });

    it('should handle malformed cookies', async () => {
        const tokenString = 'invalid-cookie; name=value';
        await injectCookies(mockPage, 'linkedin' as any, tokenString, 'https://linkedin.com');

        expect(mockContext.addCookies).toHaveBeenCalledWith([
            { name: 'name', value: 'value', domain: '.linkedin.com', path: '/' },
        ]);
    });

    it('should log error on failure', async () => {
        mockContext.addCookies.mockRejectedValue(new Error('Failed to add cookies'));

        await injectCookies(mockPage, 'linkedin' as any, 'n=v', 'https://linkedin.com');

        expect(log.error).toHaveBeenCalledWith(
            expect.stringContaining('[Auth] Failed to inject cookies for linkedin: Failed to add cookies')
        );
    });
});
