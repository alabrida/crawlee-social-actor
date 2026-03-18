import type { PlaywrightCrawlingContext } from 'crawlee';
import { blockResources } from '../utils/resources.js';
import type { PlaywrightHandler, HandlerContext, ScrapedItem } from '../types.js';

/**
 * Handle a Pinterest URL by scrolling and intercepting XHR responses.
 * @param context - Crawlee PlaywrightCrawlingContext with page/request.
 * @param _handlerContext - Shared handler context with actor input.
 * @returns Array of scraped items in the normalized envelope.
 */
export async function handle(
    context: PlaywrightCrawlingContext,
    _handlerContext: HandlerContext,
): Promise<ScrapedItem[]> {
    const { page, request, log } = context;

    // G-COST-02: Block heavy resources
    await blockResources(page, ['image', 'media', 'font']);

    log.info(`[Pinterest] Extracting: ${request.url}`);

    await page.goto(request.url, { waitUntil: 'domcontentloaded' });

    // Extract the embedded JSON data from the script tag
    const scriptSelector = 'script[id="__PWS_INITIAL_PROPS__"]';
    const jsonText = await page.locator(scriptSelector).innerText();
    
    if (!jsonText) {
        throw new Error('Could not find embedded __PWS_INITIAL_PROPS__ JSON data.');
    }

    const jsonData = JSON.parse(jsonText);
    const initialProps = jsonData?.initialReduxState;

    if (!initialProps) {
        throw new Error('Failed to parse initialReduxState from embedded JSON.');
    }
    
    log.info(`[Pinterest] Successfully parsed embedded JSON data.`);
    
    // Find the user data within the complex JSON structure
    const users = initialProps.users || {};
    
    // Get the username slug from the URL (e.g., 'nike' from '.../nike/')
    const urlPath = new URL(request.url).pathname;
    const slug = urlPath.split('/').filter(Boolean).pop()?.toLowerCase();

    // 1. Try to find user with domain_url
    // 2. Fall back to finding user with matching username
    // 3. Fall back to any user that has profile-like fields
    const userKey = Object.keys(users).find(k => {
        const u = users[k];
        if (!u) return false;
        if (u.domain_url) return true;
        if (slug && u.username?.toLowerCase() === slug) return true;
        return false;
    }) || Object.keys(users).find(k => users[k]?.follower_count !== undefined);

    const userData = userKey ? users[userKey] : null;

    const links: string[] = [];
    const ctas: string[] = [];
    const conversionMarkers: string[] = [];
    
    if (userData) {
        if (userData.website_url) links.push(userData.website_url);
        if (userData.domain_verified) conversionMarkers.push('Verified Website');
        if (userData.follower_count) conversionMarkers.push(`Follower Count: ${userData.follower_count}`);
        if (userData.full_name) conversionMarkers.push(`Name: ${userData.full_name}`);
    } else {
        log.warning('[Pinterest] Could not find main user object in embedded JSON.');
    }

    const profileHtml = await page.content();

    const scrapedItem: ScrapedItem = {
        platform: 'pinterest',
        url: request.url,
        crawlerUsed: 'playwright',
        scrapedAt: new Date().toISOString(),
        data: {
            revenueIndicators: {
                ctas,
                links,
                conversionMarkers,
            },
            profileHtml,
            apiSnapshots: [initialProps], // Save the whole parsed object
            screenshotUrl: '',
        },
        errors: []
    };

    return [scrapedItem];
}

/**
 * Validate that the extracted Pinterest data contains expected keys.
 * @param data - The extracted data object.
 * @returns True if required fields are present.
 */
export function validate(data: Record<string, unknown>): boolean {
    if (!data || typeof data !== 'object') return false;

    return (
        'revenueIndicators' in data &&
        typeof data.profileHtml === 'string' &&
        typeof data.screenshotUrl === 'string'
    );
}

/**
 * Detect if the response indicates a Pinterest block.
 * @param responseBody - The page content.
 * @returns True if a block is detected.
 */
export function detectBlock(responseBody: string): boolean {
    const lower = responseBody.toLowerCase();
    return lower.includes('unusual traffic') || 
           lower.includes('captcha') || 
           (lower.includes('log in') && responseBody.length < 50000);
}

/** Assembled handler export satisfying the PlaywrightHandler interface. */
const pinterestHandler: PlaywrightHandler = {
    crawlerType: 'playwright',
    handle,
    validate,
    detectBlock,
};
export default pinterestHandler;
