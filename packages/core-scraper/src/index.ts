import { runActor } from './main.js';
export { log } from './utils/logger.js';

/**
 * Main entry point for the core scraper logic.
 * This can be imported by different wrapper apps to execute the scraping pipeline
 * with specific configurations.
 */
export async function executeScraper(_configOverrides: Record<string, any> = {}) {
    // In a more advanced version, we would pass _configOverrides to runActor
    // For now, it pulls from the local storage/key_value_stores/default/INPUT.json
    // as per the current implementation in main.ts
    await runActor();
}
