/**
 * @module main
 * @description Apify Actor entry point for the Crawlee social media scraping actor.
 * Creates CheerioCrawler and PlaywrightCrawler instances, enqueues URLs by platform,
 * and dispatches to the correct handler via the router.
 */

import { Actor } from 'apify';
import { CheerioCrawler, PlaywrightCrawler } from 'crawlee';
import { createHash } from 'crypto';
import { log } from './utils/logger.js';
import { createProxyConfig } from './utils/proxy.js';
import { getRandomUserAgent } from './utils/ua-rotation.js';
import { buildCheerioRouter, buildPlaywrightRouter } from './routes.js';
import { getBlankAssessmentRow } from './utils/schema-mapper.js';
import { upsertAssessment } from './utils/supabase.js';
import { cleanAssessmentPayload } from './utils/data-cleaner.js';
import { FEATURES } from './utils/mode-gate.js';
import { SessionVault } from './utils/session-vault.js';
import { injectCookies } from './utils/auth.js';
import type { ActorInput, Platform, HandlerContext, UrlEntry } from './types.js';
import { PLATFORM_CRAWLER_MAP } from './types.js';

/**
 * Sets up the Session Vault, handling interactive authentication flows
 * or pulling existing session cookies into the input.
 */
export async function setupSessionAndAuth(input: ActorInput): Promise<void> {
    const sessionVault = new SessionVault();
    await sessionVault.initialize();

    const needsRefresh = sessionVault.needsRefresh();
    if (needsRefresh) {
        log.warning('Session Vault is approaching or past the 20-day limit. Hard refresh recommended.');
    }

    if (input.interactiveSessionSetup) {
        log.info('Interactive Session Setup is requested. Launching Apify Live View flow...');
        await sessionVault.runInteractiveSetup(input.proxy);
        log.info('Interactive setup complete. Sessions saved to vault.');
    }

    if (!input.authTokens) {
        const vaultTokens = await sessionVault.getTokens();
        if (vaultTokens) {
             input.authTokens = vaultTokens;
             log.info('Loaded auth tokens from Session Vault.');
        }
    }

    input.authTokens = {
        linkedin: input.authTokens?.linkedin || process.env.AUTH_TOKENS_LINKEDIN,
        facebook: input.authTokens?.facebook || process.env.AUTH_TOKENS_FACEBOOK,
        instagram: input.authTokens?.instagram || process.env.AUTH_TOKENS_INSTAGRAM,
        twitter: input.authTokens?.twitter || process.env.AUTH_TOKENS_X,
        youtube: input.authTokens?.youtube || process.env.AUTH_TOKENS_YOUTUBE,
    };
}

/**
 * Prepares the URLs by combining the main input URLs with potential general hub
 * inputs and partitions them into Cheerio vs Playwright queues.
 */
export function prepareUrls(input: ActorInput): { cheerioUrls: UrlEntry[], playwrightUrls: UrlEntry[], finalUrls: UrlEntry[] } {
    const finalUrls: UrlEntry[] = input.urls || [];
    if (input.businessUrl && !finalUrls.some(u => u.platform === 'general_hub')) {
        finalUrls.push({ platform: 'general_hub', url: input.businessUrl });
    }

    const cheerioUrls: UrlEntry[] = [];
    const playwrightUrls: UrlEntry[] = [];

    for (const entry of finalUrls) {
        const platform = entry.platform as Platform;
        const crawlerType = PLATFORM_CRAWLER_MAP[platform];
        if (crawlerType === 'cheerio') {
            cheerioUrls.push(entry);
        } else {
            playwrightUrls.push(entry);
        }
    }

    return { cheerioUrls, playwrightUrls, finalUrls };
}

/**
 * Aggregates extracted data into a single master row and performs a Supabase
 * upsert if in the correct operating mode.
 */
