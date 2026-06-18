/**
 * @module runner
 * @description Runs the Cheerio and Playwright crawlers.
 */

import { CheerioCrawler, PlaywrightCrawler } from 'crawlee';
import { Actor } from 'apify';
import { log } from './utils/logger.js';
import { getRandomUserAgent } from './utils/ua-rotation.js';
import { buildCheerioRouter, buildPlaywrightRouter } from './routes.js';
import { injectCookies } from './utils/auth.js';
import { createProxyConfig } from './utils/proxy.js';
import { handleScreenshotCollection } from './screenshot.js';
import type { ActorInput, Platform, HandlerContext, UrlEntry } from './types.js';


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
                const slot = request.userData.sessionSlot;

                // Try slot-specific token first, fallback to platform default
                let tokenString = (slot && input.authTokens) ? (input.authTokens as any)[slot] : undefined;
                if (!tokenString && input.authTokens) {
                    tokenString = (input.authTokens as any)[platform];
                }

                // Fallback for Google Business / Maps platforms to use the generic 'google' auth token
                if (!tokenString && input.authTokens && (platform === 'google_maps' || platform === 'google_business_profile')) {
                    tokenString = input.authTokens.google;
                }

                if (tokenString) {
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
            userData: { platform: entry.platform, sessionSlot: entry.sessionSlot },
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
            userData: { platform: entry.platform, sessionSlot: entry.sessionSlot },
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
    const cheerioProxy = input.proxy ? await createProxyConfig(input.proxy, 'residential') : proxyConfiguration;

    const cheerioCrawler = new CheerioCrawler({
        requestQueue: cheerioQueue,
        requestHandler: cheerioRouter,
        proxyConfiguration: cheerioProxy as any,
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
