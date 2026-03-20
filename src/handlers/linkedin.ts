/**
 * @module handlers/linkedin
 * @description LinkedIn handler using PlaywrightCrawler with sticky residential proxies.
 * Enforces G-BOT-01 rate limit (max 250 profiles/day) and randomized delays.
 * @see PRD Section 5.3
 */

import type { PlaywrightCrawlingContext } from 'crawlee';
import type { PlaywrightHandler, HandlerContext, ScrapedItem } from '../types.js';
import { blockResources } from '../utils/resources.js';

let dailyRequestCount = 0;

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

    // G-COST-02: Block heavy resources (LinkedIn profiles are heavy)
    await blockResources(page);

    // G-BOT-01: Hard cap at 250 requests/day
    const maxDaily = handlerContext.input.linkedinDailyLimit || 250;
    if (dailyRequestCount >= maxDaily) {
        throw new Error(`LinkedIn daily request limit (${maxDaily}) reached. Aborting request for ${url}`);
    }
    dailyRequestCount++;

    log.info(`[LinkedIn] Extracting profile: ${url} (Req ${dailyRequestCount}/${maxDaily})`);

    // G-BOT-02: Randomize delays (2-5 seconds)
    const delay = Math.floor(Math.random() * 3000) + 2000;
    await page.waitForTimeout(delay);

    try {
        await page.waitForLoadState('domcontentloaded', { timeout: 5000 });
    } catch (e) {
        log.warning(`[LinkedIn] Timeout waiting for load state on ${url}, proceeding anyway...`);
    }

    let content = '';
    try {
        content = await page.content();
    } catch {
        throw new Error('LinkedIn auth wall redirecting too fast to read content.');
    }

    if (detectBlock(content)) {
        throw new Error('LinkedIn auth wall or block detected despite cookies.');
    }

    // Attempt to extract data
    // Note: Since we don't have live valid cookies in dev, we use defensive selectors.
    const extractData = await page.evaluate(() => {
        // Find visible links in the intro section or contact info
        const links: string[] = [];
        document.querySelectorAll('a[href^="http"]').forEach(a => {
            const href = a.getAttribute('href');
            if (href && !href.includes('linkedin.com')) {
                links.push(href);
            }
        });

        const ctas: string[] = [];
        document.querySelectorAll('button, a.app-aware-link').forEach(el => {
            const text = el.textContent?.trim().toLowerCase() || '';
            if (text.includes('connect') || text.includes('follow') || text.includes('message') || text.includes('visit website')) {
                if (el.textContent) ctas.push(el.textContent.trim());
            }
        });

        const profileHtml = document.querySelector('main.scaffold-layout__main')?.innerHTML || 
                            document.querySelector('.core-rail')?.innerHTML || 
                            document.body.innerHTML.substring(0, 5000); // Fallback snippet

        // Phase 2: High-res metrics
        let followers = document.querySelector('.pv-top-card--list-bullet li:last-child')?.textContent?.trim() || '';
        if (!followers) {
            // Company followers pattern
            const p = Array.from(document.querySelectorAll('div, span')).find(el => el.textContent?.toLowerCase().includes('followers'));
            if (p) followers = p.textContent?.trim() || '';
        }
        
        const isVerified = !!document.querySelector('.pv-top-card-section__verified-badge');

        // Extract structured profile fields
        const fullName = document.querySelector('.text-heading-xlarge, h1.top-card-layout__title, h1.org-top-card-summary__title, h1')?.textContent?.trim() || '';
        const headline = document.querySelector('.text-body-medium.break-words, .top-card-layout__headline, .org-top-card-summary__tagline, h2')?.textContent?.trim() || '';
        const location = document.querySelector('.text-body-small[data-test-id="location"], .top-card-layout__first-subline, span.text-body-small.inline, .org-top-card-summary-info-list__info-item')?.textContent?.trim() || '';
        const companyName = document.querySelector('.pv-text-details__right-panel a[href*="/company/"], a[data-field="experience_company_logo"]')?.textContent?.trim() || fullName; // Fallback to Title if it's a company page
        const connectionsText = document.querySelector('.pv-top-card--list-bullet li:first-child')?.textContent?.trim() || '';

        // Extract native post time from recent activity (e.g. "3d", "1mo")
        let latestPostDate = null;
        const firstPostTime = document.querySelector('time') || document.querySelector('.feed-shared-text-view span.visually-hidden');
        if (firstPostTime) {
            latestPostDate = firstPostTime.textContent?.trim() || null;
        }

        return { links: Array.from(new Set(links)), ctas: Array.from(new Set(ctas)), profileHtml, followers, isVerified, fullName, headline, location, companyName, connectionsText, latestPostDate };
    });

    const conversionMarkers: string[] = [];
    extractData.ctas.forEach(cta => {
        if (cta.toLowerCase().includes('visit website')) conversionMarkers.push('Website Click');
        if (cta.toLowerCase().includes('book')) conversionMarkers.push('Booking');
    });

    // Add Raw signals for Math Agent
    if (extractData.followers) conversionMarkers.push(`Followers Raw: ${extractData.followers}`);
    if (extractData.isVerified) conversionMarkers.push('Status: Verified');

    // Extract username from URL
    const usernameMatch = url.match(/linkedin\.com\/(?:in|company)\/([^/?#]+)/);
    const username = usernameMatch ? usernameMatch[1] : null;

    // Parse follower count from raw text (e.g. "1,234 followers")
    let followerCount: number | null = null;
    if (extractData.followers) {
        const numMatch = extractData.followers.match(/([\d,.]+)/);
        if (numMatch) {
            let num = parseFloat(numMatch[1].replace(/,/g, ''));
            if (extractData.followers.toLowerCase().includes('k')) num *= 1000;
            if (extractData.followers.toLowerCase().includes('m')) num *= 1000000;
            followerCount = Math.floor(num);
        }
    }

    // Parse connections count from raw text (e.g. "500+ connections")
    let connectionsCount: number | null = null;
    if (extractData.connectionsText) {
        const connMatch = extractData.connectionsText.match(/([\d,+]+)/);
        if (connMatch) {
            let num = parseInt(connMatch[1].replace(/[,+]/g, ''), 10);
            if (!isNaN(num)) connectionsCount = num;
        }
    }

    const scrapedItem: ScrapedItem = {
        platform: 'linkedin',
        url,
        crawlerUsed: 'playwright',
        scrapedAt: new Date().toISOString(),
        data: {
            revenueIndicators: {
                ctas: extractData.ctas,
                links: extractData.links,
                conversionMarkers,
            },
            profileHtml: extractData.profileHtml,
            screenshotUrl: '',
            // Structured fields for direct Supabase mapping
            username,
            fullName: extractData.fullName || null,
            headline: extractData.headline || null,
            location: extractData.location || null,
            followerCount,
            connectionsCount,
            companyName: extractData.companyName || null,
            hasRecentActivity: extractData.ctas.length > 0 || extractData.links.length > 0,
            latestPostDate: extractData.latestPostDate || null,
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
