/**
 * @module handlers/pinterest
 * @description Pinterest profile handler. Uses __PWS_INITIAL_PROPS__ JSON parsing.
 */

import type { PlaywrightCrawlingContext } from 'crawlee';
import type { PlaywrightHandler, HandlerContext, ScrapedItem } from '../types.js';
import { blockResources } from '../utils/resources.js';
import { analyzeBio } from '../utils/bio-analyzer.js';

export async function handle(
    context: PlaywrightCrawlingContext,
    _handlerContext: HandlerContext
): Promise<ScrapedItem[]> {
    const { page, request, log } = context;
    const url = request.url;

    log.info(`[Pinterest] Starting extraction for: ${url}`);

    await blockResources(page, ['image', 'media', 'font']);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(2000);

    const scriptSelector = 'script[id="__PWS_INITIAL_PROPS__"]';
    const jsonText = await page.locator(scriptSelector).innerText().catch(() => '');

    let title = await page.title().catch(() => 'Pinterest Profile');
    let h1 = '';
    let metaDescription = '';
    let followerCount: number | null = null;
    let followingCount: number | null = null;
    let pinsCount: number | null = null;
    let boardsCount: number | null = null;
    let monthlyViews: number | null = null;
    let fullName: string | null = null;
    let websiteUrl: string | null = null;

    if (jsonText) {
        try {
            const jsonData = JSON.parse(jsonText);
            const initialProps = jsonData?.initialReduxState;
            const users = initialProps?.users || {};

            const urlPath = new URL(url).pathname;
            const slug = urlPath.split('/').filter(Boolean).pop()?.toLowerCase();

            // STRICT slug match only. Do NOT fall back to users[0]: when the scrape session is
            // logged in, initialReduxState.users holds the VIEWER (operator), not the viewed
            // profile, and users[0] would silently emit the operator's account data. If the slug
            // user isn't present (logged-in case), leave fields null — Pinterest must be scraped
            // logged-out (see runner: no cookie injected) so the viewed profile is in initial props.
            const userKey = Object.keys(users).find(k => {
                const u = users[k];
                if (!u) return false;
                return slug && u.username?.toLowerCase() === slug;
            });

            const userData = userKey ? users[userKey] : null;
            if (!userData && Object.keys(users).length > 0) {
                log.warning(`[Pinterest] Viewed profile "${slug}" not in initial props (likely a logged-in session). Skipping JSON user data to avoid emitting the wrong account.`);
            }

            if (userData) {
                h1 = userData.full_name || '';
                fullName = userData.full_name || null;
                metaDescription = userData.about || '';
                websiteUrl = userData.website_url || null;
                followerCount = userData.follower_count ?? null;
                followingCount = userData.following_count ?? null;
                pinsCount = userData.pin_count ?? null;
                boardsCount = userData.board_count ?? null;
                monthlyViews = userData.impression_count ?? null;
            }
        } catch (e) {
            log.warning('[Pinterest] JSON initial props parsing failed.');
        }
    }

    // DOM fallbacks
    if (!fullName) {
        h1 = await page.locator('h1').first().innerText().catch(() => '');
        fullName = h1 || null;
    }
    if (!metaDescription) {
        metaDescription = (await page.locator('meta[name="description"]').getAttribute('content').catch(() => '')) || '';
    }

    const ctas: string[] = [];
    if (websiteUrl) ctas.push('Website');

    const conversionMarkers: string[] = [];
    if (followerCount) conversionMarkers.push(`Followers: ${followerCount}`);
    if (monthlyViews) conversionMarkers.push(`Impression Count: ${monthlyViews}`);

    const bioAnalysis = analyzeBio(metaDescription);

    const scrapedItem: ScrapedItem = {
        platform: 'pinterest',
        url,
        crawlerUsed: 'playwright',
        scrapedAt: new Date().toISOString(),
        data: {
            username: url.split('/').filter(Boolean).pop(),
            fullName,
            followerCount,
            followers: followerCount,
            followingCount,
            pinsCount,
            boardsCount,
            monthlyViews,
            websiteUrl,
            bio_analysis: bioAnalysis,
            revenueIndicators: {
                ctas,
                links: websiteUrl ? [websiteUrl] : [],
                conversionMarkers
            },
            screenshotUrl: '',
            crawlMetadata: {
                title,
                h1,
                metaDescription,
                httpStatus: 200,
                snippet: metaDescription || title
            }
        } as any,
        errors: []
    };

    return [scrapedItem];
}

export function validate(data: Record<string, unknown>): boolean {
    return !!data && typeof data.username === 'string';
}

export function detectBlock(responseBody: string): boolean {
    const lower = responseBody.toLowerCase();
    return lower.includes('unusual traffic') || lower.includes('captcha');
}

const pinterestHandler: PlaywrightHandler = {
    crawlerType: 'playwright',
    handle,
    validate,
    detectBlock
};

export default pinterestHandler;
