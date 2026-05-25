/**
 * @module handlers/tiktok
 * @description TikTok profile handler. Deep-parses __UNIVERSAL_DATA_FOR_REHYDRATION__ script tag.
 */

import type { PlaywrightCrawlingContext } from 'crawlee';
import type { PlaywrightHandler, HandlerContext, ScrapedItem } from '../types.js';
import { blockResources } from '../utils/resources.js';
import { parseCount } from '../utils/parse-count.js';
import { analyzeBio } from '../utils/bio-analyzer.js';

export async function handle(
    context: PlaywrightCrawlingContext,
    _handlerContext: HandlerContext
): Promise<ScrapedItem[]> {
    const { page, request, log } = context;
    const url = request.url;

    log.info(`[TikTok] Commencing extraction for: ${url}`);

    await blockResources(page);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3000);

    const content = await page.content();
    const isBlocked = detectBlock(content);

    // Extract username from URL
    const usernameMatch = url.match(/tiktok\.com\/@([^/?#]+)/);
    const username = usernameMatch ? usernameMatch[1] : null;

    let displayName: string | null = null;
    let biography: string | null = null;
    let verified = false;
    let followerCount: number | null = null;
    let followingCount: number | null = null;
    let likesCount: number | null = null;
    let videosCount: number | null = null;
    let latestVideoDate: string | null = null;
    let externalUrl: string | null = null;
    let isBusiness = false;
    let hasShop = false;

    if (!isBlocked) {
        try {
            // Try to extract and parse the rehydration script
            const scriptLocator = page.locator('script[id="__UNIVERSAL_DATA_FOR_REHYDRATION__"]').first();
            let parsedJson: any = null;
            if (await scriptLocator.count() > 0) {
                const scriptText = await scriptLocator.textContent();
                if (scriptText) {
                    try {
                        const json = JSON.parse(scriptText);
                        // Search for user detail scope
                        const defaultScope = json.__DEFAULT_SCOPE__ || {};
                        const userDetail = defaultScope['webapp.user-detail'] || {};
                        parsedJson = userDetail.userInfo || null;
                    } catch (e) {
                        log.warning('[TikTok] Failed to parse __UNIVERSAL_DATA_FOR_REHYDRATION__ JSON.');
                    }
                }
            }

            if (parsedJson) {
                const user = parsedJson.user || {};
                const stats = parsedJson.stats || {};
                displayName = user.nickname || null;
                biography = user.signature || null;
                verified = !!user.verified;
                followerCount = stats.followerCount || null;
                followingCount = stats.followingCount || null;
                likesCount = stats.heartCount || null;
                videosCount = stats.videoCount || null;
                externalUrl = user.bioLink?.link || null;
                isBusiness = user.commerceUserInfo?.commerceUser || false;
                hasShop = !!user.commerceUserInfo?.shopTab || false;

                // Extract latest video date from JSON list if available
                const itemList = parsedJson.itemList || [];
                if (itemList.length > 0 && itemList[0].createTime) {
                    const ts = parseInt(itemList[0].createTime, 10);
                    if (!isNaN(ts)) {
                        latestVideoDate = new Date(ts * 1000).toISOString();
                    }
                }
            } else {
                // DOM Selector Fallbacks
                const bioEl = page.locator('[data-e2e="user-bio"]').first();
                if (await bioEl.count() > 0) biography = await bioEl.textContent();

                const linkEl = page.locator('a[data-e2e="user-link"]').first();
                if (await linkEl.count() > 0) externalUrl = await linkEl.getAttribute('href');

                const followersEl = page.locator('[data-e2e="followers-count"]').first();
                if (await followersEl.count() > 0) followerCount = parseCount(await followersEl.textContent());

                const followingEl = page.locator('[data-e2e="following-count"]').first();
                if (await followingEl.count() > 0) followingCount = parseCount(await followingEl.textContent());

                const likesEl = page.locator('[data-e2e="likes-count"]').first();
                if (await likesEl.count() > 0) likesCount = parseCount(await likesEl.textContent());

                const nameEl = page.locator('[data-e2e="user-subtitle"], h1[data-e2e="user-title"]').first();
                if (await nameEl.count() > 0) displayName = await nameEl.textContent();

                verified = await page.locator('[data-e2e="verify-icon"]').first().isVisible();
            }
        } catch (e) {
            log.warning('[TikTok] Element extraction encountered errors.');
        }
    } else {
        log.warning('[TikTok] Blocked by security page / challenge.');
    }

    const bioAnalysis = analyzeBio(biography);

    const scrapedItem: ScrapedItem = {
        platform: 'tiktok',
        url,
        crawlerUsed: 'playwright',
        scrapedAt: new Date().toISOString(),
        data: {
            username,
            displayName,
            biography,
            verified,
            followerCount,
            followers: followerCount,
            followingCount,
            likesCount,
            videosCount,
            latestVideoDate,
            externalUrl,
            isBusiness,
            hasShop,
            bio_analysis: bioAnalysis,
            screenshotUrl: ''
        } as any,
        errors: isBlocked ? ['BLOCKED: TikTok Challenge Page'] : []
    };

    return [scrapedItem];
}

export function validate(data: Record<string, unknown>): boolean {
    return !!data && typeof data.username === 'string';
}

export function detectBlock(responseBody: string): boolean {
    const lower = responseBody.toLowerCase();
    // Only flag captcha pages, verify checks, or challenge pages. Bypass "verify" within regular text.
    return lower.includes('verify_container') || lower.includes('challenge-container') || lower.includes('tiktok-captcha');
}

const tiktokHandler: PlaywrightHandler = {
    crawlerType: 'playwright',
    handle,
    validate,
    detectBlock
};

export default tiktokHandler;
