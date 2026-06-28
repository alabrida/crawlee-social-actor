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
import { officialApisEnabled } from '../utils/mode-gate.js';
import { cleanProfileName } from './profile-helpers.js';

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
    if (username && officialApisEnabled() && (process.env.X_BEARER_TOKEN || process.env.TWITTER_BEARER_TOKEN)) {
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
        // Wait for the follower STAT LINK specifically — it lazy-renders after the profile
        // column, so waiting on primaryColumn alone still raced it (the null-follower cause,
        // confirmed by inspecting the rendered DOM: a[href$="/verified_followers"] = "1M
        // Followers", and JSON-LD no longer carries interactionStatistic). Gentle mode: no
        // time pressure, so wait for the real signal.
        await page.waitForSelector('a[href$="/verified_followers"], a[href$="/followers"]', { timeout: 25000 }).catch(() => {});
        await page.waitForTimeout(1500);

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

                // Followers — X renamed the profile link to /verified_followers, so the
                // legacy a[href$="/followers"] selector silently missed (the cause of the
                // null follower count). Try both, and parse the number out of the link text.
                if (followerCount === null) {
                    for (const sel of ['a[href$="/verified_followers"]', 'a[href$="/followers"]']) {
                        const loc = page.locator(sel).first();
                        if (await loc.count() > 0) {
                            const t = await loc.innerText().catch(() => null);
                            const m = t && t.match(/([\d.,]+\s*[KMB]?)/);
                            if (m) { followerCount = parseCount(m[1]); break; }
                        }
                    }
                }

                // Bio / name — X exposes these in og: meta even when the testid DOM shifts.
                // Passive read, no extra automation.
                if (!biography) {
                    const og = await page.locator('meta[property="og:description"]').first().getAttribute('content').catch(() => null);
                    if (og && og.trim()) biography = og.trim();
                }
                if (!fullName) {
                    const ogt = await page.locator('meta[property="og:title"]').first().getAttribute('content').catch(() => null);
                    if (ogt) fullName = ogt.replace(/\s*\(@[^)]+\).*$/, '').replace(/\s*\/\s*X$/, '').trim() || null;
                }

                // Verified (newer testid in addition to the aria-label svg)
                if (!verified) {
                    verified = await page.locator('[data-testid="icon-verified"]').first().count() > 0;
                }
            } catch (e) {
                log.warning('[Twitter] Browser extraction encountered errors.');
            }
        } else {
            log.warning('[Twitter] Blocked by login wall / anti-bot.');
        }
    }

    // Strip notification-badge / handle / "/ X" noise from the name ("(21) Best Buy" -> "Best Buy").
    fullName = cleanProfileName(fullName);

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
