/**
 * @module handlers/youtube
 * @description YouTube channel handler. API-first (v3) with browser fallback.
 */

import type { PlaywrightCrawlingContext } from 'crawlee';
import type { PlaywrightHandler, HandlerContext, ScrapedItem } from '../types.js';
import { fetchYoutubeChannel } from '../api/youtube.js';
import { blockResources } from '../utils/resources.js';
import { parseCount } from '../utils/parse-count.js';
import { analyzeBio } from '../utils/bio-analyzer.js';

export async function handle(
    context: PlaywrightCrawlingContext,
    _handlerContext: HandlerContext
): Promise<ScrapedItem[]> {
    const { page, request, log } = context;
    const url = request.url;

    log.info(`[YouTube] Starting extraction for: ${url}`);

    // Parse channel handle or ID from URL
    const handleMatch = url.match(/youtube\.com\/@([^/?#]+)/);
    const idMatch = url.match(/youtube\.com\/channel\/([^/?#]+)/);
    const identifier = handleMatch ? `@${handleMatch[1]}` : (idMatch ? idMatch[1] : null);

    let apiData = null;
    if (identifier && process.env.GOOGLE_CLOUD_API_KEY) {
        log.info(`[YouTube] Running Data API v3 query for: ${identifier}`);
        apiData = await fetchYoutubeChannel(identifier);
    }

    let channelName: string | null = null;
    let description: string | null = null;
    let subscribersCount: number | null = null;
    let videoCount: number | null = null;
    let viewsCount: number | null = null;
    let verified = false;
    let latestVideoDate: string | null = null;
    let hasMembership = false;
    let playlistCount = 0;
    let contentTabs: string[] = ['videos'];
    let isBlocked = false;

    if (apiData) {
        channelName = apiData.title;
        description = apiData.description;
        subscribersCount = apiData.subscriberCount;
        videoCount = apiData.videoCount;
        viewsCount = apiData.viewCount;
        verified = true; // API fetched successfully implies valid verified/known profile
        if (apiData.recentVideos && apiData.recentVideos.length > 0) {
            latestVideoDate = apiData.recentVideos[0].publishedAt;
        }
        log.info('[YouTube] Data API extraction successful.');
    } else {
        // Browser fallback
        log.info('[YouTube] Running Playwright browser fallback...');
        await blockResources(page, ['media', 'font'], ['image']);
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForTimeout(3000);

        const content = await page.content();
        isBlocked = detectBlock(content);

        if (!isBlocked) {
            try {
                // Channel Name
                const title = await page.title().catch(() => '');
                channelName = title.replace(/ - YouTube$/i, '').trim();

                // Subscribers
                const subEl = page.locator('#subscriber-count, yt-formatted-string[aria-label*="subscribers"]').first();
                if (await subEl.count() > 0) {
                    const txt = await subEl.textContent();
                    subscribersCount = parseCount(txt);
                }

                // Videos
                const vidEl = page.locator('#videos-count, yt-formatted-string[aria-label*="videos"]').first();
                if (await vidEl.count() > 0) {
                    const txt = await vidEl.textContent();
                    videoCount = parseCount(txt);
                }

                // Description / Bio
                const descEl = page.locator('meta[name="description"]').first();
                if (await descEl.count() > 0) {
                    description = await descEl.getAttribute('content');
                }

                // Verified
                verified = await page.locator('ytd-channel-name yt-icon[aria-label="Verified"]').first().isVisible();

                // Membership/Join button check
                hasMembership = await page.locator('ytd-button-renderer:has-text("Join")').first().isVisible();

                // Content tabs
                const tabs = await page.locator('tp-yt-paper-tab .tab-content').evaluateAll(els => 
                    els.map(el => el.textContent?.trim().toLowerCase() || '')
                );
                contentTabs = tabs.filter(Boolean);
            } catch (e) {
                log.warning('[YouTube] Browser extraction encountered errors.');
            }
        }
    }

    const bioAnalysis = analyzeBio(description);

    const scrapedItem: ScrapedItem = {
        platform: 'youtube',
        url,
        crawlerUsed: apiData ? 'cheerio' : 'playwright',
        scrapedAt: new Date().toISOString(),
        data: {
            channelName,
            description,
            subscribers: subscribersCount,
            followers: subscribersCount, // Aliasing for rubric calculation
            videoCount,
            viewsCount,
            verified,
            latestVideoDate,
            hasMembership,
            playlistCount,
            contentTabs,
            bio_analysis: bioAnalysis,
            screenshotUrl: ''
        } as any,
        errors: isBlocked ? ['BLOCKED: WAF / CAPTCHA'] : []
    };

    return [scrapedItem];
}

export function validate(data: Record<string, unknown>): boolean {
    return !!data && typeof data.channelName === 'string';
}

export function detectBlock(responseBody: string): boolean {
    const lower = responseBody.toLowerCase();
    return lower.includes('checking your browser') || lower.includes('google.com/recaptcha');
}

const youtubeHandler: PlaywrightHandler = {
    crawlerType: 'playwright',
    handle,
    validate,
    detectBlock
};

export default youtubeHandler;
