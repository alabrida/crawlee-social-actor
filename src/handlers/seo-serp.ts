import type { PlaywrightCrawlingContext } from 'crawlee';
import { blockResources } from '../utils/resources.js';
import type { PlaywrightHandler, HandlerContext, ScrapedItem } from '../types.js';
import { fetchSerpApi } from '../utils/serp.js';
import { sanitizeQuery } from '../utils/validation.js';

/**
 * Handle Google SERP (Search Engine Results Page) URLs to determine brand ranking.
 * @param context - Crawlee PlaywrightCrawlingContext.
 * @param _handlerContext - Shared handler context containing target domain.
 * @returns Array of scraped items.
 */
export async function handle(
    context: PlaywrightCrawlingContext,
    _handlerContext: HandlerContext,
): Promise<ScrapedItem[]> {
    const { page, request, log } = context;
    const url = request.url;
    
    const urlObj = new URL(url);
    const keyword = sanitizeQuery(urlObj.searchParams.get('q') || 'Unknown');

    log.info(`[SEO-SERP] Analyzing search results for keyword: "${keyword}"`);

    const links: string[] = [];
    const ctas: string[] = [];
    const conversionMarkers: string[] = [];
    let profileHtml = '';

    // Phase 2 Optimization: Check for SerpApi Key
    const serpApiKey = process.env.SERP_API_KEY;
    if (serpApiKey) {
        log.info(`[SEO-SERP] Using SerpApi for reliable extraction.`);
        const serpData = await fetchSerpApi(keyword, serpApiKey);
        
        if (serpData && serpData.organic_results) {
            serpData.organic_results.forEach((res) => {
                links.push(res.link);
                conversionMarkers.push(`Position ${res.position}: ${new URL(res.link).hostname}`);
            });
            if (serpData.local_results && serpData.local_results.length > 0) {
                ctas.push('Local Pack Present');
            }
            profileHtml = JSON.stringify(serpData, null, 2);
        }
    }

    // Always navigate with Playwright for screenshot parity
    // G-COST-02: Block heavy resources
    await blockResources(page, ['image', 'media', 'font']);

    try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForSelector('#search, #res, #main, [role="main"]', { timeout: 15000 }).catch(() => {
            log.warning(`[SEO-SERP] Main result container not found during fallback: ${url}`);
        });
        
        const content = await page.content();
        if (!profileHtml) profileHtml = content;

        // If API didn't provide links (or failed), try scraping from DOM
        if (links.length === 0) {
            log.info(`[SEO-SERP] Attempting DOM extraction fallback.`);
            const mainResultsArea = page.locator('#search, #res, #main');
            const resultLocators = mainResultsArea.locator('a[href^="http"]:not([href*="google.com"])');

            // Extract all hrefs in a single call to avoid N+1 query overhead
            const allHrefs = await resultLocators.evaluateAll((elements) =>
                elements.map(el => (el as HTMLAnchorElement).href)
            );
            
            const seenDomains = new Set<string>();
            let position = 1;

            for (const href of allHrefs) {
                if (position > 10) break;
                if (!href) continue;
                try {
                    const hostname = new URL(href).hostname;
                    if (!seenDomains.has(hostname)) {
                        seenDomains.add(hostname);
                        links.push(href);
                        conversionMarkers.push(`Position ${position}: ${hostname}`);
                        position++;
                    }
                } catch (e) { continue; }
            }
            
            // Check for Local Pack presence in DOM
            const localPack = page.locator('[data-entityname], .lsbb');
            if (await localPack.count() > 0) {
                ctas.push('Local Pack Present');
            }
        }
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        log.warning(`[SEO-SERP] Playwright navigation failed: ${msg}`);
    }

    const scrapedItem: ScrapedItem = {
        platform: 'seo_serp',
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
            screenshotUrl: '', // Populated by main.ts
        },
        errors: []
    };

    return [scrapedItem];
}

/**
 * Validate extracted SERP data.
 * @param data - The data object.
 * @returns True if valid.
 */
export function validate(data: Record<string, unknown>): boolean {
    const payload = data as any;
    return (
        payload &&
        payload.revenueIndicators &&
        typeof payload.profileHtml === 'string' &&
        typeof payload.screenshotUrl === 'string'
    );
}

/**
 * Detect Google blocks (CAPTCHAs).
 * @param responseBody - Page content.
 * @returns True if blocked.
 */
export function detectBlock(responseBody: string): boolean {
    // If it's JSON (SerpApi), we assume unblocked unless the API itself failed
    if (responseBody.trim().startsWith('{')) return false;

    const lower = responseBody.toLowerCase();
    return (
        lower.includes('sorry') ||
        lower.includes('unusual traffic') ||
        lower.includes('not a robot') ||
        lower.includes('captcha')
    );
}

const seoSerpHandler: PlaywrightHandler = {
    crawlerType: 'playwright',
    handle,
    validate,
    detectBlock,
};

export default seoSerpHandler;
