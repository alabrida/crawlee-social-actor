/**
 * @module main
 * @description Apify Actor entry point for the Crawlee social media scraping actor.
 * Creates CheerioCrawler and PlaywrightCrawler instances, enqueues URLs by platform,
 * and dispatches to the correct handler via the router.
 */

import { Actor } from 'apify';
import { CheerioCrawler, PlaywrightCrawler, RequestQueue } from 'crawlee';
import { log } from './utils/logger.js';
import { createProxyConfig } from './utils/proxy.js';
import { blockResources } from './utils/resources.js';
import { getRandomUserAgent } from './utils/ua-rotation.js';
import { buildCheerioRouter, buildPlaywrightRouter } from './routes.js';
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

    log.info('Actor started', {
        platforms: input.platforms,
        urlCount: input.urls.length,
        maxConcurrency: input.maxConcurrency,
    });

    const handlerContext: HandlerContext = { input };
    const proxyConfiguration = await createProxyConfig(input.proxy);

    // Partition URLs by crawler type
    const cheerioUrls: UrlEntry[] = [];
    const playwrightUrls: UrlEntry[] = [];

    for (const entry of input.urls) {
        const platform = entry.platform as Platform;

        if (!input.platforms.includes(platform)) {
            log.info(`Skipping disabled platform: ${platform}`, { url: entry.url });
            continue;
        }

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
            await cheerioQueue.addRequest({
                url: entry.url,
                label: entry.platform,
                userData: { platform: entry.platform },
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

    // Run PlaywrightCrawler for browser-required platforms
    if (playwrightUrls.length > 0) {
        log.info(`Running PlaywrightCrawler for ${playwrightUrls.length} URLs`);

        const playwrightQueue = await RequestQueue.open('playwright-queue');
        for (const entry of playwrightUrls) {
            await playwrightQueue.addRequest({
                url: entry.url,
                label: entry.platform,
                userData: { platform: entry.platform },
            });
        }

        const playwrightRouter = buildPlaywrightRouter(handlerContext);

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
            maxConcurrency: Math.min(input.maxConcurrency, 3),
            maxRequestRetries: input.maxRequestRetries,
            launchContext: {
                launchOptions: {
                    args: ['--disable-blink-features=AutomationControlled'],
                },
            },
            preNavigationHooks: [
                async ({ page }) => {
                    await blockResources(page);
                },
            ],
        });

        await playwrightCrawler.run();
    }

    log.info('Actor finished', {
        cheerioUrls: cheerioUrls.length,
        playwrightUrls: playwrightUrls.length,
    });

    await Actor.exit();
}

main();
