import type { PlaywrightCrawlingContext } from 'crawlee';
import { blockResources } from '../utils/resources.js';
import type { PlaywrightHandler, HandlerContext, ScrapedItem } from '../types.js';
import { reportIssue } from '../utils/issue-log.js';

/**
 * Handle Meta (Facebook/Instagram) URLs.
 * @param context - Crawlee PlaywrightCrawlingContext.
 * @param _handlerContext - Shared handler context.
 * @returns Array of scraped items.
 */
export async function handle(
    context: PlaywrightCrawlingContext,
    _handlerContext: HandlerContext,
): Promise<ScrapedItem[]> {
    const { page, request, log } = context;
    const platform = request.url.includes('facebook.com') ? 'facebook' : 'instagram';

    log.info(`[Meta] Extracting ${platform}: ${request.url}`);

    // G-COST-02: Block heavy resources (Excluding image for high-res screenshots)
    await blockResources(page, ['media', 'font'], ['image']);

    await page.goto(request.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    // Wait for hydration and dynamic content
    try {
        await page.waitForFunction(() => document.body.innerText.length > 1000, { timeout: 15000 });
    } catch (e) {
        log.debug(`[Meta] Hydration wait timed out or body insufficient for ${request.url}`);
    }

    // Dismiss potential login overlays/dialogs that block screenshots
    try {
        const dismissSelectors = [
            '[role="dialog"] [aria-label="Close"]',
            '[role="dialog"] [aria-label="Not Now"]',
            'div[role="dialog"] button:has-text("Not Now")',
            'div[role="dialog"] i.x10l6tqk' // Common close 'X' icon on IG
        ];
        for (const selector of dismissSelectors) {
            const btn = page.locator(selector).first();
            if (await btn.isVisible({ timeout: 2000 })) {
                log.info(`[Meta] Dismissing login overlay: ${selector}`);
                await btn.click();
                await page.waitForTimeout(1000);
            }
        }
    } catch (e) {
        // Ignore errors if selectors aren't found
    }
    
    // Final wait to ensure animations/splash screens clear and images settle
    await page.waitForTimeout(4000);
    
    // Detect if we are still on the login wall
    const content = await page.content();
    const isBlocked = detectBlock(content);
    
    if (isBlocked) {
        log.warning(`[Meta] Potential ${platform} block or login wall detected after navigation.`);
        await reportIssue({
            platform,
            url: request.url,
            severity: 'CRITICAL',
            message: 'Login wall or anti-bot checkpoint detected after hydration.',
        });
    }

    const links: string[] = [];
    const ctas: string[] = [];
    const conversionMarkers: string[] = [];

    // Skip extraction if blocked to avoid timeouts on missing elements
    if (!isBlocked) {
        if (platform === 'instagram') {
            try {
                const bioLinkLocator = page.locator('header section a[target="_blank"]').first();
                if (await bioLinkLocator.count() > 0) {
                    const bioLink = await bioLinkLocator.getAttribute('href');
                    if (bioLink) links.push(bioLink);
                }
                
                const nameLocator = page.locator('header section h1').first();
                if (await nameLocator.count() > 0) {
                    const fullName = await nameLocator.textContent();
                    if (fullName) conversionMarkers.push(`Name: ${fullName.trim()}`);
                }

                // Phase 2: Raw Metrics for Instagram
                const followerText = await page.locator('header section ul li:nth-child(2) span').first().getAttribute('title').catch(() => null);
                if (followerText) conversionMarkers.push(`Followers Raw: ${followerText}`);
                
                const isVerified = await page.locator('header section span[title="Verified"]').count() > 0;
                if (isVerified) conversionMarkers.push('Status: Verified');

            } catch (e) {
                log.debug('[Meta] Instagram extraction failed on some elements', { url: request.url });
            }
        } else {
            // Facebook extraction
            try {
                const introLocator = page.locator('[role="main"] div').first();
                if (await introLocator.count() > 0) {
                    const introText = await introLocator.textContent();
                    if (introText) conversionMarkers.push(`Intro detected: ${introText.substring(0, 50)}...`);
                }

                // Phase 2: Raw Metrics for Facebook (often in intro or followers link)
                const followersLink = page.locator('a[href*="followers"]').first();
                if (await followersLink.count() > 0) {
                    const followersText = await followersLink.textContent();
                    if (followersText) conversionMarkers.push(`Followers Raw: ${followersText.trim()}`);
                }
            } catch (e) {
                log.debug('[Meta] Facebook extraction failed on some elements', { url: request.url });
            }
        }
    } else {
        conversionMarkers.push('BLOCKED: Login Wall / Anti-Bot');
    }

    const scrapedItem: ScrapedItem = {
        platform,
        url: request.url,
        crawlerUsed: 'playwright',
        scrapedAt: new Date().toISOString(),
        data: {
            revenueIndicators: {
                ctas,
                links,
                conversionMarkers,
            },
            profileHtml: await page.content(),
            screenshotUrl: '',
        },
        errors: []
    };

    return [scrapedItem];
}

/**
 * Validate extracted Meta data.
 * @param data - The data object.
 * @returns True if valid.
 */
export function validate(data: Record<string, unknown>): boolean {
    const payload = data as any;
    return (
        payload &&
        payload.revenueIndicators &&
        typeof payload.screenshotUrl === 'string'
    );
}

/**
 * Detect Meta blocks (login walls).
 * @param responseBody - Page content.
 * @returns True if blocked.
 */
export function detectBlock(responseBody: string): boolean {
    const lower = responseBody.toLowerCase();
    
    // CONTENT-FIRST: If we see clear profile indicators, it's NOT blocked.
    const hasProfileIndicators = lower.includes('followers') || 
                                lower.includes('following') || 
                                lower.includes('posts') ||
                                lower.includes('about') ||
                                lower.includes('photos');
    
    if (hasProfileIndicators) return false;

    // Explicit login walls or anti-bot checkpoints
    return lower.includes('login_form') || 
           lower.includes('ident_login') ||
           lower.includes('checkpoint') || 
           (lower.includes('instagram.com/accounts/login') && !lower.includes('content-type="profile"'));
}

const metaHandler: PlaywrightHandler = {
    crawlerType: 'playwright',
    handle,
    validate,
    detectBlock,
};

export default metaHandler;
