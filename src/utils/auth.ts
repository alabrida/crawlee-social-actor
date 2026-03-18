import type { Page } from 'playwright';
import { log } from './logger.js';
import type { Platform } from '../types.js';

/**
 * Parses a cookie string and injects it into the Playwright page context.
 * The cookie string should be in the format: 'name1=value1; name2=value2;'
 * @param page - Playwright page object.
 * @param platform - The platform identifier (e.g., 'linkedin', 'facebook').
 * @param tokenString - Semicolon-separated cookie string.
 * @param url - The URL of the page (to determine the cookie domain).
 */
export async function injectCookies(
    page: Page,
    platform: Platform,
    tokenString: string,
    url: string
): Promise<void> {
    if (!tokenString) return;

    try {
        const urlObj = new URL(url);
        // Determine base domain (e.g., .linkedin.com, .instagram.com)
        const hostname = urlObj.hostname;
        const hostParts = hostname.split('.');
        let domain: string;

        if (hostParts.length >= 2) {
            // For standard domains, use the last two parts with a leading dot
            // This works for instagram.com, facebook.com, twitter.com, linkedin.com
            // Note: This is a simplified approach; in production, one might use a TLD list.
            domain = `.${hostParts[hostParts.length - 2]}.${hostParts[hostParts.length - 1]}`;
        } else {
            domain = hostname;
        }

        const cookies = tokenString.split(';')
            .map((c: string) => c.trim())
            .filter((c: string) => c)
            .map((c: string) => {
                const sepIndex = c.indexOf('=');
                if (sepIndex === -1) return null;
                const name = c.substring(0, sepIndex);
                const value = c.substring(sepIndex + 1);
                return {
                    name,
                    value,
                    domain,
                    path: '/'
                };
            })
            .filter((c: any): c is any => c !== null);

        if (cookies.length > 0) {
            log.debug(`Injecting ${cookies.length} cookies for ${platform} onto domain ${domain}`);
            log.info(`Injecting ${cookies.length} auth cookies for ${platform}`);
            await page.context().addCookies(cookies);
        }
    } catch (e: any) {
        log.error(`[Auth] Failed to inject cookies for ${platform}: ${e.message}`);
    }
}
