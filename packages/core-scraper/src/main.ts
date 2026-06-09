/**
 * @module main
 * @description Apify Actor entry point for the Crawlee social media scraping actor.
 * Creates CheerioCrawler and PlaywrightCrawler instances, enqueues URLs by platform,
 * and dispatches to the correct handler via the router.
 */

import { Actor } from 'apify';
import { log } from './utils/logger.js';
import { createProxyConfig } from './utils/proxy.js';
import { calculateAssessment } from './scoring/engine.js';
import { upsertAssessment } from './utils/supabase.js';
import { cleanAssessmentPayload } from './utils/data-cleaner.js';
import { FEATURES } from './utils/mode-gate.js';
import { SessionVault } from './utils/session-vault.js';
import { runCheerioCrawler, runPlaywrightCrawler } from './runner.js';
import { checkSessionHealth } from './utils/health-check.js';
import type { ActorInput, Platform, HandlerContext, UrlEntry } from './types.js';
import { PLATFORM_CRAWLER_MAP } from './types.js';

/**
 * Sets up the Session Vault, handling interactive authentication flows
 * or pulling existing session cookies into the input.
 */
export async function setupSessionAndAuth(input: ActorInput): Promise<void> {
    const sessionVault = new SessionVault();
    await sessionVault.initialize();

    const needsRefresh = sessionVault.needsRefresh();
    if (needsRefresh) {
        log.warning('Session Vault is approaching or past the 20-day limit. Hard refresh recommended.');
    }

    if (input.interactiveSessionSetup) {
        log.info('Interactive Session Setup is requested. Launching Apify Live View flow...');
        await sessionVault.runInteractiveSetup(input.proxy);
        log.info('Interactive setup complete. Sessions saved to vault.');
    }

    if (!input.authTokens) {
        const vaultTokens = await sessionVault.getTokens();
        if (vaultTokens) {
             input.authTokens = vaultTokens;
             log.info('Loaded auth tokens from Session Vault.');
        }
    }

    input.authTokens = {
        linkedin: input.authTokens?.linkedin || process.env.AUTH_TOKENS_LINKEDIN,
        facebook: input.authTokens?.facebook || process.env.AUTH_TOKENS_FACEBOOK,
        instagram: input.authTokens?.instagram || process.env.AUTH_TOKENS_INSTAGRAM,
        twitter: input.authTokens?.twitter || process.env.AUTH_TOKENS_X,
        youtube: input.authTokens?.youtube || process.env.AUTH_TOKENS_YOUTUBE,
    };

    const activePlatforms = new Set<Platform>();
    if (input.platforms) {
        input.platforms.forEach(p => activePlatforms.add(p));
    }
    if (input.urls) {
        input.urls.forEach(u => activePlatforms.add(u.platform));
    }
    if (input.businessUrl) {
        activePlatforms.add('general_hub');
    }

    for (const platform of activePlatforms) {
        if (['linkedin', 'facebook', 'instagram', 'twitter'].includes(platform)) {
            const tokenKey = platform === 'twitter' ? 'twitter' : (platform as keyof typeof input.authTokens);
            const token = input.authTokens?.[tokenKey as keyof typeof input.authTokens];
            const check = await checkSessionHealth(platform, token);
            if (!check.ok) {
                log.error(`[Pre-flight Validation Failed] ${platform.toUpperCase()}: ${check.error}`);
                throw new Error(`Authentication token for ${platform} is invalid or expired. Please run interactiveSessionSetup to re-authenticate.`);
            }
        }
    }
}

/**
 * Prepares the URLs by combining the main input URLs with potential general hub
 * inputs and partitions them into Cheerio vs Playwright queues.
 */
export function prepareUrls(input: ActorInput): { cheerioUrls: UrlEntry[], playwrightUrls: UrlEntry[], finalUrls: UrlEntry[] } {
    const finalUrls: UrlEntry[] = input.urls || [];
    if (input.businessUrl && !finalUrls.some(u => u.platform === 'general_hub')) {
        finalUrls.push({ platform: 'general_hub', url: input.businessUrl });
    }

    const cheerioUrls: UrlEntry[] = [];
    const playwrightUrls: UrlEntry[] = [];

    for (const entry of finalUrls) {
        const platform = entry.platform as Platform;
        const crawlerType = PLATFORM_CRAWLER_MAP[platform];
        if (crawlerType === 'cheerio') {
            cheerioUrls.push(entry);
        } else {
            playwrightUrls.push(entry);
        }
    }

    return { cheerioUrls, playwrightUrls, finalUrls };
}

