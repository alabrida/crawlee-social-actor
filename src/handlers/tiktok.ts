/**
 * @module handlers/tiktok
 * @description TikTok handler using CheerioCrawler.
 * Extracts data from embedded JSON in __UNIVERSAL_DATA_FOR_REHYDRATION__ or SIGI_STATE scripts.
 * @see PRD Section 5.1
 */

import type { CheerioCrawlingContext } from 'crawlee';
import type { CheerioHandler, HandlerContext, ScrapedItem } from '../types.js';

/**
 * Handle a TikTok URL by parsing embedded JSON from the HTML response.
 * @param context - Crawlee CheerioCrawlingContext with request/response/$.
 * @param _handlerContext - Shared handler context with actor input.
 * @returns Array of scraped items in the normalized envelope.
 */
async function handle(
    context: CheerioCrawlingContext,
    _handlerContext: HandlerContext,
): Promise<ScrapedItem[]> {
    // TODO: Implement in Sprint 1 (Cheerio-TikTok Agent)
    throw new Error(`TikTok handler not yet implemented for: ${context.request.url}`);
}

/**
 * Validate that the extracted TikTok data contains expected keys.
 * @param data - The extracted data object.
 * @returns True if required fields are present.
 */
function validate(data: Record<string, unknown>): boolean {
    // TODO: Define expected keys for TikTok data
    return data !== null && typeof data === 'object';
}

/**
 * Detect if the response indicates a TikTok block (captcha, empty data).
 * @param responseBody - The raw HTML response body.
 * @returns True if a block is detected.
 */
function detectBlock(responseBody: string): boolean {
    // TODO: Implement block detection for TikTok
    return responseBody.includes('captcha') || responseBody.length < 100;
}

/** Assembled handler export satisfying the CheerioHandler interface. */
const tiktokHandler: CheerioHandler = {
    crawlerType: 'cheerio',
    handle,
    validate,
    detectBlock,
};
export default tiktokHandler;