export async function aggregateAndUpsertData(input: ActorInput, finalUrls: UrlEntry[]): Promise<void> {
    log.info('Finalizing Master Assessment Row for true 1:1 Supabase parity...');

    const masterItem = getBlankAssessmentRow();

    const runId = Actor.getEnv().actorRunId || Date.now().toString();
    const businessUrl = input.businessUrl || '';
    masterItem.lead_uuid = businessUrl ? createHash('md5').update(businessUrl).digest('hex') : createHash('md5').update(`unknown-lead-${runId}`).digest('hex');
    masterItem.dedupe_key = masterItem.lead_uuid + '-' + new Date().toISOString().split('T')[0];
    masterItem.assessment_date = new Date().toISOString();
    masterItem.total_platforms_submitted = finalUrls.length;
    masterItem.platforms_list = finalUrls.map(u => u.platform);
    masterItem.business_url = input.businessUrl || '';
    masterItem.business_title = input.brandName || null;
    masterItem.user_email = input.consultantEmail || null;
    masterItem.workflow_2_status = (input as any).workflowStatus || 'draft';

    const dataset = await Actor.openDataset();
    const { items } = await dataset.getData();

    items.forEach((item: any) => {
        const p = item.platform;
        if (!p) return;

        // Generic per-platform fields — only for platforms with matching DB columns
        // Platforms like google_maps, seo_serp, general use their own dedicated mappings below
        const GENERIC_PLATFORMS = new Set(['instagram', 'twitter', 'linkedin', 'facebook', 'tiktok', 'youtube', 'reddit', 'pinterest']);
        if (GENERIC_PLATFORMS.has(p)) {
            masterItem[`has_${p}`] = true;
            masterItem[`${p}_url`] = item.url;
            masterItem[`${p}_screenshot_url`] = item.data?.screenshotUrl ?? null;
            masterItem[`${p}_scrape_date`] = item.scrapedAt;
        }

        // Map numeric metrics — use != null to preserve real zeros
        if (item.data?.followerCount != null) masterItem[`${p}_followers_count`] = item.data.followerCount;
        if (item.data?.followingCount != null) masterItem[`${p}_following_count`] = item.data.followingCount;

        // Map business title if found on social platforms and not yet set
        if (!masterItem.business_title && item.data?.fullName) {
            masterItem.business_title = item.data.fullName;
        }

        // Fallback: Parse numeric metrics from conversionMarkers only if still null
        if (masterItem[`${p}_followers_count`] == null && item.data?.revenueIndicators?.conversionMarkers) {
            const markers = item.data.revenueIndicators.conversionMarkers;
            const followerMarker = markers.find((m: string) => m.startsWith('Followers Raw:'));
            if (followerMarker) {
                const rawValue = followerMarker.split(':')[1].trim();
                const numMatch = rawValue.match(/([\d,.]+)/);
                if (numMatch) {
                    let numStr = numMatch[1].replace(/,/g, '');
                    let num = parseFloat(numStr);
                    if (rawValue.toLowerCase().includes('k')) num *= 1000;
                    if (rawValue.toLowerCase().includes('m')) num *= 1000000;
                    masterItem[`${p}_followers_count`] = Math.floor(num);
                }
            }
        }

        // ─── Instagram ────────────────────────────────────────────
        if (p === 'instagram') {
            if (item.data?.username) masterItem.instagram_username = item.data.username;
            if (item.data?.fullName) masterItem.instagram_full_name = item.data.fullName;
            if (item.data?.biography) masterItem.instagram_biography = item.data.biography;
            if (item.data?.externalUrl) masterItem.instagram_external_url = item.data.externalUrl;
            if (item.data?.verified) masterItem.instagram_verified = true;
            if (item.data?.isPrivate) masterItem.instagram_is_private = true;
            if (item.data?.postsCount != null) masterItem.instagram_posts_count = item.data.postsCount;
            if (item.data?.latestPostDate) {
                masterItem.instagram_latest_post_date = item.data.latestPostDate;
                const daysSince = Math.floor((Date.now() - new Date(item.data.latestPostDate).getTime()) / (1000 * 3600 * 24));
                if (!isNaN(daysSince)) masterItem.instagram_days_since_post = daysSince;
            }
            // Fallback verified from conversionMarkers
            if (item.data?.revenueIndicators?.conversionMarkers?.includes('Status: Verified')) {
                masterItem.instagram_verified = true;
            }
        }

        // ─── Facebook ─────────────────────────────────────────────
        if (p === 'facebook') {
            if (item.data?.pageName) masterItem.facebook_page_name = item.data.pageName;
            if (item.data?.fullName && !masterItem.facebook_page_name) masterItem.facebook_page_name = item.data.fullName;
            if (item.data?.category) masterItem.facebook_category = item.data.category;
            if (item.data?.likesCount != null) masterItem.facebook_likes_count = item.data.likesCount;
            if (item.data?.hasReviews) masterItem.facebook_has_reviews = true;
            if (item.data?.facebookRating != null) masterItem.facebook_rating = item.data.facebookRating;
            if (item.data?.facebookReviewsCount != null) masterItem.facebook_reviews_count = item.data.facebookReviewsCount;
            if (item.data?.postsCount != null) masterItem.facebook_posts_count = item.data.postsCount;
            if (item.data?.checkinsCount != null) masterItem.facebook_checkins_count = item.data.checkinsCount;
            if (item.data?.latestPostDate) {
                masterItem.facebook_latest_post_date = item.data.latestPostDate;
                const fbDate = new Date(item.data.latestPostDate);
                if (!isNaN(fbDate.getTime())) {
                    const daysSinceFb = Math.floor((Date.now() - fbDate.getTime()) / (1000 * 3600 * 24));
                    masterItem.facebook_days_since_post = daysSinceFb;
                }
            }
        }

        // ─── Twitter ──────────────────────────────────────────────
        if (p === 'twitter') {
            if (item.data?.username) masterItem.twitter_username = item.data.username;
            if (item.data?.fullName) masterItem.twitter_full_name = item.data.fullName;
            if (item.data?.biography) masterItem.twitter_biography = item.data.biography;
            if (item.data?.verified) masterItem.twitter_verified = true;
            if (item.data?.tweetsCount != null) masterItem.twitter_tweets_count = item.data.tweetsCount;
            if (item.data?.latestTweetDate) {
                masterItem.twitter_latest_tweet_date = item.data.latestTweetDate;
                const daysSince = Math.floor((Date.now() - new Date(item.data.latestTweetDate).getTime()) / (1000 * 3600 * 24));
                if (!isNaN(daysSince)) masterItem.twitter_days_since_post = daysSince;
            }
        }

        // ─── TikTok ───────────────────────────────────────────────
        if (p === 'tiktok') {
            if (item.data?.username) masterItem.tiktok_username = item.data.username;
            if (item.data?.displayName) masterItem.tiktok_display_name = item.data.displayName;
            if (item.data?.biography) masterItem.tiktok_biography = item.data.biography;
            if (item.data?.verified) masterItem.tiktok_verified = true;
            if (item.data?.likesCount != null) masterItem.tiktok_likes_count = item.data.likesCount;
            if (item.data?.videosCount != null) masterItem.tiktok_videos_count = item.data.videosCount;
            if (item.data?.latestVideoDate) {
                masterItem.tiktok_latest_video_date = item.data.latestVideoDate;
                const str = String(item.data.latestVideoDate).toLowerCase();
                let daysSince = null;
                if (str.includes('h') || str.includes('m') && !str.includes('mo')) daysSince = 0; // Contains hour or minute
                else if (str.includes('d')) daysSince = parseInt(str);
                else if (str.includes('w')) daysSince = parseInt(str) * 7;
                else {
                    const parsedObj = new Date(str);
                    if (!isNaN(parsedObj.getTime())) daysSince = Math.floor((Date.now() - parsedObj.getTime()) / (1000 * 3600 * 24));
                }
                if (daysSince !== null && !isNaN(daysSince)) {
                    masterItem.tiktok_days_since_post = daysSince;
                }
            }
        }

        // ─── Pinterest ────────────────────────────────────────────
        if (p === 'pinterest') {
            if (item.data?.username) masterItem.pinterest_username = item.data.username;
            if (item.data?.fullName) masterItem.pinterest_full_name = item.data.fullName;
            if (item.data?.followerCount != null) masterItem.pinterest_followers_count = item.data.followerCount;
            if (item.data?.followingCount != null) masterItem.pinterest_following_count = item.data.followingCount;
            if (item.data?.pinsCount != null) masterItem.pinterest_pins_count = item.data.pinsCount;
            if (item.data?.boardsCount != null) masterItem.pinterest_boards_count = item.data.boardsCount;
            if (item.data?.monthlyViews != null) masterItem.pinterest_monthly_views = typeof item.data.monthlyViews === 'string' ? parseInt(item.data.monthlyViews.replace(/,/g, '')) : item.data.monthlyViews;
        }

        // ─── YouTube ──────────────────────────────────────────────
        if (p === 'youtube') {
            if (item.data?.channelName) masterItem.youtube_channel_name = item.data.channelName;
            if (item.data?.channelHandle) masterItem.youtube_channel_handle = item.data.channelHandle;
            if (item.data?.description) masterItem.youtube_description = item.data.description;
            if (item.data?.subscribersCount != null) masterItem.youtube_subscribers_count = item.data.subscribersCount;
            if (item.data?.videosCount != null) masterItem.youtube_videos_count = item.data.videosCount;
            if (item.data?.viewsCount != null) masterItem.youtube_views_count = item.data.viewsCount;
            if (item.data?.verified) masterItem.youtube_verified = true;
            if (item.data?.latestVideoDate) {
                const str = String(item.data.latestVideoDate).toLowerCase();
                let daysSince = null;
                if (str.includes('h') || str.includes('m') && !str.includes('mo')) daysSince = 0;
                else if (str.includes('d')) daysSince = parseInt(str);
                else if (str.includes('w')) daysSince = parseInt(str) * 7;
                else if (str.includes('mo')) daysSince = parseInt(str) * 30;
                else if (str.includes('y')) daysSince = parseInt(str) * 365;
                if (daysSince !== null && !isNaN(daysSince)) {
                    masterItem.youtube_days_since_post = daysSince;
                    masterItem.youtube_latest_video_date = new Date(Date.now() - daysSince * 24 * 3600 * 1000).toISOString();
                } else {
                    // Try to parse directly if it happens to be valid ISO
                    const parsed = new Date(str);
                    if (!isNaN(parsed.getTime())) {
                        masterItem.youtube_latest_video_date = parsed.toISOString();
                    }
                }
            }
        }

        // ─── Google Maps / GBP ────────────────────────────────────
        if (p === 'google_maps' || p === 'google_business_profile') {
            masterItem.has_gbp = true;
            masterItem.has_google_business_profile = true;
            masterItem.gbp_url = item.url;
            masterItem.gbp_business_name = item.data?.gbpBusinessName ?? null;
            masterItem.gbp_category = item.data?.gbpCategory ?? null;
            masterItem.gbp_rating = item.data?.gbpRating ?? null;
            masterItem.gbp_reviews_count = item.data?.gbpReviewsCount ?? null;
            masterItem.gbp_address = item.data?.gbpAddress ?? null;
            // Fix phone: prefer the real phone if available, filter out "Copy phone number"
            const rawPhone = item.data?.gbpPhone;
            if (rawPhone && rawPhone !== 'Copy phone number') {
                masterItem.gbp_phone = rawPhone;
            }
            masterItem.gbp_website = item.data?.gbpWebsite ?? null;
            masterItem.gbp_has_photos = item.data?.gbpHasPhotos || false;
            masterItem.gbp_screenshot_url = item.data?.screenshotUrl ?? null;
            masterItem.gbp_scrape_date = item.scrapedAt;
        }

        // -- Aggregate Deep Crawl Reports --
        if (item.data?.crawlMetadata) {
            const reportKey = (p === 'general' || p === 'general_hub') ? 'general_hub_crawl_report' : `${p}_crawl_report`;
            if (!(masterItem as any)[reportKey]) (masterItem as any)[reportKey] = [];
            (masterItem as any)[reportKey].push({
                url: item.url,
                scrapedAt: item.scrapedAt,
                ...item.data.crawlMetadata
            });
        }

        // ─── General / General Hub ────────────────────────────────
        if (p === 'general' || p === 'general_hub') {
            const f = item.data?.forensics;
            if (f) {
                if (f.hasSsl) masterItem.business_has_ssl = true;
                if (f.hasJsonLd) masterItem.business_has_json_ld = true;
                if (f.hasGoogleAnalytics) masterItem.has_google_analytics = true;
                if (f.hasNewsletter) masterItem.has_newsletter_signup = true;
                if (f.hasPrivacyPolicy) masterItem.has_privacy_policy = true;
                if (f.hasCookieBanner) masterItem.has_cookie_banner = true;
                
                // Deep Signals
                if (f.hasCaseStudies) masterItem.consideration_has_case_studies = true;
                if (f.hasTestimonials) masterItem.consideration_has_testimonials = true;
                if (f.hasLeadMagnet) masterItem.has_lead_magnet = true;
                if (f.hasQuiz) masterItem.has_quiz = true;
                if (f.hasPricing) masterItem.decision_pricing_page_detected = true;
                if (f.hasIntentTracking) masterItem.has_intent_tracking = true;
                if (f.hasInstantBooking) masterItem.has_instant_booking = true;
                if (f.isAiReady) masterItem.is_ai_ready = true;
            }
            if (!masterItem.business_meta_description && item.data?.metaDescription) masterItem.business_meta_description = item.data.metaDescription;
            if (!masterItem.business_canonical_url && item.data?.canonicalUrl) masterItem.business_canonical_url = item.data.canonicalUrl;
            if (!masterItem.business_loaded_url && item.data?.loadedUrl) masterItem.business_loaded_url = item.data.loadedUrl;
            if (masterItem.business_http_status == null && item.data?.httpStatus != null) masterItem.business_http_status = item.data.httpStatus;
            if (masterItem.business_scrape_success == null && item.data?.scrapeSuccess !== undefined) masterItem.business_scrape_success = item.data.scrapeSuccess;
            if (!masterItem.business_screenshot_url && item.data?.screenshotUrl) {
                masterItem.business_screenshot_url = item.data.screenshotUrl;
                masterItem.business_screenshot_captured_at = item.scrapedAt;
            }
        }

        // ─── LinkedIn ─────────────────────────────────────────────
        if (p === 'linkedin') {
            if (item.data?.fullName) masterItem.linkedin_full_name = item.data.fullName;
            if (item.data?.followerCount != null) masterItem.linkedin_followers_count = item.data.followerCount;
            if (item.data?.connectionsCount != null) masterItem.linkedin_connections_count = item.data.connectionsCount;
            if (item.data?.headline) masterItem.linkedin_headline = item.data.headline;
            if (item.data?.location) masterItem.linkedin_location = item.data.location;
            if (item.data?.companyName) masterItem.linkedin_company_name = item.data.companyName;
            if (item.data?.hasRecentActivity) masterItem.linkedin_has_recent_activity = true;
            if (item.data?.latestPostDate) {
                const str = String(item.data.latestPostDate).toLowerCase();
                let daysSince = null;
                if (str.includes('h')) daysSince = 0;
                else if (str.includes('d')) daysSince = parseInt(str);
                else if (str.includes('w')) daysSince = parseInt(str) * 7;
                else if (str.includes('mo')) daysSince = parseInt(str) * 30;
                else if (str.includes('y')) daysSince = parseInt(str) * 365;
                if (daysSince !== null && !isNaN(daysSince)) {
                    masterItem.linkedin_days_since_post = daysSince;
                }
            }
        }

        // ─── Reddit ───────────────────────────────────────────────
        if (p === 'reddit') {
            if (item.data?.username) masterItem.reddit_username = item.data.username;
            if (item.data?.karma != null) masterItem.reddit_karma = item.data.karma;
            if (item.data?.postKarma != null) masterItem.reddit_post_karma = item.data.postKarma;
            if (item.data?.commentKarma != null) masterItem.reddit_comment_karma = item.data.commentKarma;
            if (item.data?.accountAgeDays != null) masterItem.reddit_account_age_days = item.data.accountAgeDays;
            if (item.data?.postsCount != null) masterItem.reddit_posts_count = item.data.postsCount;
            if (item.data?.latestPostDate) {
                masterItem.reddit_latest_activity_date = item.data.latestPostDate;
            }
        }

        // ─── Pinterest ────────────────────────────────────────────
        if (p === 'pinterest') {
            if (item.data?.username) masterItem.pinterest_username = item.data.username;
            if (item.data?.fullName) masterItem.pinterest_full_name = item.data.fullName;
            if (item.data?.followerCount != null) masterItem.pinterest_followers_count = item.data.followerCount;
            if (item.data?.followingCount != null) masterItem.pinterest_following_count = item.data.followingCount;
            if (item.data?.pinsCount != null) masterItem.pinterest_pins_count = item.data.pinsCount;
            if (item.data?.boardsCount != null) masterItem.pinterest_boards_count = item.data.boardsCount;
            if (item.data?.monthlyViews != null) masterItem.pinterest_monthly_views = item.data.monthlyViews;
        }

        // ─── SEO-SERP ─────────────────────────────────────────────
        if (p === 'seo_serp') {
            if (item.data?.serpRankingPosition != null) {
                masterItem.seo_ranking_position = item.data.serpRankingPosition;
                masterItem.serp_ranking_position = item.data.serpRankingPosition;
            }
            if (item.data?.serpKeyword) masterItem.serp_keyword_used = item.data.serpKeyword;
            if (item.data?.serpCheckDate) masterItem.serp_check_date = item.data.serpCheckDate;
        }
    });

    // Clean the payload: remove nulls/undefined while preserving valid 0 and false
    const cleanedItem = cleanAssessmentPayload(masterItem);

    const finalDataset = await Actor.openDataset('revenue-journey-assessments');
    await finalDataset.pushData(cleanedItem);

    log.info('Master Assessment complete.', {
        columnsMapped: Object.keys(cleanedItem).length,
        outputDataset: 'revenue-journey-assessments'
    });

    if (FEATURES.directUpsert()) {
        const supabaseUrl = process.env.SUPABASE_URL || (input as any).supabaseUrl;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || (input as any).supabaseServiceKey;

        if (supabaseUrl && supabaseKey) {
            log.info('[Consultant Workflow] Internal Mode detected. Triggering direct upsert...');
            const result = await upsertAssessment(cleanedItem, supabaseUrl, supabaseKey);
            if (result.success) {
                log.info('[Consultant Workflow] Data is now live in Supabase dashboard.');
            } else {
                log.warning('[Consultant Workflow] Supabase upsert failed.');
            }
        } else {
            log.error('[Consultant Workflow] Internal Mode active but missing Supabase credentials.');
        }
    } else {
        log.info('[Marketplace/SaaS Mode] Skipping direct upsert for data privacy.');
    }
}

