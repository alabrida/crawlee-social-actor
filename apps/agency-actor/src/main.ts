import { executeScraper } from '@alabrida/core-scraper';

// Deployment-specific configuration for the Agency Actor
// This variant might focus on higher data quality or different output destinations
console.log('Starting Alabrida Agency Actor...');

await executeScraper({
    mode: 'AGENCY',
    detailLevel: 'HIGH'
});
