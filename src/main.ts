/**
 * @module main
 * @description Apify Actor entry point for the Crawlee social media scraping actor.
 * Reads input, initializes shared infrastructure, and dispatches to platform handlers.
 */

import { Actor } from 'apify';
import { log } from './utils/logger.js';
import { getHandler } from './routes.js';
import type { ActorInput, Platform, ScrapedItem } from './types.js';

/**
 * Main actor function. Initializes the Apify Actor, reads input,
 * and dispatches each URL to the appropriate platform handler.
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

    const dataset = await Actor.openDataset();
    const failedUrls: { platform: string; url: string; error: string }[] = [];

    for (const entry of input.urls) {
        const platform = entry.platform as Platform;

        // Skip if platform is not enabled
        if (!input.platforms.includes(platform)) {
            log.info(`Skipping disabled platform: ${platform}`, { url: entry.url });
            continue;
        }

        const handler = getHandler(platform);
        if (!handler) {
            log.error(`No handler for platform: ${platform}`);
            failedUrls.push({ platform, url: entry.url, error: 'No handler registered' });
            continue;
        }

        try {
            const items: ScrapedItem[] = await handler.handle(entry.url);

            for (const item of items) {
                if (!handler.validate(item.data)) {
                    item.errors.push('Schema validation warning: unexpected data shape');
                    log.warning('Data validation failed', { platform, url: entry.url });
                }
                await dataset.pushData(item);
            }

            log.info(`Successfully scraped: ${entry.url}`, { platform, itemCount: items.length });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            log.error(`Failed to scrape: ${entry.url}`, { platform, error: errorMessage });
            failedUrls.push({ platform, url: entry.url, error: errorMessage });
        }
    }

    // Push failed URLs to a separate dataset for manual review
    if (failedUrls.length > 0) {
        const failedDataset = await Actor.openDataset('failed-urls');
        for (const failed of failedUrls) {
            await failedDataset.pushData(failed);
        }
        log.warning(`${failedUrls.length} URLs failed. See 'failed-urls' dataset.`);
    }

    log.info('Actor finished', {
        totalUrls: input.urls.length,
        failedCount: failedUrls.length,
    });

    await Actor.exit();
}

main();
