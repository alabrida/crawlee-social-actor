/**
 * @module main
 * @description Apify Actor entry point for the Crawlee social media scraping actor.
 * Creates CheerioCrawler and PlaywrightCrawler instances, enqueues URLs by platform,
 * and dispatches to the correct handler via the router.
 */

import { Actor } from 'apify';
import { log } from './utils/logger.js';
import { fileURLToPath } from 'url';
import path from 'path';
import { createProxyConfig } from './utils/proxy.js';
import { calculateAssessment } from './scoring/engine.js';
import { upsertAssessment, getExistingAssessment } from './utils/supabase.js';
import { cleanAssessmentPayload } from './utils/data-cleaner.js';
import { FEATURES, getSiloName } from './utils/mode-gate.js';
import { runCheerioCrawler, runPlaywrightCrawler } from './runner.js';
import type { ActorInput, HandlerContext, UrlEntry } from './types.js';
import { prepareUrls } from './utils/url-helper.js';
import { resolveBestSerp, generateRecommendedKeywords } from './scoring/keyword-helper.js';
import { aggregateHubItem } from './utils/hub-aggregator.js';
import { setupSessionAndAuth } from './utils/session-setup.js';


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
            hubForensics = aggregateHubItem(hubForensics, item, input.businessUrl);
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

    const businessUrl = input.businessUrl || hubForensics?.seo?.canonical || '';

    // Fetch existing assessment from Supabase and merge platforms/signals not scraped in this run
    const supabaseUrl = process.env.SUPABASE_URL || input.supabaseUrl;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || input.supabaseServiceKey;
    if (supabaseUrl && supabaseKey && businessUrl) {
        const existing = await getExistingAssessment(businessUrl, supabaseUrl, supabaseKey);
        if (existing && existing.assessment_detail?.platforms) {
            log.info(`[Aggregator] Found existing assessment in Supabase. Merging history...`);
            const existingPlats = existing.assessment_detail.platforms;
            for (const p of Object.keys(existingPlats)) {
                if (!platforms[p] || platforms[p].length === 0) {
                    platforms[p] = existingPlats[p];
                    log.info(`  -> Restored platform: ${p}`);
                }
            }
            if (!hubForensics && existing.assessment_detail.hub_forensics) {
                hubForensics = existing.assessment_detail.hub_forensics;
                log.info(`  -> Restored hub forensics`);
            }
        }
    }

    const brandName = input.brandName || hubForensics?.seo?.title || (businessUrl ? new URL(businessUrl).hostname : 'Unknown Business');
    const classOverride = input.businessClass || null;

    // Pick the best SERP ranking result for stage score calculation
    const bestSerpData = resolveBestSerp(serpResults);

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

    // Surface data-trust warnings so a degraded crawl / low-confidence classification is
    // obvious in the run logs instead of being silently scored.
    const cq = scoreResult.assessment_detail.crawl_quality;
    const audit = scoreResult.assessment_detail.audit;
    if (cq && cq.status !== 'ok') {
        log.warning(`[Audit] Crawl quality ${cq.status} — scores may be understated: ${(cq.reasons || []).join('; ')}`);
    }
    if (audit?.needs_review_count > 0) {
        log.warning(`[Audit] ${audit.needs_review_count} mechanism(s) flagged needs_review.`);
    }
    if (audit?.low_confidence_classification) {
        log.warning(`[Audit] Low-confidence classification: ${scoreResult.business_class} @ ${(audit.classifier_confidence * 100).toFixed(0)}% — verify business_class.`);
    }

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
 */
export async function runActor(): Promise<void> {
    await Actor.init();

    const input = await Actor.getInput<ActorInput>();
    if (!input) {
        throw new Error('Actor input is required.');
    }

    input.detailLevel = (process.env.DETAIL_LEVEL as ActorInput['detailLevel']) || input.detailLevel || 'STANDARD';

    await setupSessionAndAuth(input);

    const handlerContext: HandlerContext = { input };
    const proxyConfiguration = await createProxyConfig(input.proxy);

    const { cheerioUrls, playwrightUrls, finalUrls } = prepareUrls(input);

    log.info(`Actor started in mode: ${getSiloName()}`, {
        platforms: input.platforms,
        urlCount: finalUrls.length,
        maxConcurrency: input.maxConcurrency,
        detailLevel: input.detailLevel,
    });

    await runCheerioCrawler(input, handlerContext, proxyConfiguration, cheerioUrls);

    await runPlaywrightCrawler(input, handlerContext, proxyConfiguration, playwrightUrls, cheerioUrls);

    await aggregateAndUpsertData(input, finalUrls);

    await Actor.exit();
}

const isDirect = process.argv[1] && (
    path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) ||
    path.resolve(process.argv[1]) === fileURLToPath(import.meta.url).replace(/\.ts$/, '.js')
);
if (isDirect) {
    runActor().catch((err) => {
        log.error('Actor failed to execute', err);
        process.exit(1);
    });
}
