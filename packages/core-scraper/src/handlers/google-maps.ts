/**
 * @module handlers/google-maps
 * @description Google Business Profile (Google Maps) handler. Places API primary with browser fallback.
 */

import type { PlaywrightCrawlingContext } from 'crawlee';
import type { PlaywrightHandler, HandlerContext, ScrapedItem } from '../types.js';
import { searchPlace } from '../api/google-places.js';
import { blockResources } from '../utils/resources.js';
import { parseCount } from '../utils/parse-count.js';

export async function handle(
    context: PlaywrightCrawlingContext,
    _handlerContext: HandlerContext
): Promise<ScrapedItem[]> {
    const { page, request, log } = context;
    const url = request.url;

    log.info(`[Google Maps] Initiating extraction for: ${url}`);

    // Extract search query from URL (e.g. /place/Business+Name/...)
    let query: string | null = null;
    const placeMatch = url.match(/\/maps\/place\/([^/]+)/);
    const searchMatch = url.match(/\/maps\/search\/([^/]+)/);
    const rawQuery = placeMatch ? placeMatch[1] : (searchMatch ? searchMatch[1] : null);

    if (rawQuery) {
        query = decodeURIComponent(rawQuery.replace(/\+/g, ' '));
        // Strip coordinates if present in the matched query part
        const coordIndex = query.indexOf('/@');
        if (coordIndex !== -1) {
            query = query.substring(0, coordIndex);
        }
    }

    let apiData = null;
    if (query && process.env.GOOGLE_CLOUD_API_KEY) {
        log.info(`[Google Maps] Querying Places API for: ${query}`);
        apiData = await searchPlace(query);
    }

    let businessName: string | null = null;
    let category: string | null = null;
    let rating: number | null = null;
    let reviewsCount: number | null = null;
    let address: string | null = null;
    let phone: string | null = null;
    let website: string | null = null;
    let photoCount = 0;
    let claimedStatus = true; // API listings are generally claimed or verified
    let isBlocked = false;

    if (apiData) {
        businessName = apiData.displayName;
        rating = apiData.rating;
        reviewsCount = apiData.userRatingCount;
        address = apiData.formattedAddress;
        phone = apiData.nationalPhoneNumber;
        website = apiData.websiteUri;
        photoCount = apiData.photoCount;
        category = apiData.types && apiData.types.length > 0 ? apiData.types[0] : null;
        log.info('[Google Maps] Places API extraction successful.');
    } else {
        // Browser fallback
        log.info('[Google Maps] Running Playwright browser fallback...');
        await blockResources(page, ['media', 'font', 'stylesheet'], ['image']);
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForTimeout(3000);

        const content = await page.content();
        isBlocked = detectBlock(content);

        if (!isBlocked) {
            try {
                // Title
                const titleEl = page.locator('h1').first();
                if (await titleEl.count() > 0) businessName = await titleEl.innerText();

                // Category
                const catEl = page.locator('button[jsaction*="category"]').first();
                if (await catEl.isVisible()) category = await catEl.innerText();

                // Rating & Reviews
                const ratingEl = page.locator('div.F7nice span[aria-hidden="true"]').first();
                if (await ratingEl.isVisible()) {
                    const txt = await ratingEl.innerText();
                    if (txt) rating = parseFloat(txt.trim());
                }

                const revsEl = page.locator('div.F7nice button[aria-label*="reviews"]').first();
                if (await revsEl.isVisible()) {
                    const txt = await revsEl.innerText();
                    reviewsCount = parseCount(txt);
                }

                // Phone, Address, Website
                const addrEl = page.locator('button[data-item-id^="address"]').first();
                if (await addrEl.isVisible()) address = await addrEl.innerText();

                const phoneEl = page.locator('button[data-item-id^="phone:tel:"]').first();
                if (await phoneEl.isVisible()) phone = await phoneEl.innerText();

                const webEl = page.locator('a[data-item-id="authority"]').first();
                if (await webEl.isVisible()) website = await webEl.getAttribute('href');

                // Claimed
                claimedStatus = !(await page.locator('button:has-text("Claim this business")').isVisible());
            } catch (e) {
                log.warning('[Google Maps] Browser extraction encountered errors.');
            }
        }
    }

    const scrapedItem: ScrapedItem = {
        platform: 'google_business_profile',
        url,
        crawlerUsed: apiData ? 'cheerio' : 'playwright',
        scrapedAt: new Date().toISOString(),
        data: {
            gbp_business_name: businessName,
            gbp_category: category,
            gbp_rating: rating,
            gbp_reviews_count: reviewsCount,
            gbp_address: address,
            gbp_phone: phone,
            gbp_website: website,
            claimed_status: claimedStatus,
            photo_count: photoCount,
            screenshotUrl: ''
        } as any,
        errors: isBlocked ? ['BLOCKED: Google Maps Consent / CAPTCHA'] : []
    };

    return [scrapedItem];
}

export function validate(data: Record<string, unknown>): boolean {
    return !!data && typeof data.gbp_business_name === 'string';
}

export function detectBlock(responseBody: string): boolean {
    const lower = responseBody.toLowerCase();
    return lower.includes('google.com/recaptcha') || lower.includes('unusual traffic');
}

const googleMapsHandler: PlaywrightHandler = {
    crawlerType: 'playwright',
    handle,
    validate,
    detectBlock
};

export default googleMapsHandler;
