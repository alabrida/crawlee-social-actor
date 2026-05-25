/**
 * @module handlers/linkedin
 * @description LinkedIn profile handler. Browser-optimized single-page extraction.
 */

import type { PlaywrightCrawlingContext } from 'crawlee';
import type { PlaywrightHandler, HandlerContext, ScrapedItem } from '../types.js';
import { blockResources } from '../utils/resources.js';
import { parseCount } from '../utils/parse-count.js';
import { analyzeBio } from '../utils/bio-analyzer.js';

let linkedinDailyLimitCount = 0;

export async function handle(
    context: PlaywrightCrawlingContext,
    handlerContext: HandlerContext
): Promise<ScrapedItem[]> {
    const { request, page, log } = context;
    const url = request.url;

    log.info(`[LinkedIn] Commencing extraction for: ${url}`);

    // G-BOT-01: Hard cap at 250 requests/day per run
    const maxDaily = handlerContext.input.linkedinDailyLimit || 250;
    if (linkedinDailyLimitCount >= maxDaily) {
        log.warning(`LinkedIn daily request limit (${maxDaily}) reached. skipping ${url}`);
        return [];
    }
    linkedinDailyLimitCount++;

    await page.waitForTimeout(Math.floor(Math.random() * 3000) + 2000);
    await blockResources(page, ['media', 'font', 'stylesheet'], ['image']);

    let fullName: string | null = null;
    let headline: string | null = null;
    let location: string | null = null;
    let followerCount: number | null = null;
    let connectionsCount: number | null = null;
    let companyName: string | null = null;
    let websiteUrl: string | null = null;
    let latestPostDate: string | null = null;
    let hasRecentActivity = false;

    // Professional/Creator Signals
    let aboutLength = 0;
    let featuredSection = false;
    let recommendationsCount = 0;
    let creatorMode = false;
    let newsletter = false;
    let isBlocked = false;

    try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForSelector('main, .scaffold-layout', { timeout: 15000 }).catch(() => {});
        await page.waitForTimeout(2000);

        const content = await page.content();
        isBlocked = detectBlock(content);

        if (!isBlocked) {
            // Full Name
            const nameLoc = page.locator('h1.text-heading-xlarge, .pv-top-card--list .text-heading-xlarge, h1').first();
            if (await nameLoc.isVisible()) fullName = (await nameLoc.innerText()).trim();

            // Headline
            const headlineLoc = page.locator('.text-body-medium.break-words, h2.header-section').first();
            if (await headlineLoc.isVisible()) headline = (await headlineLoc.innerText()).trim();

            // Location
            const locLoc = page.locator('.text-body-small.inline.t-black--light.break-words').first();
            if (await locLoc.isVisible()) location = (await locLoc.innerText()).trim();

            // Company Name
            const companyBtn = page.locator('button[aria-label*="Current company"], .pv-text-details__right-panel-item-link').first();
            if (await companyBtn.isVisible()) {
                const rawCompany = await companyBtn.getAttribute('aria-label') || await companyBtn.innerText();
                companyName = rawCompany.replace(/Current company|:|opens in a new tab/gi, '').trim();
            }

            // Followers & Connections
            const followerLocator = page.locator('span:has-text("followers")').first();
            if (await followerLocator.isVisible()) {
                followerCount = parseCount(await followerLocator.innerText());
            }

            const connectionsLocator = page.locator('span:has-text("connections")').first();
            if (await connectionsLocator.isVisible()) {
                connectionsCount = parseCount(await connectionsLocator.innerText());
            }

            // Website URL
            const websiteLocator = page.locator('a:has-text("Visit website"), .pv-text-details__right-panel a, a[href*="redir/redirect"]').first();
            if (await websiteLocator.isVisible()) {
                const href = await websiteLocator.getAttribute('href');
                if (href && !href.includes('linkedin.com')) {
                    websiteUrl = href.startsWith('http') ? href : `https://www.linkedin.com${href}`;
                }
            }

            // About length
            const aboutSec = page.locator('section:has(#about), section:has-text("About")').first();
            if (await aboutSec.count() > 0) {
                const aboutText = await aboutSec.innerText();
                aboutLength = aboutText ? aboutText.replace(/About/i, '').trim().length : 0;
            }

            // Featured section
            featuredSection = await page.locator('section:has(#featured), section:has-text("Featured")').first().count() > 0;

            // Recommendations
            const recSec = page.locator('section:has(#recommendations)').first();
            if (await recSec.count() > 0) {
                const recText = await recSec.innerText();
                const recMatch = recText.match(/Given\s*\((\d+)\)|Received\s*\((\d+)\)/i);
                if (recMatch) {
                    recommendationsCount = parseInt(recMatch[1] || recMatch[2], 10);
                }
            }

            // Creator Mode & Newsletter check
            const talksAbout = await page.locator('span:has-text("talks about")').first().count() > 0;
            if (talksAbout) creatorMode = true;

            newsletter = content.includes('/newsletters/') || content.toLowerCase().includes('subscribe to my newsletter');

            // Activity check
            hasRecentActivity = await page.locator('a[href*="/recent-activity/"]').first().count() > 0;
        } else {
            log.warning('[LinkedIn] Profile blocked or auth wall hit.');
        }
    } catch (e) {
        log.warning(`[LinkedIn] Extraction error: ${String(e)}`);
    }

    const bioAnalysis = analyzeBio(headline);

    const scrapedItem: ScrapedItem = {
        platform: 'linkedin',
        url,
        crawlerUsed: 'playwright',
        scrapedAt: new Date().toISOString(),
        data: {
            fullName,
            headline,
            location,
            followerCount,
            followers: followerCount,
            connectionsCount,
            companyName,
            websiteUrl,
            hasRecentActivity,
            latestPostDate,
            about_length: aboutLength,
            featured_section: featuredSection,
            recommendations_count: recommendationsCount,
            creator_mode: creatorMode,
            newsletter,
            bio_analysis: bioAnalysis,
            screenshotUrl: ''
        } as any,
        errors: isBlocked ? ['BLOCKED: LinkedIn Authwall / Rate Limit'] : []
    };

    return [scrapedItem];
}

export function validate(data: Record<string, unknown>): boolean {
    return !!data && typeof data.fullName === 'string';
}

export function detectBlock(responseBody: string): boolean {
    const bodyLower = responseBody.toLowerCase();
    // Only block if we see explicit auth wall, login screens, or HTTP 999.
    // Ensure standard navbar sign in doesn't cause false positives.
    if (bodyLower.includes('followers') || bodyLower.includes('about') || bodyLower.includes('experience')) return false;
    return (
        bodyLower.includes('authwall') ||
        bodyLower.includes('too many requests') ||
        bodyLower.includes('join linkedin') ||
        bodyLower.includes('security check') ||
        responseBody.includes('HTTP 999')
    );
}

const linkedinHandler: PlaywrightHandler = {
    crawlerType: 'playwright',
    handle,
    validate,
    detectBlock
};

export default linkedinHandler;
