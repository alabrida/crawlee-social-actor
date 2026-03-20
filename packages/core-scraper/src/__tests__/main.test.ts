import { describe, it, expect } from 'vitest';
import { prepareUrls } from '../../src/main.js';
import type { ActorInput } from '../../src/types.js';

describe('main.js refactored functions', () => {
    describe('prepareUrls', () => {
        it('should extract finalUrls, cheerioUrls, and playwrightUrls based on platform type', () => {
            const mockInput: ActorInput = {
                urls: [
                    { platform: 'twitter', url: 'https://twitter.com/test' },
                    { platform: 'instagram', url: 'https://instagram.com/test' },
                    { platform: 'linkedin', url: 'https://linkedin.com/test' },
                    { platform: 'facebook', url: 'https://facebook.com/test' },
                ],
                platforms: ['twitter', 'instagram', 'linkedin', 'facebook'],
                maxConcurrency: 10,
                maxRequestRetries: 3,
                proxy: { useApifyProxy: true, apifyProxyGroups: [] },
                linkedinDailyLimit: 250,
                googleMapsGrid: { enabled: false, cellSizeKm: 10 }
            };

            const result = prepareUrls(mockInput);

            // Expected lengths based on PLATFORM_CRAWLER_MAP
            // playwright: twitter, instagram, linkedin, facebook
            expect(result.cheerioUrls.length).toBe(0);
            expect(result.playwrightUrls.length).toBe(4);
            expect(result.finalUrls.length).toBe(4);
        });

        it('should append general_hub to finalUrls if businessUrl is provided and not already present', () => {
            const mockInput: ActorInput = {
                urls: [
                    { platform: 'twitter', url: 'https://twitter.com/test' }
                ],
                platforms: ['twitter'],
                maxConcurrency: 10,
                maxRequestRetries: 3,
                businessUrl: 'https://example.com',
                proxy: { useApifyProxy: true, apifyProxyGroups: [] },
                linkedinDailyLimit: 250,
                googleMapsGrid: { enabled: false, cellSizeKm: 10 }
            };

            const result = prepareUrls(mockInput);

            expect(result.finalUrls.length).toBe(2);
            expect(result.finalUrls).toEqual(expect.arrayContaining([
                { platform: 'general_hub', url: 'https://example.com' }
            ]));

            // general_hub is a playwright platform
            expect(result.playwrightUrls.length).toBe(2);
            expect(result.cheerioUrls.length).toBe(0);
        });

        it('should map cheerio platforms correctly', () => {
            const mockInput: ActorInput = {
                urls: [
                    { platform: 'reddit', url: 'https://reddit.com/r/test' },
                    { platform: 'youtube', url: 'https://youtube.com/test' }
                ],
                platforms: ['reddit', 'youtube'],
                maxConcurrency: 10,
                maxRequestRetries: 3,
                proxy: { useApifyProxy: true, apifyProxyGroups: [] },
                googleMapsGrid: { enabled: false, cellSizeKm: 10 },
                linkedinDailyLimit: 10
            };

            const result = prepareUrls(mockInput);

            // reddit and youtube use cheerio crawler based on PLATFORM_CRAWLER_MAP
            expect(result.cheerioUrls.length).toBe(2);
            expect(result.playwrightUrls.length).toBe(0);
            expect(result.finalUrls.length).toBe(2);
        });
    });
});
