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
import { prepareUrls } from './utils/url-helper.js';
import { resolveBestSerp, generateRecommendedKeywords } from './scoring/keyword-helper.js';

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
        tiktok: input.authTokens?.tiktok || process.env.AUTH_TOKENS_TIKTOK,
        pinterest: input.authTokens?.pinterest || process.env.AUTH_TOKENS_PINTEREST,
        reddit: input.authTokens?.reddit || process.env.AUTH_TOKENS_REDDIT,
        google: input.authTokens?.google || process.env.AUTH_TOKENS_GOOGLE,
        ...input.authTokens,
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

    const validatedTokenKeys = new Set<string>();

    if (input.urls) {
        for (const entry of input.urls) {
            const platform = entry.platform;
            if (['linkedin', 'facebook', 'instagram', 'twitter'].includes(platform)) {
                const slot = entry.sessionSlot;
                const tokenKey = slot || (platform === 'twitter' ? 'twitter' : platform);

                if (validatedTokenKeys.has(tokenKey)) continue;
                validatedTokenKeys.add(tokenKey);

                const token = input.authTokens?.[tokenKey];
                const check = await checkSessionHealth(platform, token);
                if (!check.ok) {
                    log.error(`[Pre-flight Validation Failed] ${platform.toUpperCase()} (${tokenKey}): ${check.error}`);
                    throw new Error(`Authentication token for ${platform} (${tokenKey}) is invalid or expired. Please run interactiveSessionSetup to re-authenticate.`);
                }
            }
        }
    }

    if (input.platforms) {
        for (const platform of input.platforms) {
            if (['linkedin', 'facebook', 'instagram', 'twitter'].includes(platform)) {
                const tokenKey = platform === 'twitter' ? 'twitter' : platform;
                if (validatedTokenKeys.has(tokenKey)) continue;
                validatedTokenKeys.add(tokenKey);

                const token = input.authTokens?.[tokenKey];
                const check = await checkSessionHealth(platform, token);
                if (!check.ok) {
                    log.error(`[Pre-flight Validation Failed] ${platform.toUpperCase()}: ${check.error}`);
                    throw new Error(`Authentication token for ${platform} is invalid or expired. Please run interactiveSessionSetup to re-authenticate.`);
                }
            }
        }
    }
}



/**
 * Aggregates extracted data into a single master row and performs a Supabase
 * upsert if in the correct operating mode.
 */
export async function aggregateAndUpsertData(input: ActorInput, _finalUrls: UrlEntry[]): Promise<void> {
    log.info('Finalizing Master Assessment Row for true 1:1 Supabase parity...');

    const dataset = await Actor.openDataset();
    const { items } = await dataset.getData();

    const platforms: Record<string, any[]> = {};
    let hubForensics: any = null;
    const serpResults: any[] = [];
    const currentKeywords: string[] = [];

    items.forEach((item: any) => {
        const p = item.platform;
        if (!p) return;

        if (p === 'general' || p === 'general_hub') {
            hubForensics = item.data;
        } else if (p === 'seo_serp') {
            if (item.data) {
                serpResults.push(item.data);
                if (item.data.serpKeyword) {
                    currentKeywords.push(item.data.serpKeyword);
                }
            }
        } else {
            if (!platforms[p]) {
                platforms[p] = [];
            }
            platforms[p].push({
                url: item.url,
                ...item.data
            });
        }
    });

    const brandName = input.brandName || hubForensics?.seo?.title || (input.businessUrl ? new URL(input.businessUrl).hostname : 'Unknown Business');
    const businessUrl = input.businessUrl || hubForensics?.seo?.canonical || '';
    const classOverride = input.businessClass || null;

    // Pick the best SERP ranking result for stage score calculation
    const bestSerpData = resolveBestSerp(serpResults);

    // Calculate score using v2 Scoring Engine
    const scoreResult = calculateAssessment(
        platforms,
        hubForensics,
        bestSerpData,
        brandName,
        businessUrl,
        classOverride
    );

    // Generate recommended target keywords for future positioning
    const recommendedKeywords = generateRecommendedKeywords(scoreResult.business_class, brandName);

    // Attach keyword and competitor results to assessment_detail
    scoreResult.assessment_detail.current_keywords = currentKeywords;
    scoreResult.assessment_detail.serp_results = serpResults;
    scoreResult.assessment_detail.recommended_keywords = recommendedKeywords;

    // Clean the payload: remove nulls/undefined while preserving valid 0 and false
    const cleanedItem = cleanAssessmentPayload(scoreResult);

    const finalDataset = await Actor.openDataset('revenue-journey-assessments');
    await finalDataset.pushData(cleanedItem);

    log.info('Master Assessment complete.', {
        columnsMapped: Object.keys(cleanedItem).length,
        outputDataset: 'revenue-journey-assessments'
    });

    if (FEATURES.directUpsert()) {
        const url = process.env.SUPABASE_URL || input.supabaseUrl;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY || input.supabaseServiceKey;

        if (url && key) {
            log.info('[Consultant Workflow] Internal Mode detected. Triggering direct upsert...');
            const res = await upsertAssessment(cleanedItem, url, key);
            log.info(res.success ? '[Consultant Workflow] Live in Supabase.' : '[Consultant Workflow] Upsert failed.');
        } else {
            log.error('[Consultant Workflow] Missing Supabase credentials.');
        }
    } else {
        log.info('[Marketplace/SaaS Mode] Skipping direct upsert for data privacy.');
    }
}


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
