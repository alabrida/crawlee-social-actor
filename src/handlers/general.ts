/**
 * @module handlers/general
 * @description General business website handler using PlaywrightCrawler.
 * Handles Cloudflare, DataDome, and PerimeterX protected sites.
 * @see PRD Section 5.8
 */

import type { PlaywrightCrawlingContext } from 'crawlee';
import type { PlaywrightHandler, HandlerContext, ScrapedItem } from '../types.js';

/**
 * Handle a general business website URL with stealth headless browser.
 * @param context - Crawlee PlaywrightCrawlingContext with page/request.
 * @param _handlerContext - Shared handler context with actor input.
 * @returns Array of scraped items in the normalized envelope.
 */
async function handle(
    context: PlaywrightCrawlingContext,
    _handlerContext: HandlerContext,
): Promise<ScrapedItem[]> {
    // TODO: Implement in Sprint 6 (PW-General Agent)
    throw new Error(`General handler not yet implemented for: ${context.request.url}`);
}

/**
 * Validate that the extracted business data contains expected keys.
 * @param data - The extracted data object.
 * @returns True if required fields are present.
 */
function validate(data: Record<string, unknown>): boolean {
    // TODO: Define expected keys for general business data
    return data !== null && typeof data === 'object';
}

/**
 * Detect if the response indicates a WAF block (Cloudflare, DataDome, PerimeterX).
 * @param responseBody - The page content.
 * @returns True if a block is detected.
 */
function detectBlock(responseBody: string): boolean {
    // TODO: Implement block detection for general WAF challenges
    return (
        responseBody.includes('Checking your browser') ||
        responseBody.includes('Just a moment') ||
        responseBody.includes('Verifying you are human')
    );
}

/** Assembled handler export satisfying the PlaywrightHandler interface. */
const generalHandler: PlaywrightHandler = {
    crawlerType: 'playwright',
    handle,
    validate,
    detectBlock,
};
export default generalHandler;
