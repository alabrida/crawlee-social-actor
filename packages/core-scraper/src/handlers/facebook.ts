/**
 * @module handlers/facebook
 * @description Facebook page handler. Graph API primary with browser fallback.
 */

import type { PlaywrightCrawlingContext } from 'crawlee';
import type { PlaywrightHandler, HandlerContext, ScrapedItem } from '../types.js';
import { fetchFacebookPage } from '../api/facebook.js';
import { blockResources } from '../utils/resources.js';
import { parseCount } from '../utils/parse-count.js';
import { analyzeBio } from '../utils/bio-analyzer.js';
import { officialApisEnabled } from '../utils/mode-gate.js';

export async function handle(
    context: PlaywrightCrawlingContext,
    _handlerContext: HandlerContext
): Promise<ScrapedItem[]> {
    const { page, request, log } = context;
    const url = request.url;

    log.info(`[Facebook] Commencing extraction for: ${url}`);

    // Parse username/vanity ID from URL
    const match = url.match(/facebook\.com\/([^/?#]+)/);
    let username = 'facebook';
    if (match && !['pages', 'profile.php', 'groups'].includes(match[1])) {
        username = match[1];
    }

    let apiData = null;
    // Attempt Graph API primary (only when official APIs are enabled and approved)
    if (officialApisEnabled() && process.env.FACEBOOK_ACCESS_TOKEN) {
        log.info(`[Facebook] Running Graph API query for: ${username}`);
        apiData = await fetchFacebookPage(username);
    }

    let fullName: string | null = null;
    let biography: string | null = null;
    let category: string | null = null;
    let followerCount: number | null = null;
    let likesCount: number | null = null;
    let verified = false;
    let rating: number | null = null;
    let reviewsCount: number | null = null;
    let hasReviews = false;
    let ctaButtonType: string | null = null;
    let isBlocked = false;
    let isPersonalProfile = false;

    if (apiData) {
        fullName = apiData.name;
        biography = apiData.about;
        category = apiData.category;
        followerCount = apiData.fanCount;
        verified = apiData.verificationStatus === 'blue_verified';
        rating = apiData.overallStarRating;
        reviewsCount = apiData.ratingCount;
        hasReviews = reviewsCount !== null && reviewsCount > 0;
        log.info('[Facebook] Graph API extraction successful.');
    } else {
        // Browser fallback
        log.info('[Facebook] Running Playwright browser fallback...');
        await blockResources(page, ['media', 'font'], ['image']);
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForTimeout(4000);

        const content = await page.content();
        isBlocked = detectBlock(content);

        if (!isBlocked) {
            isPersonalProfile = url.includes('/profile.php') || url.includes('/people/') || content.toLowerCase().includes('add friend') || content.toLowerCase().includes('mutual friends');
            try {
                // Page Name
                const title = await page.title().catch(() => '');
                if (title) fullName = title.split('|')[0].split('-')[0].trim();

                // Category
                const catElement = page.locator('[role="main"] a[href*="category"], [role="main"] span:has-text("·")').first();
                if (await catElement.count() > 0) {
                    const txt = await catElement.textContent();
                    if (txt) category = txt.trim().replace(/^·\s*/, '');
                }

                // Followers
                const followersLink = page.locator('a[href*="followers"]').first();
                if (await followersLink.count() > 0) {
                    const txt = await followersLink.textContent();
                    followerCount = parseCount(txt);
                }

                // Likes
                const likesLink = page.locator('a[href*="likes"]').first();
                if (await likesLink.count() > 0) {
                    const txt = await likesLink.textContent();
                    likesCount = parseCount(txt);
                }

                // Robust fallback: FB pages embed counts in the description meta, e.g.
                // "1,234,567 likes · 12,345 talking about this · 678 were here". Passive read.
                if (likesCount === null || followerCount === null) {
                    const og = (await page.locator('meta[property="og:description"]').first().getAttribute('content').catch(() => null))
                        || (await page.locator('meta[name="description"]').first().getAttribute('content').catch(() => null))
                        || '';
                    const likesM = og.match(/([\d.,]+\s*[KMB]?)\s+likes/i);
                    const followM = og.match(/([\d.,]+\s*[KMB]?)\s+followers/i);
                    if (likesCount === null && likesM) likesCount = parseCount(likesM[1]);
                    if (followerCount === null && followM) followerCount = parseCount(followM[1]);
                }

                // Ratings & Reviews
                const reviewsLocator = page.locator('a[href*="reviews"]').first();
                if (await reviewsLocator.count() > 0) {
                    const txt = await reviewsLocator.textContent();
                    reviewsCount = parseCount(txt);
                    hasReviews = true;
                }

                const ratingElement = page.locator('[role="main"] span').filter({ hasText: /^\d[\.,]\d$/ }).first();
                if (await ratingElement.count() > 0) {
                    const ratingText = await ratingElement.textContent();
                    if (ratingText) {
                        rating = parseFloat(ratingText.trim().replace(',', '.'));
                        hasReviews = true;
                    }
                }

                // CTA Button (Book, Contact, Sign Up etc)
                const ctaBtn = page.locator('[role="main"] [aria-label*="Book"], [role="main"] [aria-label*="Shop"], [role="main"] [aria-label*="Contact"], [role="main"] [aria-label*="Sign Up"]').first();
                if (await ctaBtn.count() > 0) {
                    const label = await ctaBtn.getAttribute('aria-label');
                    ctaButtonType = label ? label.trim() : 'Active CTA';
                }

                // Verified status
                verified = await page.locator('header [title="Verified"], header [aria-label="Verified"]').count() > 0;

                // About/Biography
                const aboutText = await page.locator('[role="main"] span').filter({ hasText: /Page · / }).first().textContent().catch(() => null);
                if (aboutText) biography = aboutText.trim();
            } catch (e) {
                log.warning('[Facebook] Browser extraction encountered errors.');
            }
        } else {
            log.warning('[Facebook] Blocked by login wall / anti-bot.');
        }
    }

    const bioAnalysis = analyzeBio(biography);

    const scrapedItem: ScrapedItem = {
        platform: 'facebook',
        url,
        crawlerUsed: apiData ? 'cheerio' : 'playwright',
        scrapedAt: new Date().toISOString(),
        data: {
            username,
            isPersonalProfile,
            fullName,
            biography,
            category,
            followerCount,
            likesCount,
            verified,
            rating,
            reviewsCount,
            hasReviews,
            ctaButtonType,
            bio_analysis: bioAnalysis,
            screenshotUrl: ''
        } as any,
        errors: isBlocked ? ['BLOCKED: WAF / Login Wall'] : []
    };

    return [scrapedItem];
}

export function validate(data: Record<string, unknown>): boolean {
    return !!data && typeof data.username === 'string';
}

export function detectBlock(responseBody: string): boolean {
    const lower = responseBody.toLowerCase();
    if (lower.includes('followers') || lower.includes('about') || lower.includes('photos')) return false;
    return lower.includes('login_form') || lower.includes('ident_login') || lower.includes('checkpoint');
}

const facebookHandler: PlaywrightHandler = {
    crawlerType: 'playwright',
    handle,
    validate,
    detectBlock
};

export default facebookHandler;
