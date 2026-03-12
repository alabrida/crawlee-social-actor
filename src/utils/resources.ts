/**
 * @module resources
 * @description Resource-blocking middleware for Playwright sessions.
 * @see G-COST-02 — All Playwright sessions must block images, media, and fonts.
 */

import type { Page } from 'playwright';
import { log } from './logger.js';

/** Resource types to block by default. */
const BLOCKED_RESOURCE_TYPES = ['image', 'media', 'font'] as const;

/**
 * Apply resource-blocking to a Playwright page to minimize proxy bandwidth.
 * Must be called on every Playwright page before navigation.
 * @param page - The Playwright Page instance to configure.
 * @param additionalTypes - Optional additional resource types to block.
 * @returns Promise that resolves when route interception is configured.
 */
export async function blockResources(
    page: Page,
    additionalTypes: string[] = [],
): Promise<void> {
    const blockedTypes = new Set([...BLOCKED_RESOURCE_TYPES, ...additionalTypes]);

    await page.route('**/*', (route) => {
        const resourceType = route.request().resourceType();
        if (blockedTypes.has(resourceType)) {
            return route.abort();
        }
        return route.continue();
    });

    log.debug(`Resource blocking enabled: ${[...blockedTypes].join(', ')}`);
}
