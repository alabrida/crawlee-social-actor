/**
 * @module utils/data-cleaner
 * @description Centralized data cleaning utilities for scraped items and assessment payloads.
 * Ensures only meaningful, valid data reaches the Supabase upsert layer.
 *
 * KEY DESIGN PRINCIPLE:
 *   - `null`  = "field was not extracted / not applicable" (omit from payload)
 *   - `0`     = "field was extracted and the real value is zero" (keep in payload)
 *   - `false` = "boolean flag is definitively false" (keep in payload)
 */

import { log } from './logger.js';

/**
 * Fields that should ALWAYS be present in the assessment payload,
 * even when their value is null/0/false. These are required by
 * the Supabase table schema or downstream consumers.
 */
const REQUIRED_FIELDS = new Set([
    'lead_uuid',
    'dedupe_key',
    'assessment_date',
    'business_url',
    'source',
    'total_platforms_submitted',
    'platforms_list',
    'workflow_2_status',
]);

/**
 * Clean a scraped item's data object immediately after handler extraction.
 * - Converts empty strings (`''`) to `null` for string fields (except HTML/screenshot)
 * - Strips `undefined` values
 * - Preserves valid `0`, `false`, and `null`
 *
 * @param data - The handler's data output object.
 * @returns Cleaned data object.
 */
export function cleanScrapedItemData(data: Record<string, any>): Record<string, any> {
    const cleaned: Record<string, any> = {};

    for (const [key, value] of Object.entries(data)) {
        // Skip undefined values entirely
        if (value === undefined) continue;

        // Preserve nested objects (revenueIndicators, forensics, etc.) as-is
        if (value !== null && typeof value === 'object') {
            cleaned[key] = value;
            continue;
        }

        // Convert empty strings to null for non-HTML, non-screenshot fields
        if (typeof value === 'string' && value === '' && !key.includes('Html') && !key.includes('screenshot')) {
            cleaned[key] = null;
            continue;
        }

        cleaned[key] = value;
    }

    return cleaned;
}

/**
 * Clean the master assessment payload before Supabase upsert.
 * - Removes keys whose value is `null` (unless required)
 * - Removes keys whose value is `undefined`
 * - PRESERVES valid `0` (real zero counts) and `false` (real boolean flags)
 * - Removes empty arrays (except platforms_list)
 * - Removes empty objects
 *
 * @param masterItem - The aggregated master assessment row.
 * @returns Cleaned payload ready for Supabase upsert.
 */
export function cleanAssessmentPayload(masterItem: Record<string, any>): Record<string, any> {
    const cleaned: Record<string, any> = {};
    let removedCount = 0;

    for (const [key, value] of Object.entries(masterItem)) {
        // Always keep required fields
        if (REQUIRED_FIELDS.has(key)) {
            cleaned[key] = value;
            continue;
        }

        // Remove undefined
        if (value === undefined) {
            removedCount++;
            continue;
        }

        // Remove null (field was not extracted)
        if (value === null) {
            removedCount++;
            continue;
        }

        // Remove empty arrays (no data)
        if (Array.isArray(value) && value.length === 0) {
            removedCount++;
            continue;
        }

        // Remove empty objects
        if (typeof value === 'object' && value !== null && !Array.isArray(value) && Object.keys(value).length === 0) {
            removedCount++;
            continue;
        }

        // KEEP everything else: valid 0, false, non-empty strings, populated arrays/objects
        cleaned[key] = value;
    }

    log.info(`[DataCleaner] Removed ${removedCount} empty/null fields from assessment payload.`, {
        before: Object.keys(masterItem).length,
        after: Object.keys(cleaned).length,
    });

    return cleaned;
}
