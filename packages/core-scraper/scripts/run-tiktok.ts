import { CheerioCrawler, log } from 'crawlee';
import tiktokHandler from './src/handlers/tiktok.js';

log.setLevel(log.LEVELS.INFO);

const urls = [
    'https://www.tiktok.com/@tiktok',
    'https://www.tiktok.com/@charlidamelio',
    'https://www.tiktok.com/@khaby.lame'
];

async function runTest() {
    const crawler = new CheerioCrawler({
        maxRequestRetries: 1,
        requestHandler: async (context) => {
            const { request, response, baseLog } = context;
            
            // Check for block first
            const body = response?.body?.toString('utf-8') || '';
            if (tiktokHandler.detectBlock(body)) {
                baseLog.warning(`Block detected on ${request.url}`);
                // normally we would throw or retire session, but we'll print it here
                return;
            }
            
            // Try extracting
            try {
                const items = await tiktokHandler.handle(context, {} as any);
                baseLog.info(`Scraped ${items.length} items`);
                
                // Validate
                for (const item of items) {
                    const isValid = tiktokHandler.validate(item as any);
                    baseLog.info(`Validation passed: ${isValid}`);
                    console.log(JSON.stringify(item, null, 2));
                }
            } catch (err) {
                baseLog.error(`Error in handle(): ${(err as Error).message}`);
            }
        }
    });

    await crawler.run(urls);
}

runTest();
