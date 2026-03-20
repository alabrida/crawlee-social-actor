import type { PlaywrightCrawlingContext } from 'crawlee';
import { blockResources } from '../utils/resources.js';
import type { PlaywrightHandler, HandlerContext, ScrapedItem } from '../types.js';
import { reportIssue } from '../utils/issue-log.js';

/**
 * Handle Twitter/X profile URLs.
 * @param context - Crawlee PlaywrightCrawlingContext.
 * @param _handlerContext - Shared handler context.
 * @returns Array of scraped items.
 */
export async function handle(
    context: PlaywrightCrawlingContext,
    _handlerContext: HandlerContext,
): Promise<ScrapedItem[]> {
    const { page, request, log } = context;
    const url = request.url;
    const isSubPage = request.userData?.isSubPage || false;

    log.info(`[Twitter] Extracting profile: ${url} (isSubPage: ${isSubPage})`);

    // G-COST-02: Block heavy resources (Excluding image for high-res screenshots)
    await blockResources(page, ['media', 'font'], ['image']);

    // Faster load using domcontentloaded
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // Wait for hydration and dynamic content (bypassing splash screen)
    try {
        await page.waitForFunction(() => document.body.innerText.length > 500, { timeout: 15000 });
    } catch (e) {
        log.debug(`[Twitter] Hydration wait timed out for ${url}`);
    }

    // Final wait for reliable rendering
    await page.waitForTimeout(3000);

    const content = await page.content();
    const isBlocked = detectBlock(content);
    
    const links: string[] = [];
    const ctas: string[] = [];
    const conversionMarkers: string[] = [];

    // Extract username from URL
    const usernameMatch = url.match(/(?:twitter\.com|x\.com)\/([^/?#]+)/);
    const username = usernameMatch && !['home', 'search', 'explore', 'notifications'].includes(usernameMatch[1]) ? usernameMatch[1] : null;

    // Initialize structured data fields
    let fullName: string | null = null;
    let biography: string | null = null;
    let verified = false;
    let followerCount: number | null = null;
    let followingCount: number | null = null;
    let tweetsCount: number | null = null;
    let latestTweetDate: string | null = null;

    // Parse shorthand counts (e.g. "1.2K", "3M")
    const parseCount = (raw: string): number | null => {
        if (!raw) return null;
        const cleaned = raw.replace(/,/g, '').trim();
        if (cleaned === '') return null;
        let num = parseFloat(cleaned);
        if (isNaN(num)) return null;
        if (cleaned.toLowerCase().endsWith('k')) num *= 1000;
        if (cleaned.toLowerCase().endsWith('m')) num *= 1000000;
        return Math.floor(num);
    };

    if (isBlocked) {
        log.warning(`[Twitter] Login wall detected at ${url}`);
        conversionMarkers.push('BLOCKED: Login Wall / Anti-Bot');
        await reportIssue({
            platform: 'twitter',
            url,
            severity: 'CRITICAL',
            message: 'Twitter login wall detected.',
        });
    } else {
        // Basic extraction selectors (Targeting standard profile layout)
        try {
            // 1. Bio Link
            const bioLinkLocator = page.locator('[data-testid="UserProfileHeader_Items"] a[target="_blank"]').first();
            if (await bioLinkLocator.count() > 0) {
                const bioLink = await bioLinkLocator.getAttribute('href');
                if (bioLink) links.push(bioLink);
            }

            // 2. Full Name
            const nameLocator = page.locator('[data-testid="UserName"] div span').first();
            if (await nameLocator.count() > 0) {
                const nameText = await nameLocator.textContent();
                if (nameText) fullName = nameText.trim();
            }

            // 3. Biography
            const bioLocator = page.locator('[data-testid="UserDescription"]').first();
            if (await bioLocator.count() > 0) {
                const bioText = await bioLocator.textContent();
                if (bioText) biography = bioText.trim();
            }

            // 4. Verified Status
            const verifiedLocator = page.locator('[data-testid="UserProfileHeader_Items"] [aria-label*="Verified account"]').first();
            if (await verifiedLocator.count() > 0) {
                conversionMarkers.push('Status: Verified');
                verified = true;
            }

            // 5. Numeric Metrics
            const followerLocator = page.locator('a[href$="/verified_followers"] span, a[href$="/followers"] span').first();
            if (await followerLocator.count() > 0) {
                const followerCountText = await followerLocator.textContent();
                if (followerCountText) {
                    const text = followerCountText.trim();
                    conversionMarkers.push(`Followers Raw: ${text}`);
                    followerCount = parseCount(text);
                }
            }

            const followingLocator = page.locator('a[href$="/following"] span').first();
            if (await followingLocator.count() > 0) {
                const followingCountText = await followingLocator.textContent();
                if (followingCountText) {
                    const text = followingCountText.trim();
                    conversionMarkers.push(`Following Raw: ${text}`);
                    followingCount = parseCount(text);
                }
            }

            // 6. Latest Tweet Date
            const firstTweetTime = page.locator('[data-testid="tweet"] time').first();
            if (await firstTweetTime.count() > 0) {
                const datetime = await firstTweetTime.getAttribute('datetime');
                if (datetime) latestTweetDate = new Date(datetime).toISOString();
            }

            // Spider Architecture: Enqueue recent tweets if root profile
            if (!isSubPage) {
                log.info(`[Twitter] Enqueueing recent tweets for deep crawl from profile: ${url}`);
                const tweetLinks = await page.evaluate(() => {
                    const tLinks: string[] = [];
                    const anchors = document.querySelectorAll('article[data-testid="tweet"] a[href*="/status/"]');
                    anchors.forEach((a) => {
                        const href = (a as HTMLAnchorElement).href;
                        if (href && !tLinks.includes(href) && tLinks.length < 5) {
                            tLinks.push(href);
                        }
                    });
                    return tLinks;
                });

                if (tweetLinks.length > 0) {
                    const { crawler } = context;
                    await crawler.addRequests(tweetLinks.map(tUrl => ({
                        url: tUrl,
                        userData: { ...request.userData, isSubPage: true }
                    })));
                }
            }

        } catch (e) {
            log.debug('[Twitter] Extraction encountered missing elements', { url, error: String(e) });
        }
    }

    const scrapedItem: ScrapedItem = {
        platform: 'twitter',
        url: request.url,
        crawlerUsed: 'playwright',
        scrapedAt: new Date().toISOString(),
        data: {
            revenueIndicators: {
                ctas,
                links,
                conversionMarkers,
            },
            profileHtml: content,
            screenshotUrl: '', // Populated by main.ts
            username,
            fullName,
            biography,
            verified,
            followerCount,
            followingCount,
            tweetsCount,
            latestTweetDate,
            // Deep Link Metadata for Crawl Report
            crawlMetadata: {
                title: await page.title().catch(() => 'Twitter / X'),
                h1: fullName || username || '',
                metaDescription: biography || '',
                httpStatus: 200,
                snippet: biography || content.substring(0, 200)
            }
        } as any,
        errors: []
    };

    return [scrapedItem];
}

/**
 * Validate extracted Twitter data.
 * @param data - The data object.
 * @returns True if valid.
 */
export function validate(data: Record<string, unknown>): boolean {
    const payload = data as any;
    return (
        payload &&
        payload.revenueIndicators &&
        typeof payload.profileHtml === 'string' &&
        typeof payload.screenshotUrl === 'string'
    );
}

/**
 * Detect Twitter blocks (login walls).
 * @param responseBody - Page content.
 * @returns True if blocked.
 */
export function detectBlock(responseBody: string): boolean {
    const lower = responseBody.toLowerCase();
    
    // CONTENT-FIRST: If we see clear profile indicators, it's NOT blocked.
    const hasProfileIndicators = lower.includes('joined') || 
                                lower.includes('followers') || 
                                lower.includes('following') ||
                                lower.includes('data-testid="userprofileheader"');
    
    if (hasProfileIndicators) return false;

    // Explicit login or anti-bot walls
    return lower.includes('redirecting you to the log in page') || 
           lower.includes('verify you are human') || 
           lower.includes('log in to x') ||
           lower.includes('something went wrong') || 
           lower.includes("something's not right") ||
           (lower.includes('ident_login') && lower.includes('twitter'));
}

const twitterHandler: PlaywrightHandler = {
    crawlerType: 'playwright',
    handle,
    validate,
    detectBlock,
};

export default twitterHandler;