/**
 * Handles the collection of screenshots for Cheerio-extracted platforms.
 */
export async function handleScreenshotCollection({ page, request, log: pwLog }: any): Promise<void> {
    const { platform, originalUrl } = request.userData;
    pwLog.info(`[Screenshot Collector] Capturing ${platform}: ${originalUrl}`);

    const urlHash = createHash('md5').update(originalUrl).digest('hex');
    const dataKey = `data_${urlHash}`;

    try {
        await page.goto(originalUrl, { waitUntil: 'commit', timeout: 60000 });
        await page.waitForLoadState('domcontentloaded', { timeout: 30000 }).catch(() => {});
        await page.waitForTimeout(3000);

        const screenshotKey = `screenshot_${request.id}.png`;
        let screenshotBuffer;
        try {
            screenshotBuffer = await page.screenshot({ fullPage: true, timeout: 15000 });
        } catch (e) {
            pwLog.warning(`Full-page screenshot failed for ${originalUrl}, capturing viewport instead.`);
            screenshotBuffer = await page.screenshot({ fullPage: false });
        }
        
        await Actor.setValue(screenshotKey, screenshotBuffer, { contentType: 'image/png' });
        const storeId = Actor.getEnv().defaultKeyValueStoreId || 'default';
        const screenshotUrl = `https://api.apify.com/v2/key-value-stores/${storeId}/records/${screenshotKey}`;

        const cheerioResult = await Actor.getValue<any>(dataKey);

        if (!cheerioResult) {
            pwLog.error(`Could not find Enriched Cheerio-extracted data for: ${originalUrl} (Key: ${dataKey})`);
            return;
        }

        const finalItem = {
            ...cheerioResult,
            data: {
                ...cheerioResult.data,
                screenshotUrl,
            }
        };

        const dataset = await Actor.openDataset();
        await dataset.pushData(finalItem);
        pwLog.info(`Finalized item with screenshot for: ${originalUrl}`);
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        pwLog.error(`[Screenshot Collector] Failed for ${originalUrl}: ${msg}`);
        const cheerioResult = await Actor.getValue<any>(dataKey);
        if (cheerioResult) {
            const dataset = await Actor.openDataset();
            await dataset.pushData({
                ...cheerioResult,
                errors: [...(cheerioResult.errors || []), `Screenshot failed: ${msg}`]
            });
        }
    }
}

