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
    const isSubPage = request.userData?.isSubPage || false;

    // G-COST-02: Block heavy resources
    await blockResources(page, ['image', 'media', 'font']);

    log.info(`[Pinterest] Extracting: ${request.url} (isSubPage: ${isSubPage})`);

    await page.goto(request.url, { waitUntil: 'domcontentloaded' });

    // Extract the embedded JSON data from the script tag
    const scriptSelector = 'script[id="__PWS_INITIAL_PROPS__"]';
    const jsonText = await page.locator(scriptSelector).innerText().catch(() => '');
    
    let title = '';
    let h1 = '';
    let metaDescription = '';

    if (jsonText) {
        try {
            const jsonData = JSON.parse(jsonText);
            const initialProps = jsonData?.initialReduxState;
            
            // Find the user data or pin data
            const users = initialProps?.users || {};
            const pins = initialProps?.pins || {};
            
            const urlPath = new URL(request.url).pathname;
            const slug = urlPath.split('/').filter(Boolean).pop()?.toLowerCase();

            const userKey = Object.keys(users).find(k => {
                const u = users[k];
                if (!u) return false;
                if (slug && u.username?.toLowerCase() === slug) return true;
                return false;
            }) || Object.keys(users)[0];

            const userData = userKey ? users[userKey] : null;

            title = await page.title();
            h1 = userData?.full_name || '';
            metaDescription = userData?.about || '';
            const website = userData?.website_url || '';

            // Spider Architecture: Enqueue pins if root profile
            if (!isSubPage && userData) {
                log.info(`[Pinterest] Enqueueing pins for deep crawl from profile: ${request.url}`);
                const pinLinks: string[] = [];
                Object.keys(pins).forEach((id, i) => {
                    if (i < 5) {
                        pinLinks.push(`https://www.pinterest.com/pin/${id}/`);
                    }
                });

                if (pinLinks.length > 0) {
                    const { crawler } = context;
                    await crawler.addRequests(pinLinks.map(pUrl => ({
                        url: pUrl,
                        userData: { ...request.userData, isSubPage: true }
                    })));
                }

                // Link-in-Bio Spidering: Enqueue website for general forensics
                if (website) {
                    log.info(`[Pinterest] Enqueueing website for deep forensics: ${website}`);
                    const { crawler } = context;
                    await crawler.addRequests([{
                        url: website,
                        userData: { ...request.userData, isSubPage: true, platform: 'general' },
                        label: 'general'
                    }]);
                }
            }
        } catch (e) {
            log.debug('[Pinterest] JSON parse failed, falling back to DOM extraction');
        }
    }

    // Fallback DOM extraction
    if (!title) title = await page.title().catch(() => '');
    if (!h1) h1 = await page.locator('h1').first().innerText().catch(() => '');
    if (!metaDescription) metaDescription = (await page.locator('meta[name="description"]').getAttribute('content').catch(() => '')) || '';

    const scrapedItem: ScrapedItem = {
        platform: 'pinterest',
        url: request.url,
        crawlerUsed: 'playwright',
        scrapedAt: new Date().toISOString(),
        data: {
            revenueIndicators: {
                ctas: [],
                links: [],
                conversionMarkers: [],
            },
            profileHtml: await page.content().catch(() => ''),
            screenshotUrl: '',
            // Structured fields for direct Supabase mapping
            username: request.url.split('/').filter(Boolean).pop(),
            // Deep Link Metadata for Crawl Report
            crawlMetadata: {
                title,
                h1,
                metaDescription: metaDescription || '',
                httpStatus: 200,
                snippet: metaDescription || title
            }
        } as any,
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
