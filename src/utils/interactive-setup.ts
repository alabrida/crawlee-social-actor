/**
 * @module interactive-setup
 * @description Logic to handle the interactive login flow, enabling users
 * to log into social media platforms to securely store their session cookies.
 */

import { PlaywrightCrawler, RequestQueue } from 'crawlee';
import { log } from './logger.js';
import { storePlatformSession, type VaultCookie } from './session-vault.js';
import type { Platform } from '../types.js';

/** Platforms that require authentication for scraping. */
const AUTH_PLATFORMS = [
    { platform: 'linkedin', url: 'https://www.linkedin.com/login', authCookie: 'li_at' },
    { platform: 'facebook', url: 'https://www.facebook.com/login', authCookie: 'c_user' },
    { platform: 'instagram', url: 'https://www.instagram.com/accounts/login/', authCookie: 'sessionid' },
    { platform: 'twitter', url: 'https://twitter.com/i/flow/login', authCookie: 'auth_token' },
];

/**
 * Run the interactive session setup.
 * Uses a PlaywrightCrawler with headless:false to native integrate with Apify Live View.
 * The user will be able to connect and log into each of the specified platforms.
 *
 * @param requestedPlatforms Array of platforms that the user has enabled in input.
 */
export async function runInteractiveSessionSetup(requestedPlatforms: Platform[]): Promise<void> {
    log.info('[Interactive Setup] Starting Interactive Session Vault Setup via PlaywrightCrawler...');

    const platformsToProcess = AUTH_PLATFORMS.filter(p => requestedPlatforms.includes(p.platform as Platform));

    if (platformsToProcess.length === 0) {
        log.warning('[Interactive Setup] No authenticated platforms requested in input. Exiting.');
        return;
    }

    const requestQueue = await RequestQueue.open();
    for (const { platform, url, authCookie } of platformsToProcess) {
        await requestQueue.addRequest({
            url,
            userData: { platform, authCookie }
        });
    }

    const crawler = new PlaywrightCrawler({
        requestQueue,
        maxConcurrency: 1, // Only 1 interactive session at a time
        launchContext: {
            launchOptions: {
                headless: false, // REQUIRED for Live View
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                ]
            }
        },
        requestHandlerTimeoutSecs: 240, // Allow up to 4 minutes per platform
        async requestHandler({ page, request }) {
            const { platform, authCookie } = request.userData;
            log.info(`[Interactive Setup] Loaded ${platform} login page.`);
            log.info(`[Interactive Setup] Waiting for user to log into ${platform}...`);
            log.info(`[Interactive Setup] Looking for auth cookie: ${authCookie}`);
            log.info(`Please use Apify Live View to interact with the browser and log in.`);

            let isAuthenticated = false;
            let platformCookies: VaultCookie[] = [];
            const context = page.context();

            // Poll for the auth cookie up to 3 minutes (36 attempts * 5000ms)
            for (let i = 0; i < 36; i++) {
                const currentCookies = await context.cookies();
                const targetCookie = currentCookies.find(c => c.name === authCookie);

                if (targetCookie) {
                    isAuthenticated = true;
                    log.info(`[Interactive Setup] Login successful for ${platform}! Found auth cookie: ${authCookie}`);

                    let platformDomain = new URL(request.url).hostname.replace('www.', '');
                    if (platform === 'twitter') platformDomain = 'x.com';

                    platformCookies = currentCookies
                        .filter(c => c.domain.includes(platformDomain))
                        .map(c => ({
                            name: c.name,
                            value: c.value,
                            domain: c.domain,
                            path: c.path,
                        }));
                    break;
                }

                // Wait 5 seconds before checking again
                await page.waitForTimeout(5000);
            }

            if (isAuthenticated && platformCookies.length > 0) {
                await storePlatformSession(platform as Platform, platformCookies);
                log.info(`[Interactive Setup] Successfully stored authenticated session for ${platform}.`);
            } else {
                log.warning(`[Interactive Setup] Authentication timeout for ${platform}. No valid session saved. Did you log in?`);
            }
        },
        failedRequestHandler({ request }) {
            log.error(`[Interactive Setup] Failed to process ${request.userData.platform}`);
        }
    });

    log.info('[Interactive Setup] Running PlaywrightCrawler for interactive login...');
    await crawler.run();
    log.info('[Interactive Setup] Interactive setup complete.');
}