/**
 * Runs the Playwright crawler for browser-required platforms and for capturing
 * screenshots of Cheerio-extracted platforms.
 */
export async function runPlaywrightCrawler(
    input: ActorInput,
    handlerContext: HandlerContext,
    proxyConfiguration: any,
    playwrightUrls: UrlEntry[],
    cheerioUrls: UrlEntry[]
): Promise<void> {
    log.info(`Running PlaywrightCrawler for screenshots and browser platforms`);

    const playwrightRouter = buildPlaywrightRouter(handlerContext);

    playwrightRouter.addHandler('screenshot-collector', handleScreenshotCollection);

    const playwrightQueue = await Actor.openRequestQueue();
    
    const pwRequests = playwrightUrls.map(entry => {
        let targetUrl = entry.url;
        if (!targetUrl.startsWith('http')) {
            if (entry.platform === 'google_maps' || entry.platform === 'google_business_profile') {
                // Route to Google Maps search instead of web search so that
                // the Maps side-pane renders with h1, rating, reviews, etc.
                targetUrl = `https://www.google.com/maps/search/${encodeURIComponent(targetUrl)}`;
            } else {
                targetUrl = `https://www.google.com/search?q=${encodeURIComponent(targetUrl)}`;
            }
        }
        return {
            url: targetUrl,
            label: entry.platform,
            userData: { platform: entry.platform },
        };
    });

    const screenshotRequests = cheerioUrls.map(entry => ({
        url: entry.url.startsWith('http') ? entry.url : `https://www.google.com/search?q=${encodeURIComponent(entry.url)}`,
        label: 'screenshot-collector',
        userData: { platform: entry.platform, originalUrl: entry.url },
    }));

    await playwrightQueue.addRequests([...pwRequests, ...screenshotRequests]);

    const playwrightCrawler = new PlaywrightCrawler({
        requestQueue: playwrightQueue,
        requestHandler: playwrightRouter,
        proxyConfiguration: proxyConfiguration as any,
        useSessionPool: true,
        sessionPoolOptions: {
            maxPoolSize: 100,
            sessionOptions: {
                maxUsageCount: 50,
            },
        },
        browserPoolOptions: {
            useFingerprints: true,
        },
        maxConcurrency: Math.min(input.maxConcurrency, 5),
        maxRequestRetries: input.maxRequestRetries,
        requestHandlerTimeoutSecs: 180,
        launchContext: {
            launchOptions: {
                args: ['--disable-blink-features=AutomationControlled'],
            },
        },
        preNavigationHooks: [
            async ({ page, request }) => {
                const platform = request.userData.platform as Platform;
                if (input.authTokens && (input.authTokens as any)[platform]) {
                    const tokenString = (input.authTokens as any)[platform];
                    await injectCookies(page, platform, tokenString, request.url);
                }
            },
        ],
    });

    await playwrightCrawler.run();
}

