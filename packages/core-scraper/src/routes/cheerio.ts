/**
 * @module routes/cheerio
 * @description Cheerio router builder.
 */

import { createCheerioRouter, Dataset } from 'crawlee';
import { Actor } from 'apify';
import { createHash } from 'crypto';
import { log } from '../utils/logger.js';
import { enrichItem } from '../utils/enrichment.js';
import type { HandlerContext, CheerioHandler, ScrapedItem } from '../types.js';
import redditHandler from '../handlers/reddit.js';

let failedDatasetPromise: Promise<Dataset> | null = null;

function getFailedDataset(): Promise<Dataset> {
    if (!failedDatasetPromise) {
        failedDatasetPromise = Actor.openDataset('failed-urls');
    }
    return failedDatasetPromise;
}

const CHEERIO_HANDLERS: Record<string, CheerioHandler> = {
    reddit: redditHandler,
};

export function buildCheerioRouter(handlerContext: HandlerContext) {
    const router = createCheerioRouter();

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
                    
                    const enrichedItem = await enrichItem(item);
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

                const failedDataset = await getFailedDataset();
                await failedDataset.pushData({
                    platform,
                    url: context.request.url,
                    error: msg,
                    timestamp: new Date().toISOString(),
                });
            }
        });
    }

    router.addDefaultHandler(async (context) => {
        const platform = context.request.label ?? 'unknown';
        log.error(`No shipped Cheerio handler for platform: ${platform}`, {
            url: context.request.url,
        });

        const failedDataset = await getFailedDataset();
        await failedDataset.pushData({
            platform,
            url: context.request.url,
            error: `Handler not yet shipped for platform: ${platform}`,
            timestamp: new Date().toISOString(),
        });
    });

    return router;
}
