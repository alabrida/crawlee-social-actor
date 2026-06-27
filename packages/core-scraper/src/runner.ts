/**
 * @module runner
 * @description Runs the Cheerio and Playwright crawlers.
 */

import { CheerioCrawler, PlaywrightCrawler } from 'crawlee';
import { Actor } from 'apify';
import { log } from './utils/logger.js';
import { getRandomUserAgent } from './utils/ua-rotation.js';
import { buildCheerioRouter } from './routes/cheerio.js';
import { buildPlaywrightRouter } from './routes/playwright.js';
import { injectCookies, getCookieHeaderString } from './utils/auth.js';
import { createProxyConfig } from './utils/proxy.js';
import { isRedditApiEnabled, getRedditAccessToken, redditRequestHeaders, toOauthUrls } from './api/reddit.js';
import { handleScreenshotCollection } from './screenshot.js';
import type { ActorInput, Platform, HandlerContext, UrlEntry } from './types.js';


/**
 * Helper to build a PlaywrightCrawler with standard configurations.
 */
function createPlaywrightCrawler(
    requestQueue: any,
    playwrightRouter: any,
    proxyConfig: any,
    input: ActorInput,
    options?: { maxConcurrency?: number; gentle?: boolean }
): PlaywrightCrawler {
    return new PlaywrightCrawler({
        requestQueue,
        requestHandler: playwrightRouter,
        proxyConfiguration: proxyConfig as any,
        useSessionPool: true,
        // Each platform makes ~1 authenticated request and platforms don't share cookies, so a
        // per-platform session already presents each cookie from a single IP. A pool size of 1
        // (tried once) gave no extra account-protection but concentrated all load on one exit and
        // tripped a 429 on LinkedIn — so keep a normal pool. The real protections are the country
        // lock (proxy.ts) and dropping the account-settings pre-flight probe (health-check.ts).
        sessionPoolOptions: {
            maxPoolSize: 100,
            sessionOptions: {
                maxUsageCount: 50,
            },
        },
        browserPoolOptions: {
            useFingerprints: true,
        },
        maxConcurrency: options?.maxConcurrency ?? Math.min(input.maxConcurrency, 5),
        maxRequestRetries: input.maxRequestRetries,
        requestHandlerTimeoutSecs: 180,
        // Heavy JS sites (BestBuy, LinkedIn, Google SERP) frequently never fire the
        // `load` event, so wait only for `domcontentloaded` (set in the hook below).
        // Keep the 60s ceiling: bot-detected retail homepages (BestBuy) on datacenter
        // proxy can be slow to even reach domcontentloaded and need the headroom.
        navigationTimeoutSecs: 60,
        launchContext: {
            launchOptions: {
                args: ['--disable-blink-features=AutomationControlled'],
            },
        },
        preNavigationHooks: [
            // Make `domcontentloaded` the default waitUntil for the framework's own
            // navigation (handlers may still re-navigate with their own options).
            async (_ctx, gotoOptions) => {
                if (gotoOptions) {
                    gotoOptions.waitUntil = 'domcontentloaded';
                    gotoOptions.timeout = 60000;
                }
            },
            async ({ page, request }) => {
                const platform = request.userData.platform as Platform;
                const slot = request.userData.sessionSlot;

                // Try slot-specific token first, fallback to platform default
                let tokenString = (slot && input.authTokens) ? (input.authTokens as any)[slot] : undefined;
                if (!tokenString && input.authTokens) {
                    tokenString = (input.authTokens as any)[platform];
                }

                // Fallback for Google Business / Maps platforms to use the generic 'google' auth token
                if (!tokenString && input.authTokens && (platform === 'google_maps' || platform === 'google_business_profile')) {
                    tokenString = input.authTokens.google;
                }

                if (tokenString) {
                    await injectCookies(page, platform, tokenString, request.url);
                }

                // Gentle mode: human-like jitter before navigating. Combined with serial
                // (concurrency 1) execution, this avoids hammering anti-bot-sensitive
                // platforms (Meta especially) and protects freshly-issued sessions from
                // tripping a security checkpoint.
                if (options?.gentle) {
                    await page.waitForTimeout(1500 + Math.floor(Math.random() * 2500));
                }
            },
        ],
    });
}

