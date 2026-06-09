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
    _url: string
): Promise<void> {
    if (!tokenString) return;

    try {
        // Strict mapping of platform to allowed domains to prevent cookie leakage
        // to arbitrary domains requested by malicious users.
        const platformDomains: Partial<Record<Platform, string[]>> = {
            linkedin: ['.linkedin.com'],
            facebook: ['.facebook.com'],
            instagram: ['.instagram.com'],
            twitter: ['.twitter.com', '.x.com'],
            tiktok: ['.tiktok.com'],
            youtube: ['.youtube.com'],
            pinterest: ['.pinterest.com'],
            reddit: ['.reddit.com'],
            google_maps: ['.google.com'],
            google_business_profile: ['.google.com'],
        };

        const allowedDomains = platformDomains[platform];

        if (!allowedDomains || allowedDomains.length === 0) {
            log.warning(`[Auth] No strict domain mapping found for platform: ${platform}. Skipping cookie injection.`);
            return;
        }

        const cookiesToInject: any[] = [];

        if (tokenString.trim().startsWith('{')) {
            try {
                const state = JSON.parse(tokenString);
                if (state.cookies && Array.isArray(state.cookies)) {
                    for (const c of state.cookies) {
                        const domainMatches = allowedDomains.some(domain =>
                            c.domain && (c.domain === domain || c.domain.endsWith(domain))
                        );
                        if (domainMatches) {
                            cookiesToInject.push({
                                name: c.name,
                                value: c.value,
                                domain: c.domain,
                                path: c.path || '/',
                                expires: c.expires,
                                httpOnly: c.httpOnly,
                                secure: c.secure,
                                sameSite: c.sameSite
                            });
                        }
                    }
                }
            } catch (e: any) {
                log.error(`[Auth] Failed to parse storageState JSON: ${e.message}`);
            }
        } else {
            const parsedCookies = tokenString.split(';')
                .map((c: string) => c.trim())
                .filter((c: string) => c)
                .map((c: string) => {
                    const sepIndex = c.indexOf('=');
                    if (sepIndex === -1) return null;
                    const name = c.substring(0, sepIndex);
                    const value = c.substring(sepIndex + 1);
                    return { name, value, path: '/' };
                })
                .filter((c: any): c is any => c !== null);

            for (const domain of allowedDomains) {
                for (const c of parsedCookies) {
                    cookiesToInject.push({
                        name: c.name,
                        value: c.value,
                        domain,
                        path: c.path
                    });
                }
            }
        }

        if (cookiesToInject.length > 0) {
            console.log(`[DEBUG] Injecting ${cookiesToInject.length} cookies for ${platform} onto domains: ${allowedDomains.join(', ')}`);
            log.info(`Injecting ${cookiesToInject.length} auth cookies for ${platform}`);
            await page.context().addCookies(cookiesToInject);
        }
    } catch (e: any) {
        log.error(`[Auth] Failed to inject cookies for ${platform}: ${e.message}`);
    }
}
