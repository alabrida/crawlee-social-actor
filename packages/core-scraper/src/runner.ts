/**
 * @module runner
 * @description Runs the Cheerio and Playwright crawlers.
 */

import { CheerioCrawler, PlaywrightCrawler } from 'crawlee';
import { Actor } from 'apify';
import { createHash } from 'crypto';
import { log } from './utils/logger.js';
import { getRandomUserAgent } from './utils/ua-rotation.js';
import { buildCheerioRouter, buildPlaywrightRouter } from './routes.js';
import { injectCookies } from './utils/auth.js';
import { createProxyConfig } from './utils/proxy.js';
import type { ActorInput, Platform, HandlerContext, UrlEntry } from './types.js';

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
/**
 * Helper to build a PlaywrightCrawler with standard configurations.
 */
function createPlaywrightCrawler(
    requestQueue: any,
    playwrightRouter: any,
    proxyConfig: any,
    input: ActorInput
): PlaywrightCrawler {
    return new PlaywrightCrawler({
        requestQueue,
        requestHandler: playwrightRouter,
        proxyConfiguration: proxyConfig as any,
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

    const residentialPlatforms = new Set(['linkedin', 'instagram', 'tiktok', 'twitter', 'facebook']);
    const residentialUrls = playwrightUrls.filter(entry => residentialPlatforms.has(entry.platform));
    const datacenterUrls = playwrightUrls.filter(entry => !residentialPlatforms.has(entry.platform));

    const dcRequests = datacenterUrls.map(entry => {
        let targetUrl = entry.url;
        if (!targetUrl.startsWith('http')) {
            if (entry.platform === 'google_maps' || entry.platform === 'google_business_profile') {
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

    const resRequests = residentialUrls.map(entry => {
        let targetUrl = entry.url;
        if (!targetUrl.startsWith('http')) {
            targetUrl = `https://www.google.com/search?q=${encodeURIComponent(targetUrl)}`;
        }
        return {
            url: targetUrl,
            label: entry.platform,
            userData: { platform: entry.platform },
        };
    });

    // 1. Run Datacenter crawler if there are DC or screenshot requests
    if (dcRequests.length > 0 || screenshotRequests.length > 0) {
        log.info(`Running Playwright Datacenter Crawler for ${dcRequests.length} pages and ${screenshotRequests.length} screenshots`);
        const dcQueue = await Actor.openRequestQueue('playwright-datacenter');
        await dcQueue.addRequests([...dcRequests, ...screenshotRequests]);

        const dcProxy = input.proxy ? await createProxyConfig(input.proxy, 'datacenter') : proxyConfiguration;
        const dcCrawler = createPlaywrightCrawler(dcQueue, playwrightRouter, dcProxy, input);
        await dcCrawler.run();
    }

    // 2. Run Residential crawler if there are residential requests
    if (resRequests.length > 0) {
        log.info(`Running Playwright Residential Crawler for ${resRequests.length} pages`);
        const resQueue = await Actor.openRequestQueue('playwright-residential');
        await resQueue.addRequests(resRequests);

        const resProxy = input.proxy ? await createProxyConfig(input.proxy, 'residential') : proxyConfiguration;
        const resCrawler = createPlaywrightCrawler(resQueue, playwrightRouter, resProxy, input);
        await resCrawler.run();
    }
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
    const dcProxy = input.proxy ? await createProxyConfig(input.proxy, 'datacenter') : proxyConfiguration;

    const cheerioCrawler = new CheerioCrawler({
        requestQueue: cheerioQueue,
        requestHandler: cheerioRouter,
        proxyConfiguration: dcProxy as any,
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
