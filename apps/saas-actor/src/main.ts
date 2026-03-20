import { executeScraper } from '@alabrida/core-scraper';

// Deployment-specific configuration for the SaaS Actor
console.log('Starting SaaS Scraper Actor...');

await executeScraper({
    mode: 'SAAS',
    detailLevel: 'STANDARD'
});
