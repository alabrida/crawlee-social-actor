/**
 * @module scripts/measure-cu
 * @description Measures Apify Compute Unit (CU) consumption for the last Actor run.
 * Used by the Integration Lead during HARDEN phase to enforce G-COST-03.
 *
 * Usage:
 *   npx tsx scripts/measure-cu.ts [run-id]
 *
 * If no run-id, fetches the most recent run of this Actor from the Apify API.
 *
 * Environment:
 *   APIFY_TOKEN - Required. Your Apify API token.
 *
 * Reports:
 *   - Total CU consumed
 *   - Run duration
 *   - Whether the 30% monthly budget threshold was exceeded (G-COST-03)
 *   - Proxy bandwidth estimate if available
 */

import { Actor } from 'apify';
import { log } from '../src/utils/logger.js';

/** Monthly CU budget for Creator Plan. Adjust if plan changes. */
const MONTHLY_CU_BUDGET = 30; // Creator Plan: ~30 CU/month at $1/month tier
const MAX_SINGLE_PLATFORM_PERCENT = 0.30; // G-COST-03: 30% max per platform

interface RunStats {
    runId: string;
    status: string;
    startedAt: string;
    finishedAt: string | null;
    durationSeconds: number;
    computeUnits: number;
    datasetItemCount: number;
    budgetPercent: number;
    exceedsBudget: boolean;
}

/**
 * Fetch run details from the Apify API.
 * @param runId - Optional specific run ID. If omitted, fetches last run.
 * @returns Run statistics.
 */
async function getRunStats(runId?: string): Promise<RunStats> {
    await Actor.init();

    const client = Actor.newClient();
    const actorClient = client.actor(
        process.env.APIFY_ACTOR_ID || 'crawlee-social-scraper',
    );

    let run;
    if (runId) {
        run = await client.run(runId).get();
    } else {
        const runs = await actorClient.runs().list({ limit: 1, desc: true });
        if (runs.items.length === 0) {
            throw new Error('No runs found for this Actor. Run the Actor first.');
        }
        run = runs.items[0];
    }

    if (!run) {
        throw new Error(`Run not found: ${runId || 'latest'}`);
    }

    const startedAt = new Date(run.startedAt!);
    const finishedAt = run.finishedAt ? new Date(run.finishedAt) : new Date();
    const durationSeconds = (finishedAt.getTime() - startedAt.getTime()) / 1000;
    const computeUnits = run.usageTotalUsd
        ? run.usageTotalUsd / 0.035 // approximate CU from USD
        : (run as unknown as Record<string, unknown>).usage
            ? ((run as unknown as Record<string, unknown>).usage as Record<string, number>).ACTOR_COMPUTE_UNITS || 0
            : 0;
    const budgetPercent = (computeUnits / MONTHLY_CU_BUDGET) * 100;

    const datasetInfo = await client.dataset(run.defaultDatasetId).get();
    const datasetItemCount = datasetInfo?.itemCount || 0;

    await Actor.exit({ exit: false });

    return {
        runId: run.id,
        status: run.status,
        startedAt: startedAt.toISOString(),
        finishedAt: run.finishedAt ? finishedAt.toISOString() : null,
        durationSeconds: Math.round(durationSeconds),
        computeUnits: Math.round(computeUnits * 1000) / 1000,
        datasetItemCount,
        budgetPercent: Math.round(budgetPercent * 10) / 10,
        exceedsBudget: budgetPercent > (MAX_SINGLE_PLATFORM_PERCENT * 100),
    };
}

/**
 * Main measurement entry point.
 */
async function main(): Promise<void> {
    const runId = process.argv[2];

    if (!process.env.APIFY_TOKEN) {
        log.error('APIFY_TOKEN environment variable is required.');
        log.info('Set it in your .env file or export it: export APIFY_TOKEN=your-token');
        process.exit(1);
    }

    try {
        const stats = await getRunStats(runId);

        log.info('=== CU Measurement Report (G-COST-03) ===');
        log.info(`Run ID:          ${stats.runId}`);
        log.info(`Status:          ${stats.status}`);
        log.info(`Started:         ${stats.startedAt}`);
        log.info(`Finished:        ${stats.finishedAt || 'still running'}`);
        log.info(`Duration:        ${stats.durationSeconds}s`);
        log.info(`Items scraped:   ${stats.datasetItemCount}`);
        log.info(`Compute Units:   ${stats.computeUnits} CU`);
        log.info(`Monthly budget:  ${stats.budgetPercent}% of ${MONTHLY_CU_BUDGET} CU`);

        if (stats.exceedsBudget) {
            log.error(
                `❌ G-COST-03 VIOLATION: Run consumed ${stats.budgetPercent}% of monthly budget ` +
                `(threshold: ${MAX_SINGLE_PLATFORM_PERCENT * 100}%)`,
            );
            process.exit(1);
        } else {
            log.info(`✅ G-COST-03 OK: Within ${MAX_SINGLE_PLATFORM_PERCENT * 100}% budget threshold`);
            process.exit(0);
        }
    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        log.error(`Failed to measure CU: ${msg}`);
        process.exit(1);
    }
}

main();
