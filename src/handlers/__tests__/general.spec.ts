import { describe, it, expect, vi } from 'vitest';
import type { Page } from 'playwright';
import { extractInitialForensics, extractPageData, detectBlock, handle, validate } from '../general.js';

vi.mock('../../utils/resources.js', () => ({
    blockResources: vi.fn()
}));

describe('General Platform Handler', () => {

    describe('detectBlock', () => {
        it('should return true for known block text', () => {
            expect(detectBlock('checking your browser before accessing')).toBe(true);
            expect(detectBlock('datadome block')).toBe(true);
            expect(detectBlock('access denied on this server')).toBe(true);
        });

        it('should return false for normal content', () => {
            expect(detectBlock('welcome to our normal website')).toBe(false);
        });
    });

    describe('validate', () => {
        it('should return true for valid scraped data', () => {
            const validData = {
                revenueIndicators: { ctas: [], links: [], conversionMarkers: [] },
                profileHtml: '<html></html>',
                screenshotUrl: 'https://example.com/screenshot.jpg'
            };
            expect(validate(validData)).toBe(true);
        });

        it('should return false for invalid scraped data', () => {
            const invalidData = {
                profileHtml: '<html></html>'
                // missing revenueIndicators, screenshotUrl
            };
            expect(validate(invalidData)).toBe(false);
        });
    });

    describe('extractInitialForensics', () => {
        it('should detect SSL from URL', () => {
            const f1 = extractInitialForensics('https://example.com', '');
            expect(f1.hasSsl).toBe(true);

            const f2 = extractInitialForensics('http://example.com', '');
            expect(f2.hasSsl).toBe(false);
        });

        it('should detect Google Analytics', () => {
            const f1 = extractInitialForensics('https://example.com', 'some content with UA-123456');
            expect(f1.hasGoogleAnalytics).toBe(true);

            const f2 = extractInitialForensics('https://example.com', 'G-ABCDEF');
            expect(f2.hasGoogleAnalytics).toBe(true);

            const f3 = extractInitialForensics('https://example.com', 'script src="googletagmanager.com"');
            expect(f3.hasGoogleAnalytics).toBe(true);
        });

        it('should detect JSON-LD', () => {
            const f1 = extractInitialForensics('https://example.com', '<script type="application/ld+json">{}</script>');
            expect(f1.hasJsonLd).toBe(true);
        });

        it('should default other markers to false', () => {
            const f1 = extractInitialForensics('https://example.com', '');
            expect(f1.hasMetaDescription).toBe(false);
            expect(f1.hasCanonical).toBe(false);
            expect(f1.hasNewsletter).toBe(false);
            expect(f1.hasPrivacyPolicy).toBe(false);
        });
    });

    describe('extractPageData', () => {
        it('should extract metadata, privacy links, and CTAs', async () => {
            const mockPage = {
                locator: vi.fn((selector) => {
                    if (selector === 'meta[name="description"]') {
                        return { getAttribute: vi.fn().mockResolvedValue('A site description') };
                    }
                    if (selector === 'link[rel="canonical"]') {
                        return { getAttribute: vi.fn().mockResolvedValue('https://example.com/canonical') };
                    }
                    if (selector === 'a[href*="privacy"]') {
                        return { count: vi.fn().mockResolvedValue(1) };
                    }
                    return { getAttribute: vi.fn().mockResolvedValue(null), count: vi.fn().mockResolvedValue(0) };
                }),
                innerText: vi.fn().mockResolvedValue('We offer a free trial, so book now or sign up for our newsletter!')
            } as unknown as Page;

            const mockLog = { debug: vi.fn() } as any;

            const forensics = extractInitialForensics('https://example.com', '');

            const result = await extractPageData(mockPage, forensics, mockLog);

            expect(forensics.hasMetaDescription).toBe(true);
            expect(forensics.hasCanonical).toBe(true);
            expect(forensics.hasPrivacyPolicy).toBe(true);
            expect(forensics.hasNewsletter).toBe(true);

            expect(result.ctas).toContain('Booking CTA');
            expect(result.ctas).toContain('Trial CTA');
            expect(result.ctas).toContain('Signup CTA');
            expect(result.ctas).toContain('Newsletter');

            expect(result.conversionMarkers).toContain('Signal: hasSsl');
            expect(result.conversionMarkers).toContain('Signal: hasMetaDescription');
            expect(result.conversionMarkers).toContain('Signal: hasCanonical');
            expect(result.conversionMarkers).toContain('Signal: hasNewsletter');
            expect(result.conversionMarkers).toContain('Signal: hasPrivacyPolicy');
        });

        it('should handle failures gracefully', async () => {
            const mockPage = {
                locator: vi.fn().mockImplementation(() => {
                    throw new Error('Locator failed');
                }),
                innerText: vi.fn().mockResolvedValue('')
            } as unknown as Page;

            const mockLog = { debug: vi.fn() } as any;

            const forensics = extractInitialForensics('https://example.com', '');
            const result = await extractPageData(mockPage, forensics, mockLog);

            expect(mockLog.debug).toHaveBeenCalled();
            expect(result.ctas).toEqual([]);
        });
    });

    describe('handle', () => {
        it('should return scraped items containing forensics and CTAs', async () => {
            const mockPage = {
                goto: vi.fn().mockResolvedValue({ status: () => 200 }),
                content: vi.fn().mockResolvedValue('<html>UA-123456</html>'),
                locator: vi.fn((selector) => {
                    if (selector === 'meta[name="description"]') {
                        return { getAttribute: vi.fn().mockResolvedValue('Test desc') };
                    }
                    return { getAttribute: vi.fn().mockResolvedValue(null), count: vi.fn().mockResolvedValue(0) };
                }),
                innerText: vi.fn().mockResolvedValue('Contact us for pricing')
            };

            const mockContext = {
                page: mockPage as any,
                request: { url: 'https://example.com' },
                log: { info: vi.fn(), warning: vi.fn(), error: vi.fn(), debug: vi.fn() }
            };

            const mockHandlerContext = { input: {} as any };

            const result = await handle(mockContext as any, mockHandlerContext);

            expect(result).toHaveLength(1);
            const item = result[0];

            expect(item.platform).toBe('general');
            expect(item.url).toBe('https://example.com');
            expect(item.data.profileHtml).toBe('<html>UA-123456</html>');
            expect(item.data.forensics.hasGoogleAnalytics).toBe(true);
            expect(item.data.forensics.hasMetaDescription).toBe(true);

            expect(item.data.revenueIndicators.ctas).toContain('Contact CTA');
            expect(item.data.revenueIndicators.ctas).toContain('Pricing Link');
        });

        it('should handle blocked pages', async () => {
            const mockPage = {
                goto: vi.fn().mockResolvedValue({ status: () => 403 }),
                content: vi.fn().mockResolvedValue('<html>cloudflare access denied</html>'),
            };

            const mockContext = {
                page: mockPage as any,
                request: { url: 'https://example.com' },
                log: { info: vi.fn(), warning: vi.fn(), error: vi.fn(), debug: vi.fn() }
            };

            const mockHandlerContext = { input: {} as any };

            const result = await handle(mockContext as any, mockHandlerContext);

            expect(result).toHaveLength(1);
            expect(mockContext.log.warning).toHaveBeenCalled();
            expect(result[0].data.revenueIndicators.conversionMarkers).toContain('BLOCKED: WAF Challenge Detected');
            expect(result[0].data.revenueIndicators.ctas).toHaveLength(0);
        });
    });
});
