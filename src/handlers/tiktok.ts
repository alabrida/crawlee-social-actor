/**
 * @module handlers/tiktok
 * @description TikTok handler using PlaywrightCrawler.
 * Bypasses captchas by executing JS and waiting for the profile to render.
 * @see PRD Section 5.1
 */

import type { PlaywrightCrawlingContext } from 'crawlee';
import type { PlaywrightHandler, HandlerContext, ScrapedItem } from '../types.js';
import { blockResources } from '../utils/resources.js';

/**
 * Handle a TikTok URL by rendering the page in a browser and extracting the DOM.
 */
async function handle(
    context: PlaywrightCrawlingContext,
    _handlerContext: HandlerContext,
): Promise<ScrapedItem[]> {
    const { request, page, log } = context;
    const url = request.url;

    log.info(`[TikTok] Extracting data from: ${url}`);
    await blockResources(page);

    // Wait for the profile content to load
    await page.waitForTimeout(5000); 

    const extractedData = await page.evaluate(() => {
        const bioEl = document.querySelector('[data-e2e="user-bio"]');
        const linkEl = document.querySelector('a[data-e2e="user-link"]');
        const followersEl = document.querySelector('[data-e2e="followers-count"]');
        const followingEl = document.querySelector('[data-e2e="following-count"]');
        const likesEl = document.querySelector('[data-e2e="likes-count"]');

        return {
            bio: bioEl?.textContent?.trim() || '',
            externalLink: linkEl?.getAttribute('href') || linkEl?.textContent?.trim() || '',
            followers: followersEl?.textContent?.trim() || '',
            following: followingEl?.textContent?.trim() || '',
            likes: likesEl?.textContent?.trim() || '',
            isVerified: !!document.querySelector('[data-e2e="verify-icon"]'),
            profileHtml: document.querySelector('div[data-e2e="user-profile-section"]')?.innerHTML || 
                         document.querySelector('main')?.innerHTML || ''
        };
    });

    const ctas: string[] = [];
    if (extractedData.externalLink) {
        ctas.push('Link in Bio');
    }

    const conversionMarkers: string[] = [];
    if (extractedData.bio.toLowerCase().includes('shop')) conversionMarkers.push('Shop');
    if (extractedData.bio.toLowerCase().includes('book')) conversionMarkers.push('Booking');
    
    // Add Raw signals for Math Agent
    if (extractedData.followers) conversionMarkers.push(`Followers Raw: ${extractedData.followers}`);
    if (extractedData.following) conversionMarkers.push(`Following Raw: ${extractedData.following}`);
    if (extractedData.likes) conversionMarkers.push(`Likes Raw: ${extractedData.likes}`);
    if (extractedData.isVerified) conversionMarkers.push('Status: Verified');

    const scrapedItem: ScrapedItem = {
        platform: 'tiktok',
        url,
        crawlerUsed: 'playwright',
        scrapedAt: new Date().toISOString(),
        data: {
            revenueIndicators: {
                ctas,
                links: extractedData.externalLink ? [extractedData.externalLink] : [],
                conversionMarkers,
            },
            profileHtml: extractedData.profileHtml,
            screenshotUrl: '',
        },
        errors: []
    };

    return [scrapedItem];
}

/**
 * Validate that the extracted TikTok data contains expected keys.
 */
function validate(data: Record<string, unknown>): boolean {
    const payload = data as any;
    if (!payload || typeof payload !== 'object') return false;
    if (!payload.revenueIndicators || !Array.isArray(payload.revenueIndicators.links)) return false;
    if (typeof payload.profileHtml !== 'string') return false;
    if (typeof payload.screenshotUrl !== 'string') return false;
    return true;
}

/**
 * Detect if the response indicates a TikTok block (captcha, empty data).
 */
function detectBlock(responseBody: string): boolean {
    const isCaptcha = responseBody.includes('captcha') || responseBody.includes('verify') || responseBody.includes('challenge');
    return isCaptcha;
}

/** Assembled handler export satisfying the PlaywrightHandler interface. */
const tiktokHandler: PlaywrightHandler = {
    crawlerType: 'playwright',
    handle,
    validate,
    detectBlock,
};
export default tiktokHandler;