/**
 * Runs the Playwright crawler for browser-required platforms and for capturing
 * screenshots of Cheerio-extracted platforms.
 */
export async function runPlaywrightCrawler(
    input: ActorInput,
    handlerContext: HandlerContext,
    proxyConfiguration: any,
    playwrightUrls: UrlEntry[],
    cheerioUrls: UrlEntry[]
): Promise<void> {
    log.info(`Running PlaywrightCrawler for screenshots and browser platforms`);

    const playwrightRouter = buildPlaywrightRouter(handlerContext);
    playwrightRouter.addHandler('screenshot-collector', handleScreenshotCollection);

    // The general hub + its subpages go residential: heavy retail/brand sites (e.g.
    // BestBuy) bot-block datacenter IPs, yielding ~30s TTFB and a thin page that hides
    // forms/checkout/chat — which collapses the conversion + classification scoring.
    const residentialPlatforms = new Set(['linkedin', 'instagram', 'tiktok', 'twitter', 'facebook', 'general', 'general_hub']);
    const residentialUrls = playwrightUrls.filter(entry => residentialPlatforms.has(entry.platform));
    const datacenterUrls = playwrightUrls.filter(entry => !residentialPlatforms.has(entry.platform));

    const dcRequests = datacenterUrls.map(entry => {
        let targetUrl = entry.url;
        if (!targetUrl.startsWith('http')) {
            if (entry.platform === 'google_maps' || entry.platform === 'google_business_profile') {
                targetUrl = `https://www.google.com/maps/search/${encodeURIComponent(targetUrl)}`;
            } else {
                targetUrl = `https://www.google.com/search?q=${encodeURIComponent(targetUrl)}`;
            }
        }
        return {
            url: targetUrl,
            label: entry.platform,
            userData: { platform: entry.platform, sessionSlot: entry.sessionSlot },
        };
    });

    const screenshotRequests = cheerioUrls.map(entry => ({
        url: entry.url.startsWith('http') ? entry.url : `https://www.google.com/search?q=${encodeURIComponent(entry.url)}`,
        label: 'screenshot-collector',
        userData: { platform: entry.platform, originalUrl: entry.url },
    }));

    const resRequests = residentialUrls.map(entry => {
        let targetUrl = entry.url;
        if (!targetUrl.startsWith('http')) {
            targetUrl = `https://www.google.com/search?q=${encodeURIComponent(targetUrl)}`;
        }
        // Navigate X on its canonical host so injected auth_token/ct0 cookies apply
        // without a twitter.com -> x.com redirect that drops the session into a login wall.
        if (entry.platform === 'twitter') {
            targetUrl = targetUrl.replace(/(?:www\.)?twitter\.com/i, 'x.com');
        }
        return {
            url: targetUrl,
            label: entry.platform,
            userData: { platform: entry.platform, sessionSlot: entry.sessionSlot },
        };
    });

    // 1. Run Datacenter crawler if there are DC or screenshot requests
    if (dcRequests.length > 0 || screenshotRequests.length > 0) {
        log.info(`Running Playwright Datacenter Crawler for ${dcRequests.length} pages and ${screenshotRequests.length} screenshots`);
        const dcQueue = await Actor.openRequestQueue('playwright-datacenter');
        await dcQueue.addRequests([...dcRequests, ...screenshotRequests]);

        const dcProxy = input.proxy ? await createProxyConfig(input.proxy, 'datacenter') : proxyConfiguration;
        const dcCrawler = createPlaywrightCrawler(dcQueue, playwrightRouter, dcProxy, input);
        await dcCrawler.run();
    }

    // 2. Run Residential crawler if there are residential requests
    if (resRequests.length > 0) {
        log.info(`Running Playwright Residential Crawler for ${resRequests.length} pages`);
        const resQueue = await Actor.openRequestQueue('playwright-residential');
        await resQueue.addRequests(resRequests);

        const resProxy = input.proxy ? await createProxyConfig(input.proxy, 'residential') : proxyConfiguration;
        // Sensitive platforms (LinkedIn/Meta/X/TikTok): run serially with jitter to stay
        // under anti-bot radar and protect freshly-issued sessions.
        const resCrawler = createPlaywrightCrawler(resQueue, playwrightRouter, resProxy, input, { maxConcurrency: 1, gentle: true });
        await resCrawler.run();
    }
}

