/**
 * @module scripts/validate-output
 * @description Validates scraped output items against the output JSON schema.
 * Used by the Integration Lead during HARDEN phase to enforce G-CODE-03.
 *
 * Usage:
 *   npx tsx scripts/validate-output.ts [dataset-path]
 *
 * If no path provided, reads from the default Apify dataset storage:
 *   storage/datasets/default/
 *
 * Exit code 0 = all items valid, 1 = validation errors found.
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { log } from '../src/utils/logger.js';

interface ValidationError {
    file: string;
    field: string;
    message: string;
}

// Output schema fields
const REQUIRED_FIELDS = ['platform', 'url', 'scrapedAt', 'crawlerUsed', 'data'];
const VALID_PLATFORMS = [
    'tiktok', 'youtube', 'linkedin', 'google_maps',
    'pinterest', 'reddit', 'facebook', 'instagram', 'general',
];
const VALID_CRAWLERS = ['cheerio', 'playwright'];

/**
 * Validate a single scraped item against the output schema.
 * @param item - The parsed JSON object to validate.
 * @param filename - Source filename for error reporting.
 * @returns Array of validation errors (empty if valid).
 */
function validateItem(item: Record<string, unknown>, filename: string): ValidationError[] {
    const errors: ValidationError[] = [];

    // Check required fields
    for (const field of REQUIRED_FIELDS) {
        if (!(field in item)) {
            errors.push({ file: filename, field, message: `Missing required field: ${field}` });
        }
    }

    // Validate platform enum
    if ('platform' in item && !VALID_PLATFORMS.includes(item.platform as string)) {
        errors.push({
            file: filename,
            field: 'platform',
            message: `Invalid platform: "${item.platform}". Must be one of: ${VALID_PLATFORMS.join(', ')}`,
        });
    }

    // Validate url format
    if ('url' in item) {
        try {
            new URL(item.url as string);
        } catch {
            errors.push({ file: filename, field: 'url', message: `Invalid URL: "${item.url}"` });
        }
    }

    // Validate scrapedAt is ISO 8601
    if ('scrapedAt' in item) {
        const date = new Date(item.scrapedAt as string);
        if (isNaN(date.getTime())) {
            errors.push({
                file: filename,
                field: 'scrapedAt',
                message: `Invalid ISO 8601 date: "${item.scrapedAt}"`,
            });
        }
    }

    // Validate crawlerUsed enum
    if ('crawlerUsed' in item && !VALID_CRAWLERS.includes(item.crawlerUsed as string)) {
        errors.push({
            file: filename,
            field: 'crawlerUsed',
            message: `Invalid crawlerUsed: "${item.crawlerUsed}". Must be "cheerio" or "playwright"`,
        });
    }

    // Validate data is an object
    if ('data' in item && (typeof item.data !== 'object' || item.data === null || Array.isArray(item.data))) {
        errors.push({ file: filename, field: 'data', message: 'Field "data" must be a non-null object' });
    }

    // Validate errors array (optional but must be string[] if present)
    if ('errors' in item) {
        if (!Array.isArray(item.errors)) {
            errors.push({ file: filename, field: 'errors', message: 'Field "errors" must be an array' });
        } else {
            const nonStrings = (item.errors as unknown[]).filter(e => typeof e !== 'string');
            if (nonStrings.length > 0) {
                errors.push({
                    file: filename,
                    field: 'errors',
                    message: `"errors" array contains non-string elements`,
                });
            }
        }
    }

    // Check for unexpected fields
    const allowedFields = [...REQUIRED_FIELDS, 'errors'];
    for (const key of Object.keys(item)) {
        if (!allowedFields.includes(key)) {
            errors.push({ file: filename, field: key, message: `Unexpected field: "${key}"` });
        }
    }

    return errors;
}

/**
 * Main validation entry point.
 * Reads dataset JSON files from the given path and validates each item.
 */
function main(): void {
    const datasetPath = process.argv[2] || join(process.cwd(), 'storage', 'datasets', 'default');
    const resolvedPath = resolve(datasetPath);

    if (!existsSync(resolvedPath)) {
        log.error(`Dataset path does not exist: ${resolvedPath}`);
        log.info('Usage: npx tsx scripts/validate-output.ts [dataset-path]');
        process.exit(1);
    }

    const files = readdirSync(resolvedPath).filter(f => f.endsWith('.json'));

    if (files.length === 0) {
        log.warning(`No JSON files found in: ${resolvedPath}`);
        process.exit(0);
    }

    log.info(`Validating ${files.length} output files from: ${resolvedPath}`);

    let totalItems = 0;
    let totalErrors = 0;
    const allErrors: ValidationError[] = [];

    for (const file of files) {
        const filePath = join(resolvedPath, file);
        const content = readFileSync(filePath, 'utf-8');

        let parsed: unknown;
        try {
            parsed = JSON.parse(content);
        } catch {
            allErrors.push({ file, field: 'JSON', message: 'Invalid JSON file' });
            totalErrors++;
            continue;
        }

        // Handle single object or array of objects
        const items = Array.isArray(parsed) ? parsed : [parsed];

        for (const item of items) {
            totalItems++;
            const errors = validateItem(item as Record<string, unknown>, file);
            if (errors.length > 0) {
                totalErrors += errors.length;
                allErrors.push(...errors);
            }
        }
    }

    // Report results
    if (allErrors.length === 0) {
        log.info(`✅ All ${totalItems} items passed validation`);
        process.exit(0);
    } else {
        log.error(`❌ Found ${totalErrors} validation errors across ${totalItems} items:\n`);
        for (const err of allErrors) {
            log.error(`  [${err.file}] ${err.field}: ${err.message}`);
        }
        process.exit(1);
    }
}

main();
