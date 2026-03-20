import { executeScraper } from '@alabrida/core-scraper';

// Deployment-specific configuration for the Public Marketplace Actor
console.log('Starting Public Marketplace Actor...');

await executeScraper({
    mode: 'MARKETPLACE',
    detailLevel: 'PUBLIC'
});
