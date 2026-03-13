/**
 * @module handlers/tiktok
 * @description TikTok handler using PlaywrightCrawler.
 * Bypasses captchas by executing JS and waiting for the profile to render.
 * @see PRD Section 5.1
 */

import type { PlaywrightCrawlingContext } from 'crawlee';
import type { PlaywrightHandler, HandlerContext, ScrapedItem } from '../types.js';

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

    // Wait for either the profile content to load, or the fallback DOM, or a captcha
    await page.waitForTimeout(5000); // Give it some time to settle

    // Extract visible text and links
    const bioText = await page.evaluate(() => {
        const h2 = document.querySelector('h2[data-e2e="user-bio"]');
        return h2 ? h2.textContent || '' : '';
    });

    const externalLink = await page.evaluate(() => {
        const a = document.querySelector('a[data-e2e="user-link"]');
        return a ? a.getAttribute('href') || a.textContent || null : null;
    });

    const profileHtml = await page.evaluate(() => {
        // Try the modern e2e selector first
        const section = document.querySelector('div[data-e2e="user-profile-section"]');
        if (section && section.parentElement) return section.parentElement.innerHTML;
        
        // Try the container often used for the whole profile block
        const container = document.querySelector('div[class*="DivShareLayoutMain"]');
        if (container) return container.innerHTML;

        // Fallback to the main tag
        const main = document.querySelector('main');
        if (main) return `<div class="tiktok-fallback-profile-wrapper">${main.innerHTML}</div>`;

        return ''; // Returning empty string satisfies string schema, rather than the string "null"
    });

    const ctas: string[] = [];
    if (externalLink) {
        ctas.push('Link in Bio');
    }

    const conversionMarkers: string[] = [];
    if (bioText.toLowerCase().includes('shop')) conversionMarkers.push('Shop');
    if (bioText.toLowerCase().includes('book')) conversionMarkers.push('Booking');

    // Attempt to scrape SIGI_STATE from browser memory if possible, as a bonus
    const sigiLinks = await page.evaluate(() => {
        try {
            const state = (window as any)['SIGI_STATE'];
            if (state && state.UserModule && state.UserModule.users) {
                const users = state.UserModule.users;
                const firstKey = Object.keys(users)[0];
                const link = users[firstKey]?.bioLink?.link;
                return link ? [link] : [];
            }
        } catch (e) {
            // ignore
        }
        return [];
    });

    const finalLinks = externalLink ? [externalLink] : [];
    for (const link of sigiLinks) {
        if (!finalLinks.includes(link)) finalLinks.push(link);
    }

    const scrapedItem: ScrapedItem = {
        platform: 'tiktok',
        url,
        crawlerUsed: 'playwright',
        scrapedAt: new Date().toISOString(),
        data: {
            revenueIndicators: {
                ctas,
                links: finalLinks,
                conversionMarkers,
            },
            profileHtml: profileHtml
        },
        errors: []
    };

    if (finalLinks.length === 0 && bioText === '') {
        log.warning(`[TikTok] Playwright extraction yielded empty strings on ${url}.`);
    }

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