/**
 * Aggregates extracted data into a single master row and performs a Supabase
 * upsert if in the correct operating mode.
 */
export async function aggregateAndUpsertData(input: ActorInput, _finalUrls: UrlEntry[]): Promise<void> {
    log.info('Finalizing Master Assessment Row for true 1:1 Supabase parity...');

    const dataset = await Actor.openDataset();
    const { items } = await dataset.getData();

    const platforms: Record<string, any> = {};
    let hubForensics: any = null;
    let serpData: any = null;

    items.forEach((item: any) => {
        const p = item.platform;
        if (!p) return;

        if (p === 'general' || p === 'general_hub') {
            hubForensics = item.data;
        } else if (p === 'seo_serp') {
            serpData = item.data;
        } else {
            platforms[p] = {
                url: item.url,
                ...item.data
            };
        }
    });

    const brandName = input.brandName || hubForensics?.seo?.title || (input.businessUrl ? new URL(input.businessUrl).hostname : 'Unknown Business');
    const businessUrl = input.businessUrl || hubForensics?.seo?.canonical || '';
    const classOverride = (input as any).businessClass || null;

    // Calculate score using v2 Scoring Engine
    const scoreResult = calculateAssessment(
        platforms,
        hubForensics,
        serpData,
        brandName,
        businessUrl,
        classOverride
    );

    // Clean the payload: remove nulls/undefined while preserving valid 0 and false
    const cleanedItem = cleanAssessmentPayload(scoreResult);

    const finalDataset = await Actor.openDataset('revenue-journey-assessments');
    await finalDataset.pushData(cleanedItem);

    log.info('Master Assessment complete.', {
        columnsMapped: Object.keys(cleanedItem).length,
        outputDataset: 'revenue-journey-assessments'
    });

    if (FEATURES.directUpsert()) {
        const supabaseUrl = process.env.SUPABASE_URL || (input as any).supabaseUrl;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || (input as any).supabaseServiceKey;

        if (supabaseUrl && supabaseKey) {
            log.info('[Consultant Workflow] Internal Mode detected. Triggering direct upsert...');
            const result = await upsertAssessment(cleanedItem, supabaseUrl, supabaseKey);
            if (result.success) {
                log.info('[Consultant Workflow] Data is now live in Supabase dashboard.');
            } else {
                log.warning('[Consultant Workflow] Supabase upsert failed.');
            }
        } else {
            log.error('[Consultant Workflow] Internal Mode active but missing Supabase credentials.');
        }
    } else {
        log.info('[Marketplace/SaaS Mode] Skipping direct upsert for data privacy.');
    }
}

// Crawler execution functions are imported from ./runner.js

/**
 * Main actor function. Initializes the Apify Actor, creates crawlers,
 * enqueues URLs, and runs scrapers per crawler type.
 * @returns Promise that resolves when all URLs have been processed.
 */
export async function runActor(): Promise<void> {
    await Actor.init();

    const input = await Actor.getInput<ActorInput>();
    if (!input) {
        throw new Error('Actor input is required.');
    }

    await setupSessionAndAuth(input);

    const handlerContext: HandlerContext = { input };
    const proxyConfiguration = await createProxyConfig(input.proxy);

    const { cheerioUrls, playwrightUrls, finalUrls } = prepareUrls(input);

    log.info(`Actor started in mode: ${FEATURES.getSiloName()}`, {
        platforms: input.platforms,
        urlCount: finalUrls.length,
        maxConcurrency: input.maxConcurrency,
    });

    await runCheerioCrawler(input, handlerContext, proxyConfiguration, cheerioUrls);

    await runPlaywrightCrawler(input, handlerContext, proxyConfiguration, playwrightUrls, cheerioUrls);

    await aggregateAndUpsertData(input, finalUrls);

    await Actor.exit();
}
