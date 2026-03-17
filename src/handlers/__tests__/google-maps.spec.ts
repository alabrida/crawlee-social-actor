import { describe, it, expect, vi } from 'vitest';
import googleMapsHandler from '../google-maps.js';

vi.mock('../../utils/resources.js', () => ({
    blockResources: vi.fn()
}));

describe('Google Maps / GBP Handler Routing', () => {
    it('should use google_business_profile platform when specified in request userData', async () => {
        // Mock the Playwright context
        const mockPage = {
            waitForTimeout: vi.fn(),
            locator: vi.fn().mockReturnValue({
                first: vi.fn().mockReturnValue({
                    isVisible: vi.fn().mockResolvedValue(false),
                    count: vi.fn().mockResolvedValue(0),
                    innerHTML: vi.fn().mockResolvedValue('<div>Profile HTML</div>')
                })
            })
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
        expect(result[0].data.profileHtml).toBeDefined();
    });

    it('should default to google_maps platform when not specified', async () => {
        const mockPage = {
            waitForTimeout: vi.fn(),
            locator: vi.fn().mockReturnValue({
                first: vi.fn().mockReturnValue({
                    isVisible: vi.fn().mockResolvedValue(false),
                    count: vi.fn().mockResolvedValue(0),
                    innerHTML: vi.fn().mockResolvedValue('<div>Profile HTML</div>')
                })
            })
        };

        const mockContext = {
            page: mockPage as any,
            request: {
                url: 'https://maps.google.com/?cid=456',
                userData: {} // Missing explicit platform override
            },
            log: { info: vi.fn(), warning: vi.fn(), error: vi.fn(), debug: vi.fn() }
        };

        const mockHandlerContext = { input: {} as any };

        const result = await googleMapsHandler.handle(mockContext as any, mockHandlerContext);

        expect(result).toBeDefined();
        expect(result[0].platform).toBe('google_maps');
    });
});
