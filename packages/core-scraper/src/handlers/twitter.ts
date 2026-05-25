/**
 * @module handlers/twitter
 * @description X (Twitter) profile handler. API-first (v2) with browser fallback.
 */

import type { PlaywrightCrawlingContext } from 'crawlee';
import type { PlaywrightHandler, HandlerContext, ScrapedItem } from '../types.js';
import { fetchTwitterUser } from '../api/twitter.js';
import { blockResources } from '../utils/resources.js';
import { parseCount } from '../utils/parse-count.js';
import { analyzeBio } from '../utils/bio-analyzer.js';

export async function handle(
    context: PlaywrightCrawlingContext,
    _handlerContext: HandlerContext
): Promise<ScrapedItem[]> {
    const { page, request, log } = context;
    const url = request.url;

    log.info(`[Twitter] Initiating extraction for: ${url}`);

    // Parse username from URL
    const usernameMatch = url.match(/(?:twitter\.com|x\.com)\/([^/?#]+)/);
    const username = usernameMatch && !['home', 'search', 'explore', 'notifications'].includes(usernameMatch[1]) ? usernameMatch[1] : null;

    let apiData = null;
    if (username && (process.env.X_BEARER_TOKEN || process.env.TWITTER_BEARER_TOKEN)) {
        log.info(`[Twitter] Querying X API v2 for: ${username}`);
        apiData = await fetchTwitterUser(username);
    }

    let fullName: string | null = null;
    let biography: string | null = null;
    let verified = false;
    let followerCount: number | null = null;
    let followingCount: number | null = null;
    let tweetsCount: number | null = null;
    let latestTweetDate: string | null = null;
    let location: string | null = null;
    let externalUrl: string | null = null;
    let isBlocked = false;

    if (apiData) {
        fullName = apiData.name;
        biography = apiData.description;
        verified = apiData.verified;
        followerCount = apiData.followersCount;
        followingCount = apiData.followingCount;
        tweetsCount = apiData.tweetCount;
        location = apiData.location;
        log.info('[Twitter] X API extraction successful.');
    } else {
        // Browser fallback
        log.info('[Twitter] Running Playwright browser fallback...');
        await blockResources(page, ['media', 'font'], ['image']);
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForTimeout(3000);

        const content = await page.content();
        isBlocked = detectBlock(content);

        if (!isBlocked) {
            try {
                // Try JSON-LD parsing first
                const ldJsonElement = page.locator('script[type="application/ld+json"]').first();
                if (await ldJsonElement.count() > 0) {
                    const text = await ldJsonElement.textContent();
                    if (text) {
                        const parsed = JSON.parse(text);
                        const mainEntity = parsed.mainEntity || {};
                        fullName = mainEntity.name || null;
                        biography = mainEntity.description || null;
                        
                        // Extract statistics from interactionStatistic
                        const stats = mainEntity.interactionStatistic || [];
                        for (const stat of stats) {
                            const type = stat.interactionType || '';
                            const countVal = stat.userInteractionCount;
                            if (type.includes('FollowAction')) followerCount = countVal;
                            if (type.includes('SubscribeAction')) followingCount = countVal;
                            if (type.includes('WriteAction')) tweetsCount = countVal;
                        }
                    }
                }

                // Selector fallbacks
                if (!fullName) {
                    const nameLoc = page.locator('[data-testid="UserName"] div span').first();
                    if (await nameLoc.count() > 0) fullName = await nameLoc.textContent();
                }
                if (!biography) {
                    const bioLoc = page.locator('[data-testid="UserDescription"]').first();
                    if (await bioLoc.count() > 0) biography = await bioLoc.textContent();
                }

                // Verified
                verified = await page.locator('[data-testid="UserName"] svg[aria-label="Verified account"]').first().isVisible();

                // External Link
                const linkLoc = page.locator('[data-testid="UserProfileHeader_Items"] a[target="_blank"]').first();
                if (await linkLoc.count() > 0) externalUrl = await linkLoc.getAttribute('href');

                // Location
                const locLoc = page.locator('[data-testid="UserProfileHeader_Items"] [data-testid="UserLocation"]').first();
                if (await locLoc.count() > 0) location = await locLoc.textContent();

                // Followers (Selector fallback)
                if (followerCount === null) {
                    const fLoc = page.locator('a[href$="/followers"] span span').first();
                    if (await fLoc.count() > 0) followerCount = parseCount(await fLoc.textContent());
                }

                // Following (Selector fallback)
                if (followingCount === null) {
                    const flLoc = page.locator('a[href$="/following"] span span').first();
                    if (await flLoc.count() > 0) followingCount = parseCount(await flLoc.textContent());
                }
            } catch (e) {
                log.warning('[Twitter] Browser extraction encountered errors.');
            }
        } else {
            log.warning('[Twitter] Blocked by login wall / anti-bot.');
        }
    }

    const bioAnalysis = analyzeBio(biography);

    const scrapedItem: ScrapedItem = {
        platform: 'twitter',
        url,
        crawlerUsed: apiData ? 'cheerio' : 'playwright',
        scrapedAt: new Date().toISOString(),
        data: {
            username,
            fullName,
            biography,
            verified,
            followerCount,
            followers: followerCount, // Aliasing for scoring consistency
            followingCount,
            tweetsCount,
            latestTweetDate,
            location,
            externalUrl,
            bio_analysis: bioAnalysis,
            screenshotUrl: ''
        } as any,
        errors: isBlocked ? ['BLOCKED: Twitter Login Wall'] : []
    };

    return [scrapedItem];
}

export function validate(data: Record<string, unknown>): boolean {
    return !!data && typeof data.username === 'string';
}

export function detectBlock(responseBody: string): boolean {
    const lower = responseBody.toLowerCase();
    return lower.includes('sign in to x') || lower.includes('something went wrong') || lower.includes('redirect_to=%2flogin');
}

const twitterHandler: PlaywrightHandler = {
    crawlerType: 'playwright',
    handle,
    validate,
    detectBlock
};

export default twitterHandler;
