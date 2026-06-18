import { executeScraper, log } from '@alabrida/core-scraper';

// Deployment-specific configuration for the Public Marketplace Actor
log.info('Starting Public Marketplace Actor...');

await executeScraper({
    mode: 'MARKETPLACE',
    detailLevel: 'PUBLIC'
});
