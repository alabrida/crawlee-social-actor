/**
 * @module routes
 * @description Router builders for CheerioCrawler and PlaywrightCrawler.
 * Handlers are wired in during the SHIP phase by the Integration Lead.
 * Only shipped handlers should be uncommented in the registry.
 */

import { createCheerioRouter, createPlaywrightRouter } from 'crawlee';
import { Actor } from 'apify';
import { log } from './utils/logger.js';
import type {
    HandlerContext,
    CheerioHandler,
    PlaywrightHandler,
    ScrapedItem,
} from './types.js';

// --- Handler imports ---
// Handlers are imported and registered after passing the SHIP gate.
// Uncomment each handler as it is shipped.
// Sprint 1:
import tiktokHandler from './handlers/tiktok.js';
// import youtubeHandler from './handlers/youtube.js';
// Sprint 2:
// import redditHandler from './handlers/reddit.js';
// Sprint 3:
// import googleMapsHandler from './handlers/google-maps.js';
// import pinterestHandler from './handlers/pinterest.js';
// Sprint 4:
// import linkedinHandler from './handlers/linkedin.js';
// Sprint 5:
// import metaHandler from './handlers/meta.js';
// Sprint 6:
// import generalHandler from './handlers/general.js';

/**
 * Registry of shipped CheerioCrawler handlers.
 * Handlers are added here after passing the SHIP gate.
 */
const CHEERIO_HANDLERS: Record<string, CheerioHandler> = {
    // youtube: youtubeHandler,
    // reddit: redditHandler,
};

/**
 * Registry of shipped PlaywrightCrawler handlers.
 * Handlers are added here after passing the SHIP gate.
 */
const PLAYWRIGHT_HANDLERS: Record<string, PlaywrightHandler> = {
    tiktok: tiktokHandler,
    // google_maps: googleMapsHandler,
    // pinterest: pinterestHandler,
    // linkedin: linkedinHandler,
    // facebook: metaHandler,
    // instagram: metaHandler,
    // general: generalHandler,
};

/**
 * Build the Cheerio router with request dispatching by platform label.
 * Each request's `label` is the platform name set during enqueue.
 * @param handlerContext - Shared context with actor input.
 * @returns A Crawlee RouterHandler for CheerioCrawler.
 */
export function buildCheerioRouter(handlerContext: HandlerContext) {
    const router = createCheerioRouter();

    // Register a route for each shipped Cheerio handler
    for (const [platform, handler] of Object.entries(CHEERIO_HANDLERS)) {
        router.addHandler(platform, async (context) => {
            log.info(`Cheerio handler: ${platform}`, { url: context.request.url });

            try {
                const items: ScrapedItem[] = await handler.handle(context, handlerContext);
                const dataset = await Actor.openDataset();

                for (const item of items) {
                    if (!handler.validate(item.data)) {
                        item.errors.push('Schema validation warning: unexpected data shape');
                        log.warning('Data validation failed', { platform, url: context.request.url });
                    }
                    await dataset.pushData(item);
                }

                log.info(`Scraped ${items.length} items`, { platform, url: context.request.url });
            } catch (error) {
                const msg = error instanceof Error ? error.message : String(error);
                log.error(`Handler failed: ${platform}`, { url: context.request.url, error: msg });

                const failedDataset = await Actor.openDataset('failed-urls');
                await failedDataset.pushData({
                    platform,
                    url: context.request.url,
                    error: msg,
                    timestamp: new Date().toISOString(),
                });
            }
        });
    }

    // Default handler for unregistered platforms
    router.addDefaultHandler(async (context) => {
        const platform = context.request.label ?? 'unknown';
        log.error(`No shipped Cheerio handler for platform: ${platform}`, {
            url: context.request.url,
        });

        const failedDataset = await Actor.openDataset('failed-urls');
        await failedDataset.pushData({
            platform,
            url: context.request.url,
            error: `Handler not yet shipped for platform: ${platform}`,
            timestamp: new Date().toISOString(),
        });
    });

    return router;
}

/**
 * Build the Playwright router with request dispatching by platform label.
 * @param handlerContext - Shared context with actor input.
 * @returns A Crawlee RouterHandler for PlaywrightCrawler.
 */
export function buildPlaywrightRouter(handlerContext: HandlerContext) {
    const router = createPlaywrightRouter();

    // Register a route for each shipped Playwright handler
    for (const [platform, handler] of Object.entries(PLAYWRIGHT_HANDLERS)) {
        router.addHandler(platform, async (context) => {
            log.info(`Playwright handler: ${platform}`, { url: context.request.url });

            try {
                const items: ScrapedItem[] = await handler.handle(context, handlerContext);
                const dataset = await Actor.openDataset();

                for (const item of items) {
                    if (!handler.validate(item.data)) {
                        item.errors.push('Schema validation warning: unexpected data shape');
                        log.warning('Data validation failed', { platform, url: context.request.url });
                    }
                    await dataset.pushData(item);
                }

                log.info(`Scraped ${items.length} items`, { platform, url: context.request.url });
            } catch (error) {
                const msg = error instanceof Error ? error.message : String(error);
                log.error(`Handler failed: ${platform}`, { url: context.request.url, error: msg });

                const failedDataset = await Actor.openDataset('failed-urls');
                await failedDataset.pushData({
                    platform,
                    url: context.request.url,
                    error: msg,
                    timestamp: new Date().toISOString(),
                });
            }
        });
    }

    // Default handler for unregistered platforms
    router.addDefaultHandler(async (context) => {
        const platform = context.request.label ?? 'unknown';
        log.error(`No shipped Playwright handler for platform: ${platform}`, {
            url: context.request.url,
        });

        const failedDataset = await Actor.openDataset('failed-urls');
        await failedDataset.pushData({
            platform,
            url: context.request.url,
            error: `Handler not yet shipped for platform: ${platform}`,
            timestamp: new Date().toISOString(),
        });
    });

    return router;
}

/**
 * Get all registered platform identifiers across both crawler types.
 * @returns Array of platform names that have shipped handlers.
 */
export function getRegisteredPlatforms(): string[] {
    return [
        ...Object.keys(CHEERIO_HANDLERS),
        ...Object.keys(PLAYWRIGHT_HANDLERS),
    ];
}
