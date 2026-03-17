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

    log.info(`[Twitter] Extracting profile: ${url}`);

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
        // Note: Twitter uses dynamic class names, so we prioritize data-testid or aria-labels
        try {
            // 1. Bio Link
            const bioLinkLocator = page.locator('[data-testid="UserProfileHeader_Items"] a[target="_blank"]').first();
            if (await bioLinkLocator.count() > 0) {
                const bioLink = await bioLinkLocator.getAttribute('href');
                if (bioLink) links.push(bioLink);
            }

            // 2. Verified Status
            const verifiedLocator = page.locator('[data-testid="UserProfileHeader_Items"] [aria-label*="Verified account"]').first();
            if (await verifiedLocator.count() > 0) {
                conversionMarkers.push('Status: Verified');
            }

            // 3. Numeric Metrics (Raw signals for Math Agent)
            const followerCount = await page.locator('a[href$="/verified_followers"] span').first().textContent();
            if (followerCount) conversionMarkers.push(`Followers Raw: ${followerCount.trim()}`);

            const followingCount = await page.locator('a[href$="/following"] span').first().textContent();
            if (followingCount) conversionMarkers.push(`Following Raw: ${followingCount.trim()}`);

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
        },
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
