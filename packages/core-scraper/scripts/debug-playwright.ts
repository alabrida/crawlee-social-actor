import { PlaywrightCrawler } from 'crawlee';

async function main() {
    console.log('Starting PlaywrightCrawler debug run...');
    const crawler = new PlaywrightCrawler({
        maxConcurrency: 1,
        headless: true,
        async requestHandler({ page }) {
            console.log('SUCCESS! Page title:', await page.title());
        }
    });
    await crawler.run(['https://example.com']);
}

main().catch((err) => {
    console.error('PlaywrightCrawler failed with:', err);
});
