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
import { calculateAssessment } from './scoring/engine.js';
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
export async function aggregateAndUpsertData(input: ActorInput, _finalUrls: UrlEntry[]): Promise<void> {
    log.info('Finalizing Master Assessment Row for true 1:1 Supabase parity...');

    const dataset = await Actor.openDataset();
    const { items } = await dataset.getData();

    const platforms: Record<string, any> = {};
    let hubForensics: any = null;
    let serpData: any = null;

    items.forEach((item: any) => {
        const p = item.platform;
        if (!p) return;

        if (p === 'general' || p === 'general_hub') {
            hubForensics = item.data;
        } else if (p === 'seo_serp') {
            serpData = item.data;
        } else {
            platforms[p] = {
                url: item.url,
                ...item.data
            };
        }
    });

    const brandName = input.brandName || hubForensics?.seo?.title || (input.businessUrl ? new URL(input.businessUrl).hostname : 'Unknown Business');
    const businessUrl = input.businessUrl || hubForensics?.seo?.canonical || '';
    const classOverride = (input as any).businessClass || null;

    // Calculate score using v2 Scoring Engine
    const scoreResult = calculateAssessment(
        platforms,
        hubForensics,
        serpData,
        brandName,
        businessUrl,
        classOverride
    );

    // Clean the payload: remove nulls/undefined while preserving valid 0 and false
    const cleanedItem = cleanAssessmentPayload(scoreResult);

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
