/**
 * @module handlers/tiktok
 * @description TikTok handler using CheerioCrawler.
 * Extracts data from embedded JSON in __UNIVERSAL_DATA_FOR_REHYDRATION__ or SIGI_STATE scripts.
 * @see PRD Section 5.1
 */

import type { PlatformHandler, ScrapedItem } from '../types.js';

/**
 * Handle a TikTok URL by fetching raw HTML and parsing embedded JSON.
 * @param url - The TikTok profile or video URL to scrape.
 * @returns Array of scraped items in the normalized envelope.
 */
export async function handle(url: string): Promise<ScrapedItem[]> {
    // TODO: Implement in Sprint 1 (Cheerio-TikTok Agent)
    throw new Error(`TikTok handler not yet implemented for: ${url}`);
}

/**
 * Validate that the extracted TikTok data contains expected keys.
 * @param data - The extracted data object.
 * @returns True if required fields are present.
 */
export function validate(data: Record<string, unknown>): boolean {
    // TODO: Define expected keys for TikTok data
    return data !== null && typeof data === 'object';
}

/**
 * Detect if the response indicates a TikTok block (captcha, empty data).
 * @param responseBody - The raw HTML response body.
 * @returns True if a block is detected.
 */
export function detectBlock(responseBody: string): boolean {
    // TODO: Implement block detection for TikTok
    return responseBody.includes('captcha') || responseBody.length < 100;
}

/** Assembled handler export satisfying the PlatformHandler interface. */
const tiktokHandler: PlatformHandler = { handle, validate, detectBlock };
export default tiktokHandler;
