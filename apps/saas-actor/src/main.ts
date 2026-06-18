import { executeScraper, log } from '@alabrida/core-scraper';

// Deployment-specific configuration for the SaaS Actor
log.info('Starting SaaS Scraper Actor...');

await executeScraper({
    mode: 'SAAS',
    detailLevel: 'STANDARD'
});
