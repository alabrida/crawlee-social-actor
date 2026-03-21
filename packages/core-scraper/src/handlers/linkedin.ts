/**
 * @module handlers/linkedin
 * @description LinkedIn handler using PlaywrightCrawler with sticky residential proxies.
 * Enforces G-BOT-01 rate limit (max 250 profiles/day) and randomized delays.
 * @see PRD Section 5.3
 */

import type { PlaywrightCrawlingContext } from 'crawlee';
import type { PlaywrightHandler, HandlerContext, ScrapedItem } from '../types.js';
import { blockResources } from '../utils/resources.js';

let linkedinDailyLimitCount = 0;

/**
 * Handle a LinkedIn URL with authenticated DOM scraping and human-like delays.
 * @param context - Crawlee PlaywrightCrawlingContext with page/request.
 * @param handlerContext - Shared handler context with actor input (includes dailyLimit).
 * @returns Array of scraped items in the normalized envelope.
 */
async function handle(
    context: PlaywrightCrawlingContext,
    handlerContext: HandlerContext,
): Promise<ScrapedItem[]> {
    const { request, page, log } = context;
    const url = request.url;
    const isSubPage = request.userData?.isSubPage || false;

    log.info(`[LinkedIn] Processing: ${url} (isSubPage: ${isSubPage})`);

    // G-BOT-01: Hard cap at 250 requests/day
    const maxDaily = handlerContext.input.linkedinDailyLimit || 250;
    if (linkedinDailyLimitCount >= maxDaily) {
        log.warning(`LinkedIn daily request limit (${maxDaily}) reached. skipping ${url}`);
        return [];
    }
    linkedinDailyLimitCount++;

    // G-BOT-02: Randomized delay to mimic human behavior
    await page.waitForTimeout(Math.floor(Math.random() * 5000) + 2000);

    // G-COST-02: Block heavy resources
    await blockResources(page, ['media', 'font', 'stylesheet'], ['image']);

    // Extraction state
    let fullName: string | null = null;
    let headline: string | null = null;
    let location: string | null = null;
    let followerCount: number | null = null;
    let connectionsCount: number | null = null;
    let companyName: string | null = null;
    let websiteUrl: string | null = null;
    let latestPostDate: string | null = null;
    let hasRecentActivity = false;
    let profileHtml = '';

    try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        
        // Wait for profile or activity content
        await page.waitForSelector('main, .scaffold-layout', { timeout: 15000 }).catch(() => {});
        await page.waitForTimeout(2000);

        const content = await page.content();
        if (detectBlock(content)) {
            log.warning(`[LinkedIn] Block or Auth Wall detected at ${url}`);
            return [];
        }

        // Sub-page check
        if (isSubPage) {
            log.info(`[LinkedIn] Extracting sub-page metadata: ${url}`);
            const title = await page.title();
            const h1 = await page.locator('h1').first().innerText().catch(() => '');
            const metaDesc = await page.locator('meta[name="description"]').getAttribute('content').catch(() => '');

            return [{
                platform: 'linkedin',
                url,
                crawlerUsed: 'playwright',
                scrapedAt: new Date().toISOString(),
                data: {
                    revenueIndicators: { ctas: [], links: [], conversionMarkers: [] },
                    profileHtml: content,
                    crawlMetadata: {
                        title,
                        h1,
                        metaDescription: metaDesc || '',
                        httpStatus: 200,
                        snippet: metaDesc || title
                    }
                } as any,
                errors: []
            }];
        }

        // --- ROOT PROFILE EXTRACTION ---
        profileHtml = content;

        // 1. Full Name
        const nameLocator = page.locator('h1.text-heading-xlarge, .pv-top-card--list .text-heading-xlarge').first();
        if (await nameLocator.isVisible()) {
            fullName = (await nameLocator.innerText()).trim();
        }

        // 2. Headline
        const headlineLocator = page.locator('.text-body-medium.break-words').first();
        if (await headlineLocator.isVisible()) {
            headline = (await headlineLocator.innerText()).trim();
        }

        // 3. Location
        const locationLocator = page.locator('.text-body-small.inline.t-black--light.break-words').first();
        if (await locationLocator.isVisible()) {
            location = (await locationLocator.innerText()).trim();
        }

        // 3.5 Company Name
        const companyBtn = page.locator('button[aria-label*="Current company"], .pv-text-details__right-panel-item-link').first();
        if (await companyBtn.isVisible()) {
             let rawCompany = await companyBtn.getAttribute('aria-label') || await companyBtn.innerText();
             companyName = rawCompany.replace(/Current company|:|opens in a new tab/gi, '').trim();
             // Sometimes the inner text has nested visual hidden spans
             if (companyName.length > 50) {
                 const innerTextOnly = await companyBtn.locator('.pv-text-details__right-panel-item-text').first().innerText().catch(() => null);
                 if (innerTextOnly) companyName = innerTextOnly.trim();
             }
        }
        
        // Fallback Company Name from first experience item
        if (!companyName) {
            const expCompany = page.locator('#experience ~ .pvs-list__outer-container .pvs-entity span[aria-hidden="true"]').nth(1);
            if (await expCompany.count() > 0) {
                const expText = await expCompany.innerText();
                if (expText && expText.includes('·')) {
                     companyName = expText.split('·')[0].trim();
                } else if (expText) {
                     companyName = expText.trim();
                }
            }
        }

        // 4. Followers & Connections
        const followerLocator = page.locator('span:has-text("followers")').first();
        if (await followerLocator.isVisible()) {
            const text = await followerLocator.innerText();
            const match = text.match(/([\d,]+)/);
            if (match) followerCount = parseInt(match[1].replace(/,/g, ''), 10);
        }

        const connectionsLocator = page.locator('span:has-text("connections")').first();
        if (await connectionsLocator.isVisible()) {
            const text = await connectionsLocator.innerText();
            const match = text.match(/([\d,]+)/);
            if (match) connectionsCount = parseInt(match[1].replace(/,/g, ''), 10);
        }

        // 5. Website Extraction
        const websiteLocator = page.locator('a:has-text("Visit website"), .pv-text-details__right-panel a, a[href*="redir/redirect"]').first();
        if (await websiteLocator.isVisible()) {
            const href = await websiteLocator.getAttribute('href');
            if (href && !href.includes('linkedin.com')) {
                websiteUrl = href.startsWith('http') ? href : `https://www.linkedin.com${href}`;
            }
        }

        // 6. Activity Detection & Enqueueing
        const activitySelector = 'a[href*="/recent-activity/all/"], a[href*="/recent-activity/"]';
        const activityLink = page.locator(activitySelector).first();
        if (await activityLink.isVisible()) {
            hasRecentActivity = true;
            
            // Spider Architecture: Enqueue recent activity posts
            log.info(`[LinkedIn] Enqueueing activity for deep crawl: ${url}`);
            const activityHref = await activityLink.getAttribute('href');
            if (activityHref) {
                const fullActivityUrl = activityHref.startsWith('http') ? activityHref : `https://www.linkedin.com${activityHref}`;
                const { crawler } = context;
                await crawler.addRequests([{
                    url: fullActivityUrl,
                    userData: { ...request.userData, isSubPage: true }
                }]);
            }
        }

        // Link-in-Bio Spidering: Enqueue website for general forensics
        if (websiteUrl && !isSubPage) {
            log.info(`[LinkedIn] Enqueueing website for deep forensics: ${websiteUrl}`);
            const { crawler } = context;
            await crawler.addRequests([{
                url: websiteUrl,
                userData: { ...request.userData, isSubPage: true, platform: 'general' },
                label: 'general'
            }]);
        }

    } catch (e) {
        log.warning(`[LinkedIn] Extraction error for ${url}: ${String(e)}`);
    }

    const ctas: string[] = [];
    if (hasRecentActivity) ctas.push('See Activity');
    if (websiteUrl) ctas.push('Visit Website');

    const conversionMarkers: string[] = [];
    if (followerCount && followerCount > 500) conversionMarkers.push(`Influence: ${followerCount} followers`);
    if (connectionsCount && connectionsCount >= 500) conversionMarkers.push('Network: 500+ connections');

    const scrapedItem: ScrapedItem = {
        platform: 'linkedin',
        url: request.url,
        crawlerUsed: 'playwright',
        scrapedAt: new Date().toISOString(),
        data: {
            revenueIndicators: {
                ctas,
                links: websiteUrl ? [websiteUrl] : [],
                conversionMarkers,
            },
            profileHtml,
            screenshotUrl: '', 
            // Structured data for direct Supabase mapping
            fullName,
            headline,
            location,
            followerCount,
            connectionsCount,
            companyName,
            hasRecentActivity,
            latestPostDate,
            // Deep Link Metadata for Crawl Report
            crawlMetadata: {
                title: await page.title().catch(() => 'LinkedIn Profile'),
                h1: fullName || '',
                metaDescription: headline || '',
                httpStatus: 200,
                snippet: headline || ''
            }
        } as any,
        errors: []
    };

    return [scrapedItem];
}

/**
 * Validate that the extracted LinkedIn data contains expected keys.
 * @param data - The extracted data object.
 * @returns True if required fields are present.
 */
function validate(data: Record<string, unknown>): boolean {
    const payload = data as any;
    if (!payload || typeof payload !== 'object') return false;
    if (!payload.revenueIndicators || !Array.isArray(payload.revenueIndicators.links)) return false;
    if (typeof payload.profileHtml !== 'string') return false;
    return true;
}

/**
 * Detect if the response indicates a LinkedIn block (auth wall, rate limit).
 * @param responseBody - The page content.
 * @returns True if a block is detected.
 */
function detectBlock(responseBody: string): boolean {
    const bodyLower = responseBody.toLowerCase();
    return (
        bodyLower.includes('authwall') ||
        bodyLower.includes('too many requests') ||
        bodyLower.includes('sign in ') ||
        bodyLower.includes('join linkedin') ||
        responseBody.includes('HTTP 999')
    );
}

/** Assembled handler export satisfying the PlaywrightHandler interface. */
const linkedinHandler: PlaywrightHandler = {
    crawlerType: 'playwright',
    handle,
    validate,
    detectBlock,
};
export default linkedinHandler;
