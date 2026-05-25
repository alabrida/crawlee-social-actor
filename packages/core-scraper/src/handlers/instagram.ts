/**
 * @module handlers/instagram
 * @description Instagram profile handler. Single-page browser-optimized extraction.
 */

import type { PlaywrightCrawlingContext } from 'crawlee';
import type { PlaywrightHandler, HandlerContext, ScrapedItem } from '../types.js';
import { blockResources } from '../utils/resources.js';
import { parseCount } from '../utils/parse-count.js';
import { analyzeBio } from '../utils/bio-analyzer.js';

export async function handle(
    context: PlaywrightCrawlingContext,
    _handlerContext: HandlerContext
): Promise<ScrapedItem[]> {
    const { page, request, log } = context;
    const url = request.url;

    log.info(`[Instagram] Extracting profile: ${url}`);

    // G-COST-02: Block heavy resources but keep images for visual layout/screenshot
    await blockResources(page, ['media', 'font'], ['image']);

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // Dismiss common login dialogs/overlays that block the view
    try {
        const dismissSelectors = [
            '[role="dialog"] [aria-label="Close"]',
            '[role="dialog"] [aria-label="Not Now"]',
            'div[role="dialog"] button:has-text("Not Now")',
            'div[role="dialog"] i.x10l6tqk'
        ];
        for (const selector of dismissSelectors) {
            const btn = page.locator(selector).first();
            if (await btn.isVisible({ timeout: 1500 })) {
                await btn.click();
                await page.waitForTimeout(500);
            }
        }
    } catch (e) {
        // Ignore dismiss failures
    }

    await page.waitForTimeout(2000);

    const content = await page.content();
    const isBlocked = detectBlock(content);

    let username: string | null = null;
    const match = url.match(/instagram\.com\/([^/?#]+)/);
    if (match && match[1] !== 'accounts') {
        username = match[1];
    }

    let fullName: string | null = null;
    let biography: string | null = null;
    let externalUrl: string | null = null;
    let verified = false;
    let isPrivate = false;
    let followerCount: number | null = null;
    let followingCount: number | null = null;
    let postsCount: number | null = null;
    let latestPostDate: string | null = null;
    let hasShop = false;

    if (!isBlocked) {
        try {
            // Full name
            const nameLocator = page.locator('header section h1, header section > div:first-child h2').first();
            if (await nameLocator.count() > 0) {
                const nameText = await nameLocator.textContent();
                if (nameText) fullName = nameText.trim();
            }

            // External bio link
            const bioLinkLocator = page.locator('header section a[target="_blank"], header section a[role="link"], a.x1i10hfl[target="_blank"]').filter({ hasNotText: 'followers' }).filter({ hasNotText: 'following' }).last();
            if (await bioLinkLocator.count() > 0) {
                const bioLink = await bioLinkLocator.getAttribute('href');
                if (bioLink && bioLink.startsWith('http')) {
                    externalUrl = bioLink;
                    if (bioLink.includes('l.instagram.com/?u=')) {
                        try {
                            const urlObj = new URL(bioLink);
                            const uParam = urlObj.searchParams.get('u');
                            if (uParam) externalUrl = decodeURIComponent(uParam);
                        } catch (e) {}
                    }
                }
            }

            // Biography
            const bioLocator = page.locator('header section div.-vDIg span, header section > div > span, header + div span, main header span').first();
            if (await bioLocator.count() > 0) {
                const bioText = await bioLocator.textContent();
                if (bioText) biography = bioText.trim();
            }

            // Fallback bio from meta
            if (!biography) {
                const metaDesc = await page.locator('meta[name="description"]').first().getAttribute('content').catch(() => '');
                if (metaDesc) {
                    const cleanDesc = metaDesc.replace(/[\d.,]+ Followers, [\d.,]+ Following, [\d.,]+ Posts - See Instagram photos and videos from .*? - /, '').trim();
                    if (cleanDesc.length > 5) biography = cleanDesc;
                }
            }

            // Stats
            const postsText = await page.locator('header section ul li:nth-child(1) span').first().textContent().catch(() => null);
            if (postsText) postsCount = parseCount(postsText);

            let followerText = await page.locator('header section ul li:nth-child(2) span').first().getAttribute('title').catch(() => null);
            if (!followerText) {
                followerText = await page.locator('header section ul li:nth-child(2) span').first().textContent().catch(() => null);
            }
            if (followerText) followerCount = parseCount(followerText);

            const followingText = await page.locator('header section ul li:nth-child(3) span').first().textContent().catch(() => null);
            if (followingText) followingCount = parseCount(followingText);

            // Verified
            verified = await page.locator('header section span[title="Verified"], header section svg[aria-label="Verified"]').count() > 0;

            // Private check
            if (content.toLowerCase().includes('this account is private')) {
                isPrivate = true;
            }

            // Shop / commerce tab presence check
            hasShop = content.toLowerCase().includes('view shop') || content.toLowerCase().includes('shop tab') || await page.locator('a[href*="/shop/"]').count() > 0;

            // Latest post date (from grid)
            const firstGridImage = page.locator('article a[href^="/p/"] img, article a[href^="/reel/"] img').first();
            if (await firstGridImage.count() > 0) {
                const altText = await firstGridImage.getAttribute('alt');
                if (altText) {
                    const dateMatch = altText.match(/on ([a-zA-Z]+ \d{1,2}, \d{4})/i);
                    if (dateMatch) {
                        const dateObj = new Date(dateMatch[1]);
                        if (!isNaN(dateObj.getTime())) latestPostDate = dateObj.toISOString();
                    }
                }
            }

            if (!latestPostDate) {
                const timeTag = page.locator('time').first();
                if (await timeTag.count() > 0) {
                    const datetime = await timeTag.getAttribute('datetime');
                    if (datetime) latestPostDate = new Date(datetime).toISOString();
                }
            }
        } catch (e) {
            log.warning('[Instagram] Element extraction encountered errors.');
        }
    } else {
        log.warning('[Instagram] Blocked by login wall.');
    }

    const bioAnalysis = analyzeBio(biography);

    const scrapedItem: ScrapedItem = {
        platform: 'instagram',
        url,
        crawlerUsed: 'playwright',
        scrapedAt: new Date().toISOString(),
        data: {
            username,
            fullName,
            biography,
            externalUrl,
            verified,
            isPrivate,
            followerCount,
            followingCount,
            postsCount,
            latestPostDate,
            hasShop,
            bio_analysis: bioAnalysis,
            screenshotUrl: ''
        } as any,
        errors: isBlocked ? ['BLOCKED: Instagram Login Wall'] : []
    };

    return [scrapedItem];
}

export function validate(data: Record<string, unknown>): boolean {
    return !!data && typeof data.username === 'string';
}

export function detectBlock(responseBody: string): boolean {
    const lower = responseBody.toLowerCase();
    if (lower.includes('followers') || lower.includes('posts') || lower.includes('following')) return false;
    return lower.includes('login_form') || lower.includes('checkpoint') || lower.includes('instagram.com/accounts/login');
}

const instagramHandler: PlaywrightHandler = {
    crawlerType: 'playwright',
    handle,
    validate,
    detectBlock
};

export default instagramHandler;
