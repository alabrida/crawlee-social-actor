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
    let followerCount: number | null = null;
    let followingCount: number | null = null;
    let postsCount: number | null = null;
    let pageName: string | null = null;
    let category: string | null = null;
    let likesCount: number | null = null;
    let hasReviews = false;

    // Parse shorthand counts (e.g. "1.2K", "3M", "1,234")
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
                // External Link
                const bioLinkLocator = page.locator('header section a[target="_blank"], header section a[role="link"]').filter({ hasNotText: 'followers' }).filter({ hasNotText: 'following' }).last();
                if (await bioLinkLocator.count() > 0) {
                    const bioLink = await bioLinkLocator.getAttribute('href');
                    if (bioLink && bioLink.startsWith('http')) {
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
                    const parsed = parseCount(postsText);
                    if (parsed != null) postsCount = parsed;
                }

                // Followers count — try title attribute first, fall back to textContent
                let followerText = await page.locator('header section ul li:nth-child(2) span').first().getAttribute('title').catch(() => null);
                if (!followerText) {
                    followerText = await page.locator('header section ul li:nth-child(2) span').first().textContent().catch(() => null);
                }
                if (followerText) {
                    const trimmed = followerText.trim();
                    conversionMarkers.push(`Followers Raw: ${trimmed}`);
                    const parsed = parseCount(trimmed);
                    if (parsed != null) followerCount = parsed;
                }
                
                // Following count
                const followingText = await page.locator('header section ul li:nth-child(3) span').first().textContent().catch(() => null);
                if (followingText) {
                    const trimmed = followingText.trim();
                    conversionMarkers.push(`Following Raw: ${trimmed}`);
                    const parsed = parseCount(trimmed);
                    if (parsed != null) followingCount = parsed;
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

                // Latest Post Date (from first image alt text or time tag)
                let latestPostDate: string | null = null;
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
                    const timeTag = page.locator('article a[href^="/p/"] time, article a[href^="/reel/"] time').first();
                    if (await timeTag.count() > 0) {
                        const datetime = await timeTag.getAttribute('datetime');
                        if (datetime) latestPostDate = new Date(datetime).toISOString();
                    }
                }
                if (latestPostDate) {
                    (scrapedItem.data as any).latestPostDate = latestPostDate;
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

                // Reviews detection & count
                let facebookReviewsCount: number | null = null;
                const reviewsLocator = page.locator('a[href*="reviews"]').first();
                if (await reviewsLocator.count() > 0) {
                    hasReviews = true;
                    const reviewsText = await reviewsLocator.textContent();
                    if (reviewsText) {
                        // Match patterns like "123 reviews", "1,234 reviews", "1.2K reviews"
                        const countMatch = reviewsText.match(/([\d,.]+)\s*(?:K|k)?\s*(?:reviews?|ratings?)/i);
                        if (countMatch) {
                            let numStr = countMatch[1].replace(/,/g, '');
                            let num = parseFloat(numStr);
                            if (reviewsText.toLowerCase().includes('k')) num *= 1000;
                            if (!isNaN(num)) facebookReviewsCount = Math.floor(num);
                        }
                    }
                }
                if (facebookReviewsCount != null) {
                    (scrapedItem.data as any).facebookReviewsCount = facebookReviewsCount;
                }

                // Overall Rating (e.g. "4.5 out of 5")
                let facebookRating: number | null = null;
                const ratingLocator = page.locator('[role="main"] span').filter({ hasText: /^\d\.\d$/ }).first();
                if (await ratingLocator.count() > 0) {
                    const ratingText = await ratingLocator.textContent();
                    if (ratingText) {
                        const parsed = parseFloat(ratingText.trim());
                        if (!isNaN(parsed) && parsed >= 1 && parsed <= 5) facebookRating = parsed;
                    }
                }
                if (!facebookRating) {
                    // Fallback: look for "X.X out of 5" pattern in page text
                    const mainText = await page.locator('[role="main"]').first().textContent() || '';
                    const ratingMatch = mainText.match(/(\d\.\d)\s*(?:out of 5|\/\s*5)/i);
                    if (ratingMatch) {
                        const parsed = parseFloat(ratingMatch[1]);
                        if (!isNaN(parsed) && parsed >= 1 && parsed <= 5) facebookRating = parsed;
                    }
                }
                if (facebookRating) {
                    (scrapedItem.data as any).facebookRating = facebookRating;
                }

                // Check-ins
                let checkinsCount: number | null = null;
                const checkinLocator = page.locator('div, span').filter({ hasText: /people checked in here|check-ins/i }).first();
                if (await checkinLocator.count() > 0) {
                    const checkinText = await checkinLocator.textContent();
                    if (checkinText) {
                        const numMatch = checkinText.match(/([\d,.]+)/);
                        if (numMatch) {
                            let numStr = numMatch[1].replace(/,/g, '');
                            let num = parseFloat(numStr);
                            if (checkinText.toLowerCase().includes('k')) num *= 1000;
                            if (checkinText.toLowerCase().includes('m')) num *= 1000000;
                            checkinsCount = Math.floor(num);
                        }
                    }
                }

                // Posts count
                let postsCountFb: number | null = null;
                const postsLocator = page.locator('span').filter({ hasText: /^\d[\d,]*\s+posts$/i }).first();
                if (await postsLocator.isVisible()) {
                   const pt = await postsLocator.textContent();
                   if (pt) {
                       const parsed = parseCount(pt.replace(/posts/i, '').trim());
                       if (parsed != null) postsCountFb = parsed;
                   }
                }

                // Latest post date
                let latestPostDate: string | null = null;
                const firstPostTimer = page.locator('[role="feed"] div[data-ad-preview="message"] time, [role="feed"] a[role="link"][tabindex="0"] span[id] > span, [role="feed"] a:has(span > span[id])').first();
                if (await firstPostTimer.count() > 0) {
                    const ariaLabel = await firstPostTimer.getAttribute('aria-label') || await firstPostTimer.textContent();
                    if (ariaLabel && ariaLabel.length > 5) {
                        latestPostDate = ariaLabel.trim();
                    }
                }
                
                if (checkinsCount !== null) (scrapedItem.data as any).checkinsCount = checkinsCount;
                if (postsCountFb !== null) (scrapedItem.data as any).postsCount = postsCountFb;
                if (latestPostDate !== null) (scrapedItem.data as any).latestPostDate = latestPostDate;



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
