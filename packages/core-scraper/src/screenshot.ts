import { Actor } from 'apify';
import { createHash } from 'crypto';

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
