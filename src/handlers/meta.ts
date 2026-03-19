import type { PlaywrightCrawlingContext } from 'crawlee';
import { blockResources } from '../utils/resources.js';
import type { PlaywrightHandler, HandlerContext, ScrapedItem, Platform } from '../types.js';
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
    const platform = (request.userData?.platform as Platform) || 
        (request.url.includes('facebook.com') || request.url.includes('fb.com') ? 'facebook' : 'instagram');

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

    // Extract username from URL
    let username: string | null = null;
    if (platform === 'instagram') {
        const match = request.url.match(/instagram\.com\/([^/?#]+)/);
        if (match && match[1] !== 'accounts') username = match[1];
    } else {
        const match = request.url.match(/facebook\.com\/([^/?#]+)/);
        if (match && !['pages', 'profile.php', 'groups'].includes(match[1])) username = match[1];
    }

    // Initialize structured data fields
    let fullName: string | null = null;
    let biography: string | null = null;
    let externalUrl: string | null = null;
    let verified = false;
    let isPrivate = false;
    let followerCount = 0;
    let followingCount = 0;
    let postsCount = 0;
    let pageName: string | null = null;
    let category: string | null = null;
    let likesCount = 0;
    let hasReviews = false;

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
            profileHtml: '', // Placeholder, will set full content later
            screenshotUrl: '',
        },
        errors: []
    };

    // Skip extraction if blocked to avoid timeouts on missing elements
    if (!isBlocked) {
        if (platform === 'instagram') {
            try {
                const bioLinkLocator = page.locator('header section a[target="_blank"]').first();
                if (await bioLinkLocator.count() > 0) {
                    const bioLink = await bioLinkLocator.getAttribute('href');
                    if (bioLink) {
                        links.push(bioLink);
                        externalUrl = bioLink;
                    }
                }
                
                const nameLocator = page.locator('header section h1, header section > div:first-child h2').first();
                if (await nameLocator.count() > 0) {
                    const nameText = await nameLocator.textContent();
                    if (nameText) {
                        fullName = nameText.trim();
                        conversionMarkers.push(`Name: ${fullName}`);
                    }
                }

                // Biography
                const bioLocator = page.locator('header section div.-vDIg span, header section > div > span').first();
                if (await bioLocator.count() > 0) {
                    const bioText = await bioLocator.textContent();
                    if (bioText && bioText.trim().length > 2) {
                        biography = bioText.trim();
                    }
                }

                // Posts count (first metric in the stats row)
                const postsText = await page.locator('header section ul li:nth-child(1) span').first().textContent().catch(() => null);
                if (postsText) {
                    const num = parseInt(postsText.replace(/,/g, ''), 10);
                    if (!isNaN(num)) postsCount = num;
                }

                // Followers count
                const followerText = await page.locator('header section ul li:nth-child(2) span').first().getAttribute('title').catch(() => null);
                if (followerText) {
                    conversionMarkers.push(`Followers Raw: ${followerText}`);
                    const num = parseInt(followerText.replace(/,/g, ''), 10);
                    if (!isNaN(num)) followerCount = num;
                }
                
                // Following count
                const followingText = await page.locator('header section ul li:nth-child(3) span').first().textContent().catch(() => null);
                if (followingText) {
                    conversionMarkers.push(`Following Raw: ${followingText}`);
                    const num = parseInt(followingText.replace(/,/g, ''), 10);
                    if (!isNaN(num)) followingCount = num;
                }

                // Verified
                const isVerified = await page.locator('header section span[title="Verified"], header section svg[aria-label="Verified"]').count() > 0;
                if (isVerified) {
                    conversionMarkers.push('Status: Verified');
                    verified = true;
                }

                // Private account
                const privateText = await page.content();
                if (privateText.toLowerCase().includes('this account is private')) {
                    isPrivate = true;
                }

            } catch (e) {
                log.debug('[Meta] Instagram extraction failed on some elements', { url: request.url });
            }
        } else {
            // Facebook extraction
            try {
                const introLocator = page.locator('[role="main"] div').first();
                if (await introLocator.count() > 0) {
                    const introText = await introLocator.textContent();
                    if (introText) {
                        const trimmedIntro = introText.trim();
                        conversionMarkers.push(`Intro detected: ${trimmedIntro.substring(0, 50)}...`);
                    }
                }

                // Page name from title
                const title = await page.title();
                if (title) {
                    pageName = title.split('|')[0].split('-')[0].trim();
                    fullName = pageName;
                }

                // Category
                const categoryLocator = page.locator('[role="main"] a[href*="category"], [role="main"] span:has-text("·")').first();
                if (await categoryLocator.count() > 0) {
                    const catText = await categoryLocator.textContent();
                    if (catText && catText.trim().length < 50) {
                        category = catText.trim().replace(/^·\s*/, '');
                    }
                }

                // Followers count
                const followersLink = page.locator('a[href*="followers"]').first();
                if (await followersLink.count() > 0) {
                    const followersText = await followersLink.textContent();
                    if (followersText) {
                        const trimmedFollowers = followersText.trim();
                        conversionMarkers.push(`Followers Raw: ${trimmedFollowers}`);
                        const numMatch = trimmedFollowers.match(/([\d,.]+)/);
                        if (numMatch) {
                            let numStr = numMatch[1].replace(/,/g, '');
                            let num = parseFloat(numStr);
                            if (trimmedFollowers.toLowerCase().includes('k')) num *= 1000;
                            if (trimmedFollowers.toLowerCase().includes('m')) num *= 1000000;
                            followerCount = Math.floor(num);
                        }
                    }
                }

                // Likes count
                const likesLink = page.locator('a[href*="likes"], a[href*="followers"] + a').first();
                if (await likesLink.count() > 0) {
                    const likesText = await likesLink.textContent();
                    if (likesText) {
                        const numMatch = likesText.match(/([\d,.]+)/);
                        if (numMatch) {
                            let numStr = numMatch[1].replace(/,/g, '');
                            let num = parseFloat(numStr);
                            if (likesText.toLowerCase().includes('k')) num *= 1000;
                            if (likesText.toLowerCase().includes('m')) num *= 1000000;
                            likesCount = Math.floor(num);
                        }
                    }
                }

                // Reviews detection
                const reviewsLocator = page.locator('a[href*="reviews"]').first();
                if (await reviewsLocator.count() > 0) {
                    hasReviews = true;
                }

            } catch (e) {
                log.debug('[Meta] Facebook extraction failed on some elements', { url: request.url });
            }
        }
    } else {
        conversionMarkers.push('BLOCKED: Login Wall / Anti-Bot');
    }

    // Attach structured data fields
    const data = scrapedItem.data as any;
    data.username = username;
    data.fullName = fullName;
    data.biography = biography;
    data.verified = verified;
    data.followerCount = followerCount;
    data.followingCount = followingCount;

    if (platform === 'instagram') {
        data.externalUrl = externalUrl;
        data.postsCount = postsCount;
        data.isPrivate = isPrivate;
    } else {
        data.pageName = pageName;
        data.category = category;
        data.likesCount = likesCount;
        data.hasReviews = hasReviews;
    }

    scrapedItem.data.profileHtml = await page.content();
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
