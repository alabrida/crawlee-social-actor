/**
 * @module routes/playwright
 * @description Playwright router builder.
 */

import { createPlaywrightRouter, Dataset } from 'crawlee';
import { Actor } from 'apify';
import { log } from '../utils/logger.js';
import { enrichItem } from '../utils/enrichment.js';
import { reportIssue } from '../utils/issue-log.js';
import type { HandlerContext, PlaywrightHandler, ScrapedItem } from '../types.js';

import tiktokHandler from '../handlers/tiktok.js';
import youtubeHandler from '../handlers/youtube.js';
import googleMapsHandler from '../handlers/google-maps.js';
import pinterestHandler from '../handlers/pinterest.js';
import linkedinHandler from '../handlers/linkedin.js';
import facebookHandler from '../handlers/facebook.js';
import instagramHandler from '../handlers/instagram.js';
import twitterHandler from '../handlers/twitter.js';
import seoSerpHandler from '../handlers/seo-serp.js';
import generalHandler from '../handlers/general.js';

let defaultDatasetPromise: Promise<Dataset> | null = null;
let failedDatasetPromise: Promise<Dataset> | null = null;

function getDefaultDataset(): Promise<Dataset> {
    if (!defaultDatasetPromise) {
        defaultDatasetPromise = Actor.openDataset();
    }
    return defaultDatasetPromise;
}

function getFailedDataset(): Promise<Dataset> {
    if (!failedDatasetPromise) {
        failedDatasetPromise = Actor.openDataset('failed-urls');
    }
    return failedDatasetPromise;
}

const PLAYWRIGHT_HANDLERS: Record<string, PlaywrightHandler> = {
    youtube: youtubeHandler,
    tiktok: tiktokHandler,
    google_maps: googleMapsHandler,
    'google-maps': googleMapsHandler,
    google_business_profile: googleMapsHandler,
    pinterest: pinterestHandler,
    linkedin: linkedinHandler,
    facebook: facebookHandler,
    instagram: instagramHandler,
    twitter: twitterHandler,
    seo_serp: seoSerpHandler,
    general: generalHandler,
    general_hub: generalHandler,
};

export function buildPlaywrightRouter(handlerContext: HandlerContext) {
    const router = createPlaywrightRouter();

    for (const [platform, handler] of Object.entries(PLAYWRIGHT_HANDLERS)) {
        router.addHandler(platform, async (context) => {
            log.info(`Playwright handler: ${platform}`, { url: context.request.url });

            try {
                const items: ScrapedItem[] = await handler.handle(context, handlerContext);
                
                let screenshotUrl = '';
                try {
                    await context.page.waitForTimeout(4000);
                    
                    const screenshotKey = `screenshot_${context.request.id}.png`;
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

                const dataset = await getDefaultDataset();

                for (const item of items) {
                    if (!handler.validate(item.data)) {
                        item.errors.push('Schema validation warning: unexpected data shape');
                        log.warning('Data validation failed', { platform, url: context.request.url });
                    }
                    
                    item.data.screenshotUrl = screenshotUrl;
                    if (!screenshotUrl) {
                        item.errors.push('Mandatory screenshot failed to capture.');
                    }

                    const enrichedItem = await enrichItem(item);
                    await dataset.pushData(enrichedItem);
                    
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
        log.error(`No shipped Playwright handler for platform: ${platform}`, {
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
