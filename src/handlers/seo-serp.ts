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
export async function extractFromSerpApi(keyword: string, serpApiKey: string, log: any) {
    const links: string[] = [];
    const ctas: string[] = [];
    const conversionMarkers: string[] = [];
    let profileHtml = '';

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

    return { links, ctas, conversionMarkers, profileHtml };
}

export async function extractFromDom(page: any, log: any) {
    const links: string[] = [];
    const ctas: string[] = [];
    const conversionMarkers: string[] = [];

    log.info(`[SEO-SERP] Attempting DOM extraction fallback.`);
    const mainResultsArea = page.locator('#search, #res, #main');
    const resultLocators = mainResultsArea.locator('a[href^="http"]:not([href*="google.com"])');
    const count = await resultLocators.count();

    const seenDomains = new Set<string>();
    let position = 1;

    for (let i = 0; i < count; i++) {
        if (position > 10) break;
        const href = await resultLocators.nth(i).getAttribute('href');
        if (!href) continue;
        try {
            const hostname = new URL(href).hostname;
            if (!seenDomains.has(hostname)) {
                seenDomains.add(hostname);
                links.push(href);
                conversionMarkers.push(`Position ${position}: ${hostname}`);
                position++;
            }
        } catch (e) {}
    }

    // Check for Local Pack presence in DOM
    const localPack = page.locator('[data-entityname], .lsbb');
    if (await localPack.count() > 0) {
        ctas.push('Local Pack Present');
    }

    return { links, ctas, conversionMarkers };
}

export async function handle(
    context: PlaywrightCrawlingContext,
    _handlerContext: HandlerContext,
): Promise<ScrapedItem[]> {
    const { page, request, log } = context;
    const url = request.url;
    
    const urlObj = new URL(url);
    const keyword = sanitizeQuery(urlObj.searchParams.get('q') || 'Unknown');

    log.info(`[SEO-SERP] Analyzing search results for keyword: "${keyword}"`);

    let links: string[] = [];
    let ctas: string[] = [];
    let conversionMarkers: string[] = [];
    let profileHtml = '';

    // Phase 2 Optimization: Check for SerpApi Key
    const serpApiKey = process.env.SERP_API_KEY;
    if (serpApiKey) {
        const apiData = await extractFromSerpApi(keyword, serpApiKey, log);
        links = apiData.links;
        ctas = apiData.ctas;
        conversionMarkers = apiData.conversionMarkers;
        profileHtml = apiData.profileHtml;
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
            const domData = await extractFromDom(page, log);
            links = domData.links;
            ctas = domData.ctas;
            conversionMarkers = domData.conversionMarkers;
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
