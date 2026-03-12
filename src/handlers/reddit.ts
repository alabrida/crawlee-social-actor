/**
 * @module handlers/reddit
 * @description Reddit handler using CheerioCrawler with SessionPool cookie reuse.
 * Appends .json to URLs for raw JSON extraction.
 * @see PRD Section 5.6
 */

import type { CheerioCrawlingContext } from 'crawlee';
import type { CheerioHandler, HandlerContext, ScrapedItem } from '../types.js';

/**
 * Handle a Reddit URL by appending .json and parsing the raw JSON response.
 * @param context - Crawlee CheerioCrawlingContext with request/response/$.
 * @param _handlerContext - Shared handler context with actor input.
 * @returns Array of scraped items in the normalized envelope.
 */
async function handle(
    context: CheerioCrawlingContext,
    _handlerContext: HandlerContext,
): Promise<ScrapedItem[]> {
    // TODO: Implement in Sprint 2 (Cheerio-Reddit Agent)
    throw new Error(`Reddit handler not yet implemented for: ${context.request.url}`);
}

/**
 * Validate that the extracted Reddit data contains expected keys.
 * @param data - The extracted data object.
 * @returns True if required fields are present.
 */
function validate(data: Record<string, unknown>): boolean {
    // TODO: Define expected keys for Reddit data
    return data !== null && typeof data === 'object';
}

/**
 * Detect if the response indicates a Reddit block (rate limit, login wall).
 * @param responseBody - The raw response body.
 * @returns True if a block is detected.
 */
function detectBlock(responseBody: string): boolean {
    // TODO: Implement block detection for Reddit
    return responseBody.includes('rate limit') || responseBody.includes('"error"');
}

/** Assembled handler export satisfying the CheerioHandler interface. */
const redditHandler: CheerioHandler = {
    crawlerType: 'cheerio',
    handle,
    validate,
    detectBlock,
};
export default redditHandler;
