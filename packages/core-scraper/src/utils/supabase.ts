/**
 * @module utils/supabase
 * @description Utility for direct data ingestion into Supabase.
 * Primarily used by the Consultant Actor silo.
 */

import { createClient } from '@supabase/supabase-js';
import { log } from './logger.js';
import { cleanAssessmentPayload } from './data-cleaner.js';

/**
 * Upserts a consolidated assessment row into the Supabase table.
 * Applies cleanAssessmentPayload as a safety net before upsert.
 * @param data - The master assessment record (1:1 column parity).
 * @param url - Supabase project URL.
 * @param key - Supabase service role key.
 * @returns Promise resolving to the result of the operation.
 */
export async function upsertAssessment(data: any, url: string, key: string) {
    log.info(`[Supabase] Initiating direct upsert for business: ${data.business_url}`);

    // Safety net: ensure payload is clean even if caller didn't clean it
    const cleanedData = cleanAssessmentPayload(data);

    try {
        const supabase = createClient(url, key);
        
        const { error } = await supabase
            .from('revenue_journey_assessments')
            .upsert(cleanedData, {
                onConflict: 'dedupe_key' // Assumes dedupe_key or primary key
            });

        if (error) {
            log.error(`[Supabase] Upsert failed: ${error.message}`, { code: error.code });
            return { success: false, error: error.message };
        }

        log.info(`[Supabase] Successfully upserted assessment row.`);
        return { success: true };
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        log.error(`[Supabase] Critical error during upsert: ${msg}`);
        return { success: false, error: msg };
    }
}
