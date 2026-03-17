/**
 * @module routes
 * @description Router builders for CheerioCrawler and PlaywrightCrawler.
 * Handlers are wired in during the SHIP phase by the Integration Lead.
 * Only shipped handlers should be uncommented in the registry.
 */

import { createCheerioRouter, createPlaywrightRouter } from 'crawlee';
import { Actor } from 'apify';
import { createHash } from 'crypto';
import { log } from './utils/logger.js';
import { enrichItem } from './utils/enrichment.js';
import type {
    HandlerContext,
    CheerioHandler,
    PlaywrightHandler,
    ScrapedItem,
} from './types.js';
import { reportIssue } from './utils/issue-log.js';

// --- Handler imports ---
// Handlers are imported and registered after passing the SHIP gate.
// Uncomment each handler as it is shipped.
// Sprint 1:
import tiktokHandler from './handlers/tiktok.js';
import youtubeHandler from './handlers/youtube.js';
// Sprint 4:
import redditHandler from './handlers/reddit.js';
// Sprint 3:
import googleMapsHandler from './handlers/google-maps.js';
import pinterestHandler from './handlers/pinterest.js';
// Sprint 4:
import linkedinHandler from './handlers/linkedin.js';
// Sprint 5:
import metaHandler from './handlers/meta.js';
import twitterHandler from './handlers/twitter.js';
import seoSerpHandler from './handlers/seo-serp.js';
// Sprint 6:
import generalHandler from './handlers/general.js';

/**
 * Registry of shipped CheerioCrawler handlers.
 * Handlers are added here after passing the SHIP gate.
 */
const CHEERIO_HANDLERS: Record<string, CheerioHandler> = {
    youtube: youtubeHandler,
    reddit: redditHandler,
};

/**
 * Registry of shipped PlaywrightCrawler handlers.
 * Handlers are added here after passing the SHIP gate.
 */
const PLAYWRIGHT_HANDLERS: Record<string, PlaywrightHandler> = {
    tiktok: tiktokHandler,
    google_maps: googleMapsHandler,
    'google-maps': googleMapsHandler,
    google_business_profile: googleMapsHandler,
    pinterest: pinterestHandler,
    linkedin: linkedinHandler,
    facebook: metaHandler,
    instagram: metaHandler,
    twitter: twitterHandler,
    seo_serp: seoSerpHandler,
    general: generalHandler,
    general_hub: generalHandler,
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
                
                for (const item of items) {
                    if (!handler.validate(item.data)) {
                        item.errors.push('Schema validation warning: unexpected data shape');
                        log.warning('Data validation failed', { platform, url: context.request.url });
                    }
                    
                    // Phase 2: High-Res Enrichment
                    const enrichedItem = await enrichItem(item);
                    
                    // Use originalUrl from userData for stable key instead of context.request.url
                    // which might be rewritten (e.g. for Reddit .json)
                    const targetKeyUrl = context.request.userData.originalUrl || context.request.url;
                    const urlHash = createHash('md5').update(targetKeyUrl).digest('hex');
                    const dataKey = `data_${urlHash}`;
                    await Actor.setValue(dataKey, enrichedItem);
                    log.info(`Saved Enriched Cheerio data to KVS: ${dataKey} for ${targetKeyUrl}`, { platform, url: context.request.url });
                }

                log.info(`Scraped ${items.length} items (staged in KVS)`, { platform, url: context.request.url });
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
                
                // Capture screenshot for the native Playwright platform
                let screenshotUrl = '';
                try {
                    // Phase 2: Wait for images and layouts to settle before screenshot
                    await context.page.waitForTimeout(4000);
                    
                    const screenshotKey = `screenshot_${context.request.id}.png`;
                    // Defensive screenshot - try fullPage but fallback to viewport if it hangs
                    let screenshotBuffer;
                    try {
                        screenshotBuffer = await context.page.screenshot({ fullPage: true, timeout: 20000 });
                    } catch (e) {
                        log.warning(`Full-page screenshot failed for ${context.request.url}, capturing viewport instead.`);
                        screenshotBuffer = await context.page.screenshot({ fullPage: false });
                    }
                    
                    await Actor.setValue(screenshotKey, screenshotBuffer, { contentType: 'image/png' });
                    const storeId = Actor.getEnv().defaultKeyValueStoreId || 'default';
                    screenshotUrl = `https://api.apify.com/v2/key-value-stores/${storeId}/records/${screenshotKey}`;
                } catch (screenshotError: unknown) {
                    const msg = screenshotError instanceof Error ? screenshotError.message : String(screenshotError);
                    log.error(`Failed to capture screenshot for ${context.request.url}: ${msg}`);
                }

                const dataset = await Actor.openDataset();

                for (const item of items) {
                    if (!handler.validate(item.data)) {
                        item.errors.push('Schema validation warning: unexpected data shape');
                        log.warning('Data validation failed', { platform, url: context.request.url });
                    }
                    
                    // Attach the screenshot URL (could be empty if screenshot failed)
                    item.data.screenshotUrl = screenshotUrl;
                    if (!screenshotUrl) {
                        item.errors.push('Mandatory screenshot failed to capture.');
                    }

                    // Phase 2: High-Res Enrichment
                    const enrichedItem = await enrichItem(item);
                    await dataset.pushData(enrichedItem);
                    
                    // Finalize Issue Log if this item was blocked or has errors
                    if (item.data.conversionMarkers && (item.data.conversionMarkers as string[]).some(m => m.includes('BLOCKED'))) {
                        await reportIssue({
                            platform,
                            url: context.request.url,
                            severity: 'CRITICAL',
                            message: `Extraction finalized with BLOCKED status.`,
                            screenshotUrl,
                        });
                    }
                }

                log.info(`Scraped ${items.length} items with screenshot and enrichment`, { platform, url: context.request.url });
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
