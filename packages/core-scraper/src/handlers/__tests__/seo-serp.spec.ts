import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { handle, extractFromSerpApi, extractFromDom } from '../seo-serp.js';
import * as serpApiUtils from '../../utils/serp.js';

vi.mock('../../utils/serp.js', () => ({
    fetchSerpApi: vi.fn(),
}));

vi.mock('../../utils/resources.js', () => ({
    blockResources: vi.fn(),
}));

describe('SEO SERP Handler', () => {
    let mockLog: any;
    let mockPage: any;
    let mockContext: any;
    let mockHandlerContext: any;

    beforeEach(() => {
        vi.clearAllMocks();

        mockLog = {
            info: vi.fn(),
            warning: vi.fn(),
            error: vi.fn(),
            debug: vi.fn(),
        };

        mockPage = {
            goto: vi.fn().mockResolvedValue(null),
            waitForSelector: vi.fn().mockResolvedValue(null),
            content: vi.fn().mockResolvedValue('<html><body>Test Page</body></html>'),
            locator: vi.fn().mockReturnValue({
                count: vi.fn().mockResolvedValue(0),
                nth: vi.fn().mockReturnValue({
                    getAttribute: vi.fn(),
                }),
            }),
        };

        mockContext = {
            page: mockPage,
            request: {
                url: 'https://google.com/search?q=test',
            },
            log: mockLog,
        };

        mockHandlerContext = {
            input: {},
        };
    });

    describe('extractFromSerpApi', () => {
        it('should extract links and markers from organic results', async () => {
            const mockSerpData = {
                organic_results: [
                    { link: 'https://example.com/1', position: 1 },
                    { link: 'https://example.com/2', position: 2 },
                ],
                local_results: [],
            };
            vi.mocked(serpApiUtils.fetchSerpApi).mockResolvedValue(mockSerpData as any);

            const result = await extractFromSerpApi('test', 'fake-key', mockLog);

            expect(result.links).toEqual(['https://example.com/1', 'https://example.com/2']);
            expect(result.conversionMarkers).toEqual([
                'Position 1: example.com',
                'Position 2: example.com',
            ]);
            expect(result.ctas).toEqual([]);
            expect(result.profileHtml).toContain('organic_results');
        });

        it('should detect local pack presence', async () => {
            const mockSerpData = {
                organic_results: [],
                local_results: [{ title: 'Local Business' }],
            };
            vi.mocked(serpApiUtils.fetchSerpApi).mockResolvedValue(mockSerpData as any);

            const result = await extractFromSerpApi('test', 'fake-key', mockLog);

            expect(result.ctas).toContain('Local Pack Present');
        });
    });

    describe('extractFromDom', () => {
        it('should extract links from DOM locators', async () => {
            const mockLocator = {
                count: vi.fn().mockResolvedValue(2),
                nth: vi.fn().mockImplementation((i) => ({
                    getAttribute: vi.fn().mockResolvedValue(
                        i === 0 ? 'https://dom1.com' : 'https://dom2.com'
                    ),
                })),
            };

            const mockLocalPackLocator = {
                count: vi.fn().mockResolvedValue(0),
            };

            const pageWithResults = {
                locator: vi.fn().mockImplementation((selector) => {
                    if (selector === '[data-entityname], .lsbb') return mockLocalPackLocator;
                    if (selector === 'a[href^="http"]:not([href*="google.com"])') return mockLocator;
                    return { locator: vi.fn().mockReturnValue(mockLocator) };
                }),
            };

            const result = await extractFromDom(pageWithResults, mockLog);

            expect(result.links).toEqual(['https://dom1.com', 'https://dom2.com']);
            expect(result.conversionMarkers).toEqual([
                'Position 1: dom1.com',
                'Position 2: dom2.com',
            ]);
        });

        it('should detect local pack from DOM', async () => {
            const mockLocator = { count: vi.fn().mockResolvedValue(0) };
            const mockLocalPackLocator = { count: vi.fn().mockResolvedValue(1) };

            const pageWithResults = {
                locator: vi.fn().mockImplementation((selector) => {
                    if (selector === '[data-entityname], .lsbb') return mockLocalPackLocator;
                    if (selector === 'a[href^="http"]:not([href*="google.com"])') return mockLocator;
                    return { locator: vi.fn().mockReturnValue(mockLocator) };
                }),
            };

            const result = await extractFromDom(pageWithResults, mockLog);
            expect(result.ctas).toContain('Local Pack Present');
        });
    });

    describe('handle function', () => {
        const originalEnv = process.env;

        beforeEach(() => {
            process.env = { ...originalEnv };
        });

        afterEach(() => {
            process.env = originalEnv;
        });

        it('should return a scraped item', async () => {
            delete process.env.SERP_API_KEY;

            const result = await handle(mockContext, mockHandlerContext);

            expect(result).toHaveLength(1);
            expect(result[0].platform).toBe('seo_serp');
            expect(result[0].url).toBe('https://google.com/search?q=test');
            expect(result[0].data).toHaveProperty('revenueIndicators');
        });

        it('should use SerpApi if SERP_API_KEY is present', async () => {
            process.env.SERP_API_KEY = 'test-key';
            const mockSerpData = {
                organic_results: [{ link: 'https://api-example.com', position: 1 }],
                local_results: [],
            };
            vi.mocked(serpApiUtils.fetchSerpApi).mockResolvedValue(mockSerpData as any);

            const result = await handle(mockContext, mockHandlerContext);

            expect(serpApiUtils.fetchSerpApi).toHaveBeenCalledWith('test', 'test-key');

            const revenueIndicators: any = result[0].data.revenueIndicators;
            expect(revenueIndicators?.links).toContain('https://api-example.com');
        });

        it('should fallback to DOM extraction if SerpApi returns no links', async () => {
            process.env.SERP_API_KEY = 'test-key';
            // Mock API returning empty results
            vi.mocked(serpApiUtils.fetchSerpApi).mockResolvedValue({ organic_results: [] } as any);

            // Mock DOM returning results
            const mockLocator = {
                count: vi.fn().mockResolvedValue(1),
                nth: vi.fn().mockReturnValue({
                    getAttribute: vi.fn().mockResolvedValue('https://dom-fallback.com'),
                }),
            };
            mockPage.locator.mockImplementation((selector: string) => {
                if (selector === '[data-entityname], .lsbb') return { count: vi.fn().mockResolvedValue(0) };
                if (selector === 'a[href^="http"]:not([href*="google.com"])') return mockLocator;
                return { locator: vi.fn().mockReturnValue(mockLocator) };
            });

            const result = await handle(mockContext, mockHandlerContext);

            const revenueIndicators: any = result[0].data.revenueIndicators;
            expect(revenueIndicators?.links).toContain('https://dom-fallback.com');
        });
    });
});
