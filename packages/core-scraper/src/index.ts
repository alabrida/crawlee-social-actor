import { Actor } from 'apify';
import { runActor } from './main.js';

/**
 * Main entry point for the core scraper logic.
 * This can be imported by different wrapper apps to execute the scraping pipeline
 * with specific configurations.
 */
export async function executeScraper(configOverrides = {}) {
    // In a more advanced version, we would pass configOverrides to runActor
    // For now, it pulls from the local storage/key_value_stores/default/INPUT.json
    // as per the current implementation in main.ts
    await runActor();
}
