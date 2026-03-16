
import { Actor } from 'apify';
import { CheerioCrawler, log } from 'crawlee';
import tiktokHandler from './dist/handlers/tiktok.js';

log.setLevel(log.LEVELS.INFO);

const urls = [
    'https://www.tiktok.com/@tiktok',
    'https://www.tiktok.com/@charlidamelio',
];

await Actor.main(async () => {
    const crawler = new CheerioCrawler({
        maxRequestRetries: 1,
        requestHandler: async (context) => {
            const { request, response, baseLog } = context;
            const body = response?.body?.toString('utf-8') || '';
            if (tiktokHandler.detectBlock(body)) {
                baseLog.warning(\Block detected on \\);
                return;
            }
            try {
                const items = await tiktokHandler.handle(context, {} as any);
                baseLog.info(\Scraped \ items\);
                for (const item of items) {
                    baseLog.info(\Validation passed: \\);
                    console.log(JSON.stringify(item, null, 2));
                }
            } catch (err) {
                baseLog.error(\Error: \\);
            }
        }
    });

    await crawler.run(urls);
});

