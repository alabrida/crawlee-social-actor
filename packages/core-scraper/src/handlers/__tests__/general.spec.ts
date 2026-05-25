import { describe, it, expect, vi } from 'vitest';
import { detectBlock, handle, validate } from '../general.js';

vi.mock('../../utils/resources.js', () => ({
    blockResources: vi.fn()
}));

describe('General Platform Handler v2', () => {

    describe('detectBlock', () => {
        it('should return true for known block text', () => {
            expect(detectBlock('checking your browser before accessing')).toBe(true);
            expect(detectBlock('cloudflare challenge')).toBe(true);
            expect(detectBlock('access denied on this server')).toBe(true);
        });

        it('should return false for normal content', () => {
            expect(detectBlock('welcome to our normal website')).toBe(false);
        });
    });

    describe('validate', () => {
        it('should return true for valid scraped data', () => {
            const validData = {
                seo: { title: 'Test Title', meta_description: 'Desc' }
            };
            expect(validate(validData)).toBe(true);
        });

        it('should return false for invalid scraped data', () => {
            const invalidData = {
                title: 'Test Title'
            };
            expect(validate(invalidData)).toBe(false);
        });
    });

    describe('handle', () => {
        it('should return scraped items containing forensics and metadata', async () => {
            const mockPage = {
                goto: vi.fn().mockResolvedValue({ status: () => 200 }),
                content: vi.fn().mockResolvedValue('<html>UA-123456</html>'),
                title: vi.fn().mockResolvedValue('Test Title'),
                evaluate: vi.fn().mockImplementation(async (fn) => {
                    const fnStr = fn.toString();
                    if (fnStr.includes('h1, h2')) {
                        return ['Hero Heading 1', 'Hero Heading 2'];
                    }
                    if (fnStr.includes('application/ld+json')) {
                        return {
                            context: 'https://schema.org',
                            type: 'LocalBusiness',
                            name: 'Test Business'
                        };
                    }
                    return null;
                }),
                locator: vi.fn((selector) => {
                    if (selector === 'meta[name="description"]') {
                        return { getAttribute: vi.fn().mockResolvedValue('Test desc') };
                    }
                    if (selector === 'link[rel="canonical"]') {
                        return { getAttribute: vi.fn().mockResolvedValue('https://example.com') };
                    }
                    if (selector === 'a[href]') {
                        return { evaluateAll: vi.fn().mockResolvedValue(['https://instagram.com/test']) };
                    }
                    if (selector === 'meta[name="viewport"]') {
                        return { count: vi.fn().mockResolvedValue(1) };
                    }
                    return { getAttribute: vi.fn().mockResolvedValue(null), count: vi.fn().mockResolvedValue(0) };
                })
            };

            const mockContext = {
                page: mockPage as any,
                request: { url: 'https://example.com', userData: { isSubPage: true } },
                log: { info: vi.fn(), warning: vi.fn(), error: vi.fn(), debug: vi.fn() },
                enqueueLinks: vi.fn()
            };

            const mockHandlerContext = { input: {} as any };

            const result = await handle(mockContext as any, mockHandlerContext);

            expect(result).toHaveLength(1);
            const item = result[0];

            expect(item.platform).toBe('general');
            expect(item.url).toBe('https://example.com');
            expect(item.data.seo).toBeDefined();
            expect(item.data.analytics).toBeDefined();
            expect(item.data.social_links).toEqual({ instagram: 'https://instagram.com/test' });
        });
    });
});
