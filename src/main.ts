/**
 * @module main
 * @description Apify Actor entry point for the Crawlee social media scraping actor.
 * Creates CheerioCrawler and PlaywrightCrawler instances, enqueues URLs by platform,
 * and dispatches to the correct handler via the router.
 */

import { Actor } from 'apify';
import { CheerioCrawler, PlaywrightCrawler, RequestQueue } from 'crawlee';
import { createHash } from 'crypto';
import { log } from './utils/logger.js';
import { createProxyConfig } from './utils/proxy.js';
import { getRandomUserAgent } from './utils/ua-rotation.js';
import { buildCheerioRouter, buildPlaywrightRouter } from './routes.js';
import { getBlankAssessmentRow } from './utils/schema-mapper.js';
import { upsertAssessment } from './utils/supabase.js';
import { FEATURES } from './utils/mode-gate.js';
import { injectCookies } from './utils/auth.js';
import type { ActorInput, Platform, HandlerContext, UrlEntry } from './types.js';
import { PLATFORM_CRAWLER_MAP } from './types.js';

/**
 * Main actor function. Initializes the Apify Actor, creates crawlers,
 * enqueues URLs, and runs scrapers per crawler type.
 * @returns Promise that resolves when all URLs have been processed.
 */
async function main(): Promise<void> {
    await Actor.init();

    const input = await Actor.getInput<ActorInput>();
    if (!input) {
        throw new Error('Actor input is required.');
    }

    // --- PHASE 2: Cookie Injection from Environment (Local Dev Helper) ---
    // Merge tokens from .env if not provided in input
    input.authTokens = {
        linkedin: input.authTokens?.linkedin || process.env.AUTH_TOKENS_LINKEDIN,
        facebook: input.authTokens?.facebook || process.env.AUTH_TOKENS_FACEBOOK,
        instagram: input.authTokens?.instagram || process.env.AUTH_TOKENS_INSTAGRAM,
        twitter: input.authTokens?.twitter || process.env.AUTH_TOKENS_X,
    };

    const handlerContext: HandlerContext = { input };
    const proxyConfiguration = await createProxyConfig(input.proxy);

    // --- PHASE 2: Discovery Logic (Consultant Workflow) ---
    // Use input.urls if provided, otherwise prepare for hub discovery
    const finalUrls: UrlEntry[] = input.urls || [];
    if (input.businessUrl && !finalUrls.some(u => u.platform === 'general_hub')) {
        finalUrls.push({ platform: 'general_hub', url: input.businessUrl });
    }

    log.info(`Actor started in mode: ${FEATURES.getSiloName()}`, {
        platforms: input.platforms,
        urlCount: finalUrls.length,
        maxConcurrency: input.maxConcurrency,
    });

    // Partition URLs by crawler type
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

    // Run CheerioCrawler for lightweight platforms
    if (cheerioUrls.length > 0) {
        log.info(`Running CheerioCrawler for ${cheerioUrls.length} URLs`);

        const cheerioQueue = await RequestQueue.open('cheerio-queue');
        for (const entry of cheerioUrls) {
            // Reddit: rewrite URL to .json endpoint for structured data
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
                    };
                },
            ],
        });

        await cheerioCrawler.run();
    }

    // Run PlaywrightCrawler for browser-required platforms AND for screenshots of Cheerio platforms
    log.info(`Running PlaywrightCrawler for screenshots and browser platforms`);

    const playwrightRouter = buildPlaywrightRouter(handlerContext);

    // Add a specialized route for collecting screenshots of Cheerio-extracted data
    playwrightRouter.addHandler('screenshot-collector', async ({ page, request, log: pwLog }) => {
        const { platform, originalUrl } = request.userData;
        pwLog.info(`[Screenshot Collector] Capturing ${platform}: ${originalUrl}`);

        const urlHash = createHash('md5').update(originalUrl).digest('hex');
        const dataKey = `data_${urlHash}`;

        try {
            // 1. Capture the screenshot - using commit for faster load on heavy sites
            await page.goto(originalUrl, { waitUntil: 'commit', timeout: 60000 });
            await page.waitForLoadState('domcontentloaded', { timeout: 30000 }).catch(() => {});
            
            // Extra wait for dynamic content/images to settle
            await page.waitForTimeout(3000);
            
            const screenshotKey = `screenshot_${request.id}.png`;
            // Defensive screenshot
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

            // 2. Retrieve the data previously extracted by Cheerio
            const cheerioResult = await Actor.getValue<any>(dataKey);

            if (!cheerioResult) {
                pwLog.error(`Could not find Enriched Cheerio-extracted data for: ${originalUrl} (Key: ${dataKey})`);
                return;
            }

            // 3. Merge and push to final dataset
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
            // Fallback: try to push data even without screenshot
            const cheerioResult = await Actor.getValue<any>(dataKey);
            if (cheerioResult) {
                const dataset = await Actor.openDataset();
                await dataset.pushData({
                    ...cheerioResult,
                    errors: [...(cheerioResult.errors || []), `Screenshot failed: ${msg}`]
                });
            }
        }
    });

    const playwrightCrawler = new PlaywrightCrawler({
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
        maxConcurrency: Math.min(input.maxConcurrency, 5), // Increased concurrency
        maxRequestRetries: input.maxRequestRetries,
        requestHandlerTimeoutSecs: 180, // Even more time for slow proxies
        launchContext: {
            launchOptions: {
                args: ['--disable-blink-features=AutomationControlled'],
            },
        },
        preNavigationHooks: [
            async ({ page, request }) => {
                // Resource blocking is now handled selectively within each platform handler
                // to allow for high-res screenshots where needed.
                
                const platform = request.userData.platform as Platform;
                if (input.authTokens && (input.authTokens as any)[platform]) {
                    const tokenString = (input.authTokens as any)[platform];
                    await injectCookies(page, platform, tokenString, request.url);
                }
            },
        ],
    });

    log.info('Adding requests to PlaywrightCrawler...');
    
    // 1. Native Playwright platforms
    const pwRequests = playwrightUrls.map(entry => ({
        url: entry.url,
        label: entry.platform,
        userData: { platform: entry.platform },
    }));

    // 2. Screenshot collector for Cheerio platforms
    const screenshotRequests = cheerioUrls.map(entry => ({
        url: entry.url,
        label: 'screenshot-collector',
        userData: { platform: entry.platform, originalUrl: entry.url },
    }));

    await playwrightCrawler.addRequests([...pwRequests, ...screenshotRequests]);
    await playwrightCrawler.run();

    // --- PHASE 2 AGGREGATION: Unified Row for Supabase ---
    log.info('Finalizing Master Assessment Row for true 1:1 Supabase parity...');
    
    const masterItem = getBlankAssessmentRow();
    
    // Fill basic orchestration meta from new Consultant UI
    masterItem.assessment_date = new Date().toISOString();
    masterItem.total_platforms_submitted = finalUrls.length;
    masterItem.platforms_list = finalUrls.map(u => u.platform);
    masterItem.business_url = input.businessUrl || '';
    masterItem.business_title = input.brandName || null;
    masterItem.user_email = input.consultantEmail || null;
    masterItem.workflow_2_status = (input as any).workflowStatus || 'draft';

    // Collect all enriched items from the default dataset
    const dataset = await Actor.openDataset();
    const { items } = await dataset.getData();
    
    items.forEach((item: any) => {
        const p = item.platform;
        if (!p) return;

        // Map standard platform columns
        masterItem[`has_${p}`] = true;
        masterItem[`${p}_url`] = item.url;
        masterItem[`${p}_screenshot_url`] = item.data.screenshotUrl;
        masterItem[`${p}_scrape_date`] = item.scrapedAt;

        // Map high-res metrics (Numeric)
        if (item.data.followerCount) masterItem[`${p}_followers_count`] = item.data.followerCount;
        if (item.data.followingCount) masterItem[`${p}_following_count`] = item.data.followingCount;
        
        // Map GBP specific high-res fields
        if (p === 'google_maps' || p === 'google_business_profile') {
            masterItem.has_gbp = true;
            masterItem.gbp_url = item.url;
            masterItem.gbp_business_name = item.data.gbpBusinessName;
            masterItem.gbp_category = item.data.gbpCategory;
            masterItem.gbp_rating = item.data.gbpRating;
            masterItem.gbp_reviews_count = item.data.gbpReviewsCount;
            masterItem.gbp_address = item.data.gbpAddress;
            masterItem.gbp_phone = item.data.gbpPhone;
            masterItem.gbp_has_photos = item.data.gbpHasPhotos || false;
            masterItem.gbp_screenshot_url = item.data.screenshotUrl;
            masterItem.gbp_scrape_date = item.scrapedAt;
        }

        // Map Forensics for General Hub
        if (p === 'general_hub') {
            const f = item.data.forensics;
            if (f) {
                masterItem.business_has_ssl = f.hasSsl;
                masterItem.business_has_json_ld = f.hasJsonLd;
                masterItem.has_google_analytics = f.hasGoogleAnalytics;
                masterItem.has_newsletter_signup = f.hasNewsletter;
                masterItem.has_privacy_policy = f.hasPrivacyPolicy;
                masterItem.has_cookie_banner = f.hasCookieBanner;
            }
        }
    });

    // Handle SEO special mapping
    const seoItem = items.find((i: any) => i.platform === 'seo_serp');
    if (seoItem) {
        masterItem.seo_ranking_position = 0; // Default
        const posMarker = seoItem.data.revenueIndicators.conversionMarkers.find((m: string) => m.includes('Position 1:'));
        if (posMarker) masterItem.seo_ranking_position = 1;
    }

    // Push the consolidated master row to a special named dataset
    const finalDataset = await Actor.openDataset('revenue-journey-assessments');
    await finalDataset.pushData(masterItem);
    
    log.info('Master Assessment complete.', { 
        columnsMapped: Object.keys(masterItem).length,
        outputDataset: 'revenue-journey-assessments'
    });

    // --- PHASE 2 DIRECT UPSERT (Consultant Workflow) ---
    if (FEATURES.directUpsert()) {
        const supabaseUrl = process.env.SUPABASE_URL || (input as any).supabaseUrl;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || (input as any).supabaseServiceKey;

        if (supabaseUrl && supabaseKey) {
            log.info('[Consultant Workflow] Internal Mode detected. Triggering direct upsert...');
            const result = await upsertAssessment(masterItem, supabaseUrl, supabaseKey);
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

    await Actor.exit();
}

main();