/**
 * Runs the Cheerio crawler for lightweight, non-browser platforms.
 */
export async function runCheerioCrawler(
    input: ActorInput,
    handlerContext: HandlerContext,
    proxyConfiguration: any,
    cheerioUrls: UrlEntry[]
): Promise<void> {
    if (cheerioUrls.length === 0) return;

    log.info(`Running CheerioCrawler for ${cheerioUrls.length} URLs`);

    const cheerioQueue = await Actor.openRequestQueue();
    for (const entry of cheerioUrls) {
        let targetUrl = entry.url;
        if (entry.platform === 'reddit') {
            targetUrl = targetUrl.replace(/\/$/, '');
            if (!targetUrl.endsWith('.json')) {
                targetUrl += '/about.json';
            }
        }
        await cheerioQueue.addRequest({
            url: targetUrl,
            label: entry.platform,
            userData: { platform: entry.platform, originalUrl: entry.url },
        });
    }

    const cheerioRouter = buildCheerioRouter(handlerContext);

    const cheerioCrawler = new CheerioCrawler({
        requestQueue: cheerioQueue,
        requestHandler: cheerioRouter,
        proxyConfiguration: proxyConfiguration as any,
        useSessionPool: true,
        sessionPoolOptions: {
            maxPoolSize: 100,
            sessionOptions: {
                maxUsageCount: 50,
            },
        },
        maxConcurrency: input.maxConcurrency,
        maxRequestRetries: input.maxRequestRetries,
        additionalMimeTypes: ['application/json'],
        preNavigationHooks: [
            (_context, options) => {
                options.headers = {
                    ...options.headers,
                    'User-Agent': getRandomUserAgent(),
                    'Cookie': 'SOCS=CAESEwgDEgk0ODE3Nzk3MjQaAmVuIAEaBgiA_LyaBg',
                };
            },
        ],
    });

    await cheerioCrawler.run();
}

/**
 * Main actor function. Initializes the Apify Actor, creates crawlers,
 * enqueues URLs, and runs scrapers per crawler type.
 * @returns Promise that resolves when all URLs have been processed.
 */
export async function runActor(): Promise<void> {
    await Actor.init();

    const input = await Actor.getInput<ActorInput>();
    if (!input) {
        throw new Error('Actor input is required.');
    }

    await setupSessionAndAuth(input);

    const handlerContext: HandlerContext = { input };
    const proxyConfiguration = await createProxyConfig(input.proxy);

    const { cheerioUrls, playwrightUrls, finalUrls } = prepareUrls(input);

    log.info(`Actor started in mode: ${FEATURES.getSiloName()}`, {
        platforms: input.platforms,
        urlCount: finalUrls.length,
        maxConcurrency: input.maxConcurrency,
    });

    await runCheerioCrawler(input, handlerContext, proxyConfiguration, cheerioUrls);

    await runPlaywrightCrawler(input, handlerContext, proxyConfiguration, playwrightUrls, cheerioUrls);

    await aggregateAndUpsertData(input, finalUrls);

    await Actor.exit();
}