/**
 * Runs the Cheerio crawler for lightweight, non-browser platforms.
 */
export async function runCheerioCrawler(
    input: ActorInput,
    handlerContext: HandlerContext,
    proxyConfiguration: any,
    cheerioUrls: UrlEntry[]
): Promise<void> {
    if (cheerioUrls.length === 0) return;

    log.info(`Running CheerioCrawler for ${cheerioUrls.length} URLs`);

    // Reddit (2026): unauthenticated/no-OAuth traffic is rejected with 403, so use the
    // official OAuth2 API on oauth.reddit.com when credentials are configured. Falls
    // back to the public .json endpoint otherwise (best-effort, will likely 403).
    const redditToken = isRedditApiEnabled() ? await getRedditAccessToken() : null;

    const cheerioQueue = await Actor.openRequestQueue();
    for (const entry of cheerioUrls) {
        let targetUrl = entry.url;
        if (entry.platform === 'reddit') {
            const oauth = redditToken ? toOauthUrls(entry.url) : null;
            if (oauth) {
                targetUrl = oauth.aboutUrl;
            } else {
                targetUrl = targetUrl.replace(/\/$/, '');
                if (!targetUrl.endsWith('.json')) {
                    targetUrl += '/about.json';
                }
            }
        }
        await cheerioQueue.addRequest({
            url: targetUrl,
            label: entry.platform,
            userData: { platform: entry.platform, originalUrl: entry.url },
        });
    }

    const cheerioRouter = buildCheerioRouter(handlerContext);
    const cheerioProxy = input.proxy ? await createProxyConfig(input.proxy, 'residential') : proxyConfiguration;

    const cheerioCrawler = new CheerioCrawler({
        requestQueue: cheerioQueue,
        requestHandler: cheerioRouter,
        proxyConfiguration: cheerioProxy as any,
        useSessionPool: true,
        sessionPoolOptions: {
            maxPoolSize: 100,
            sessionOptions: {
                maxUsageCount: 50,
            },
        },
        maxConcurrency: input.maxConcurrency,
        maxRequestRetries: input.maxRequestRetries,
        additionalMimeTypes: ['application/json'],
        preNavigationHooks: [
            (context, options) => {
                const reqUrl = context.request.url;

                // Authenticated Reddit API requests need the bearer token + descriptive UA.
                if (redditToken && reqUrl.includes('oauth.reddit.com')) {
                    options.headers = {
                        ...options.headers,
                        ...redditRequestHeaders(redditToken),
                    };
                    return;
                }

                // Interim Reddit path: inject the operator's Reddit session cookie so the
                // public endpoints don't 403. Reddit rejects generic/bot agents, so pair
                // it with a real browser UA rather than the descriptive API agent.
                if (reqUrl.includes('reddit.com')) {
                    const redditCookie = input.authTokens?.reddit;
                    options.headers = {
                        ...options.headers,
                        'User-Agent': getRandomUserAgent(),
                        ...(redditCookie ? { 'Cookie': getCookieHeaderString(redditCookie) } : {}),
                    };
                    return;
                }

                options.headers = {
                    ...options.headers,
                    'User-Agent': getRandomUserAgent(),
                    'Cookie': 'SOCS=CAESEwgDEgk0ODE3Nzk3MjQaAmVuIAEaBgiA_LyaBg',
                };
            },
        ],
    });

    await cheerioCrawler.run();
}
