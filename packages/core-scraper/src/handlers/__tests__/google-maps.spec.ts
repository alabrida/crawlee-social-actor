import { describe, it, expect, vi } from 'vitest';
import googleMapsHandler from '../google-maps.js';

vi.mock('../../utils/resources.js', () => ({
    blockResources: vi.fn()
}));

describe('Google Maps / GBP Handler Routing', () => {
    it('should extract business details from simulated DOM', async () => {
        const mockPage = {
            goto: vi.fn().mockResolvedValue(null),
            waitForTimeout: vi.fn(),
            locator: vi.fn((selector) => {
                if (selector === 'h1') {
                    return { first: () => ({ count: () => Promise.resolve(1), innerText: () => Promise.resolve('Coffee Shop') }) };
                }
                if (selector === 'button[jsaction*="category"]') {
                    return { first: () => ({ isVisible: () => Promise.resolve(true), innerText: () => Promise.resolve('Coffee shop') }) };
                }
                return {
                    first: vi.fn().mockReturnValue({
                        isVisible: vi.fn().mockResolvedValue(false),
                        count: vi.fn().mockResolvedValue(0)
                    })
                };
            }),
            content: vi.fn().mockResolvedValue('<html><body>Coffee Shop</body></html>')
        };

        const mockContext = {
            page: mockPage as any,
            request: {
                url: 'https://maps.google.com/?cid=123',
                userData: { platform: 'google_business_profile' }
            },
            log: { info: vi.fn(), warning: vi.fn(), error: vi.fn(), debug: vi.fn() }
        };

        const mockHandlerContext = { input: {} as any };

        const result = await googleMapsHandler.handle(mockContext as any, mockHandlerContext);

        expect(result).toBeDefined();
        expect(result.length).toBe(1);
        expect(result[0].platform).toBe('google_business_profile');
        expect(result[0].url).toBe('https://maps.google.com/?cid=123');
        expect(result[0].data.gbp_business_name).toBe('Coffee Shop');
        expect(result[0].data.gbp_category).toBe('Coffee shop');
    });
});
