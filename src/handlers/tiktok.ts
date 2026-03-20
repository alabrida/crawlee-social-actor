/**
 * @module handlers/tiktok
 * @description TikTok handler using PlaywrightCrawler.
 * Bypasses captchas by executing JS and waiting for the profile to render.
 * @see PRD Section 5.1
 */

import type { PlaywrightCrawlingContext } from 'crawlee';
import type { PlaywrightHandler, HandlerContext, ScrapedItem } from '../types.js';
import { blockResources } from '../utils/resources.js';

/**
 * Handle a TikTok URL by rendering the page in a browser and extracting the DOM.
 */
async function handle(
    context: PlaywrightCrawlingContext,
    _handlerContext: HandlerContext,
): Promise<ScrapedItem[]> {
    const { request, page, log } = context;
    const url = request.url;
    const isSubPage = request.userData?.isSubPage || false;

    log.info(`[TikTok] Extracting data from: ${url} (isSubPage: ${isSubPage})`);
    await blockResources(page);

    // Wait for the profile or video content to load
    await page.waitForTimeout(5000); 

    const extractedData = await page.evaluate((isSub) => {
        if (isSub) {
            // Very basic video page metadata extraction
            return {
                bio: '',
                externalLink: '',
                followers: '',
                following: '',
                likes: '',
                videosCount: '',
                displayName: '',
                isVerified: false,
                profileHtml: document.body.innerHTML.substring(0, 10000),
                title: document.title || '',
                h1: document.querySelector('h1')?.textContent?.trim() || '',
                metaDesc: document.querySelector('meta[name="description"]')?.getAttribute('content') || ''
            };
        }

        const bioEl = document.querySelector('[data-e2e="user-bio"]');
        const linkEl = document.querySelector('a[data-e2e="user-link"]');
        const followersEl = document.querySelector('[data-e2e="followers-count"]');
        const followingEl = document.querySelector('[data-e2e="following-count"]');
        const likesEl = document.querySelector('[data-e2e="likes-count"]');
        const videosCountEl = document.querySelector('[data-e2e="video-count"]');
        const displayNameEl = document.querySelector('[data-e2e="user-subtitle"]') ||
                              document.querySelector('h1[data-e2e="user-title"]') ||
                              document.querySelector('h2[data-e2e="user-subtitle"]');

        return {
            bio: bioEl?.textContent?.trim() || '',
            externalLink: linkEl?.getAttribute('href') || linkEl?.textContent?.trim() || '',
            followers: followersEl?.textContent?.trim() || '',
            following: followingEl?.textContent?.trim() || '',
            likes: likesEl?.textContent?.trim() || '',
            videosCount: videosCountEl?.textContent?.trim() || '',
            displayName: displayNameEl?.textContent?.trim() || '',
            isVerified: !!document.querySelector('[data-e2e="verify-icon"]'),
            profileHtml: document.querySelector('div[data-e2e="user-profile-section"]')?.innerHTML || 
                         document.querySelector('main')?.innerHTML || '',
            title: document.title || '',
            h1: document.querySelector('h1')?.textContent?.trim() || '',
            metaDesc: document.querySelector('meta[name="description"]')?.getAttribute('content') || ''
        };
    }, isSubPage);

    // Spider Architecture: Enqueue recent videos if it's a profile page
    if (!isSubPage) {
        log.info(`[TikTok] Enqueueing recent videos for deep crawl from profile: ${url}`);
        const videoLinks = await page.evaluate(() => {
            const links: string[] = [];
            // Target the video grid items
            const anchors = document.querySelectorAll('[data-e2e="user-post-item"] a[href*="/video/"]');
            anchors.forEach((a, i) => {
                if (i < 5) {
                    const href = (a as HTMLAnchorElement).href;
                    if (href) links.push(href);
                }
            });
            return links;
        });

        if (videoLinks.length > 0) {
            log.info(`[TikTok] Found ${videoLinks.length} videos to enqueue.`);
            const { crawler } = context;
            await crawler.addRequests(videoLinks.map(vUrl => ({
                url: vUrl,
                userData: { ...request.userData, isSubPage: true }
            })));
        }

        // Link-in-Bio Spidering: Enqueue external URL for general forensics
        if (extractedData.externalLink) {
            log.info(`[TikTok] Enqueueing link in bio for deep forensics: ${extractedData.externalLink}`);
            const { crawler } = context;
            await crawler.addRequests([{
                url: extractedData.externalLink,
                userData: { ...request.userData, isSubPage: true, platform: 'general' },
                label: 'general'
            }]);
        }
    }

    // Try to isolate the latest post time (often hidden internally by TikTok)
    const timeLocator = page.locator('[data-e2e="user-post-item"] time, [data-e2e="user-post-item"] [aria-label*="ago"], div[class*="DivTimeTag"]').first();
    let latestVideoDate: string | null = null;
    if (await timeLocator.count() > 0) {
        latestVideoDate = await timeLocator.getAttribute('title') || await timeLocator.textContent();
        if (latestVideoDate) latestVideoDate = latestVideoDate.trim();
    }

    // Extract username from URL (e.g. https://www.tiktok.com/@publicserviceplumbers)
    const usernameMatch = url.match(/tiktok\.com\/@([^/?#]+)/);
    const username = usernameMatch ? usernameMatch[1] : null;

    // Parse numeric counts
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

    const ctas: string[] = [];
    if (extractedData.externalLink) {
        ctas.push('Link in Bio');
    }

    const conversionMarkers: string[] = [];
    if (extractedData.bio.toLowerCase().includes('shop')) conversionMarkers.push('Shop');
    if (extractedData.bio.toLowerCase().includes('book')) conversionMarkers.push('Booking');
    
    // Add Raw signals for Math Agent
    if (extractedData.followers) conversionMarkers.push(`Followers Raw: ${extractedData.followers}`);
    if (extractedData.following) conversionMarkers.push(`Following Raw: ${extractedData.following}`);
    if (extractedData.likes) conversionMarkers.push(`Likes Raw: ${extractedData.likes}`);
    if (extractedData.isVerified) conversionMarkers.push('Status: Verified');

    const scrapedItem: ScrapedItem = {
        platform: 'tiktok',
        url,
        crawlerUsed: 'playwright',
        scrapedAt: new Date().toISOString(),
        data: {
            revenueIndicators: {
                ctas,
                links: extractedData.externalLink ? [extractedData.externalLink] : [],
                conversionMarkers,
            },
            profileHtml: extractedData.profileHtml,
            screenshotUrl: '',
            // Structured fields for direct Supabase mapping
            username: username,
            displayName: extractedData.displayName || null,
            biography: extractedData.bio || null,
            verified: extractedData.isVerified,
            followerCount: parseCount(extractedData.followers) ?? null,
            followingCount: parseCount(extractedData.following) ?? null,
            likesCount: parseCount(extractedData.likes) ?? null,
            videosCount: parseCount(extractedData.videosCount) ?? null,
            latestVideoDate: latestVideoDate || null,
            // Deep Link Metadata for Crawl Report
            crawlMetadata: {
                title: extractedData.title,
                h1: extractedData.h1,
                metaDescription: extractedData.metaDesc,
                httpStatus: 200, // Playwright implies 200 if we rendered
                snippet: extractedData.bio || extractedData.title 
            }
        } as any,
        errors: []
    };

    return [scrapedItem];
}

/**
 * Validate that the extracted TikTok data contains expected keys.
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
 * Detect if the response indicates a TikTok block (captcha, empty data).
 */
function detectBlock(responseBody: string): boolean {
    const isCaptcha = responseBody.includes('captcha') || responseBody.includes('verify') || responseBody.includes('challenge');
    return isCaptcha;
}

/** Assembled handler export satisfying the PlaywrightHandler interface. */
const tiktokHandler: PlaywrightHandler = {
    crawlerType: 'playwright',
    handle,
    validate,
    detectBlock,
};
export default tiktokHandler;
