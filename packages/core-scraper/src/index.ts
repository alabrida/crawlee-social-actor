import { runActor } from './main.js';
export { log } from './utils/logger.js';

/**
 * Main entry point for the core scraper logic.
 * This can be imported by different wrapper apps to execute the scraping pipeline
 * with specific configurations.
 */
export async function executeScraper(configOverrides: Record<string, any> = {}) {
    if (configOverrides.mode) {
        let mappedMode = configOverrides.mode.toUpperCase();
        if (mappedMode === 'AGENCY') {
            mappedMode = 'INTERNAL';
        } else if (mappedMode === 'MARKETPLACE') {
            mappedMode = 'PUBLIC';
        }
        process.env.ACTOR_MODE = mappedMode;
    }
    if (configOverrides.detailLevel) {
        process.env.DETAIL_LEVEL = String(configOverrides.detailLevel).toUpperCase();
    }
    await runActor();
}
