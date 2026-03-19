/**
 * @module handlers/youtube
 * @description YouTube handler using CheerioCrawler via Residential Proxy.
 * Extracts data from ytInitialData / ytInitialPlayerResponse embedded JSON.
 * @see PRD Section 5.2
 */

import type { CheerioCrawlingContext } from 'crawlee';
import type { CheerioHandler, HandlerContext, ScrapedItem } from '../types.js';

/**
 * Handle a YouTube URL by regex-parsing embedded JSON from the HTML response.
 * @param context - Crawlee CheerioCrawlingContext with request/response/$.
 * @param _handlerContext - Shared handler context with actor input.
 * @returns Array of scraped items in the normalized envelope.
 */
async function handle(
    context: CheerioCrawlingContext,
    _handlerContext: HandlerContext,
): Promise<ScrapedItem[]> {
    const { request, $, body, log } = context;
    const url = request.url;
    log.info(`[YouTube] Extracting data from: ${url}`);

    const html = typeof body === 'string' ? body : body.toString('utf-8');

    let ytInitialData: any = null;
    const ytInitialDataMatch = html.match(/var ytInitialData = (\{.*?\});<\/script>/);
    if (ytInitialDataMatch && ytInitialDataMatch[1]) {
        try {
            ytInitialData = JSON.parse(ytInitialDataMatch[1]);
        } catch (e) {
            log.warning(`[YouTube] Failed to parse ytInitialData for ${url}`);
        }
    }

    const ctas: string[] = [];
    const links: string[] = [];
    const conversionMarkers: string[] = [];

    // Extract handle from URL
    const handleMatch = url.match(/youtube\.com\/@([^/?#]+)/);
    const channelHandle = handleMatch ? `@${handleMatch[1]}` : null;

    // Initialize structured data fields
    let channelName: string | null = null;
    let description: string | null = null;
    let subscribersCount = 0;
    let videosCount = 0;
    let viewsCount = 0;
    let isVerified = false;

    // Parse shorthand counts (e.g. "1.2K", "3M", "1,234")
    const parseCount = (raw: string): number => {
        if (!raw) return 0;
        const cleaned = raw.replace(/,/g, '').replace(/subscribers?|videos?|views?/gi, '').trim();
        let num = parseFloat(cleaned);
        if (isNaN(num)) return 0;
        if (cleaned.toLowerCase().endsWith('k')) num *= 1000;
        if (cleaned.toLowerCase().endsWith('m')) num *= 1000000;
        if (cleaned.toLowerCase().endsWith('b')) num *= 1000000000;
        return Math.floor(num);
    };
    
    // Attempt to extract from ytInitialData
    if (ytInitialData) {
        let stringifiedData = '';
        try {
            stringifiedData = JSON.stringify(ytInitialData);
        } catch(e) {
            const msg = e instanceof Error ? e.message : String(e);
            log.warning(`[YouTube] Failed to stringify ytInitialData for ${url}: ${msg}`);
        }

        // Extract channel name from metadata
        try {
            const header = ytInitialData?.header?.c4TabbedHeaderRenderer;
            if (header) {
                channelName = header.title || null;
                if (header.subscriberCountText?.simpleText) {
                    subscribersCount = parseCount(header.subscriberCountText.simpleText);
                }
                if (header.videosCountText?.runs) {
                    const videosText = header.videosCountText.runs.map((r: any) => r.text).join('');
                    videosCount = parseCount(videosText);
                }
                if (header.badges) {
                    isVerified = header.badges.some((b: any) =>
                        b.metadataBadgeRenderer?.style === 'BADGE_STYLE_TYPE_VERIFIED' ||
                        b.metadataBadgeRenderer?.tooltip === 'Verified'
                    );
                }
            }

            // Fallback: pageHeaderRenderer (newer YT layout)
            const pageHeader = ytInitialData?.header?.pageHeaderRenderer;
            if (pageHeader && !channelName) {
                const title = pageHeader?.pageTitle;
                if (title) channelName = title;
            }

            // Extract from metadata object
            const metadata = ytInitialData?.metadata?.channelMetadataRenderer;
            if (metadata) {
                if (!channelName) channelName = metadata.title || null;
                description = metadata.description || null;
            }

            // Try microformat for view counts
            const microformat = ytInitialData?.microformat?.microformatDataRenderer;
            if (microformat?.tags) {
                // tags can have video counts etc. - not always view counts
            }
        } catch (e) {
            log.debug(`[YouTube] Failed to parse structured channel data for ${url}`);
        }

        const headerLinksMatch = stringifiedData.match(/"urlEndpoint":\{"url":"([^"]+)"\}/g);
        if (headerLinksMatch) {
            for (const match of headerLinksMatch) {
                const urlMatch = match.match(/"url":"([^"]+)"/);
                if (urlMatch && urlMatch[1]) {
                    let extractedUrl = urlMatch[1];
                    try {
                        if (extractedUrl.includes('/redirect')) {
                            const parsedUrl = new URL(extractedUrl, 'https://www.youtube.com');
                            extractedUrl = parsedUrl.searchParams.get('q') || extractedUrl;
                        }
                    } catch (e) {
                        const msg = e instanceof Error ? e.message : String(e);
                        log.debug(`[YouTube] Failed to parse URL for redirect extraction: ${msg}`);
                    }
                    if (extractedUrl.startsWith('http') && !links.includes(extractedUrl)) {
                        links.push(extractedUrl);
                    }
                }
            }
        }
        
        // Channel Links in about page or channel header
        const ctaMatches = stringifiedData.match(/"simpleText":"([^"]+)"/g) || [];
        for (const match of ctaMatches) {
            const textMatch = match.match(/"simpleText":"([^"]+)"/);
            if (textMatch && textMatch[1]) {
                const text = textMatch[1];
                if (/book|shop|merch|store|website|subscribe/i.test(text) && !ctas.includes(text)) {
                    ctas.push(text);
                }
            }
        }
    }

    // Attempt to find business email / booking keywords in description
    const metaDescription = $('meta[name="description"]').attr('content') || '';
    if (!description && metaDescription) description = metaDescription;
    if (metaDescription.toLowerCase().includes('shop')) conversionMarkers.push('Shop');
    if (metaDescription.toLowerCase().includes('book')) conversionMarkers.push('Booking');
    if (metaDescription.toLowerCase().includes('contact') || metaDescription.includes('@')) conversionMarkers.push('Contact Info');

    // Fallback: extract channel name from <title>
    if (!channelName) {
        const titleTag = $('title').text();
        if (titleTag) channelName = titleTag.replace(/- YouTube$/i, '').trim() || null;
    }

    // Extract profile HTML snippet (mostly what's in head and main container, YouTube's DOM is CSR heavy)
    const profileHtml = $('title').prop('outerHTML') + ($('meta[name="description"]').prop('outerHTML') || '');

    const scrapedItem: ScrapedItem = {
        platform: 'youtube',
        url,
        crawlerUsed: 'cheerio',
        scrapedAt: new Date().toISOString(),
        data: {
            revenueIndicators: {
                ctas,
                links,
                conversionMarkers,
            },
            profileHtml,
            // screenshotUrl placeholder, filled by Playwright screenshot-collector
            screenshotUrl: '',
            // Structured fields for direct Supabase mapping
            channelName,
            channelHandle,
            description,
            subscribersCount,
            videosCount,
            viewsCount,
            verified: isVerified,
        } as any,
        errors: []
    };

    if (!ytInitialData) {
        scrapedItem.errors.push('ytInitialData JSON payload not found. Page might be blocked or structured differently.');
    }

    return [scrapedItem];
}

/**
 * Validate that the extracted YouTube data contains expected keys.
 * @param data - The extracted data object.
 * @returns True if required fields are present.
 */
function validate(data: Record<string, unknown>): boolean {
    const payload = data as any;
    if (!payload || typeof payload !== 'object') return false;
    if (!payload.revenueIndicators || !Array.isArray(payload.revenueIndicators.links)) return false;
    if (typeof payload.profileHtml !== 'string') return false;
    if (typeof payload.screenshotUrl !== 'string') return false;
    return true;
}

/**
 * Detect if the response indicates a YouTube block (403, consent page).
 * @param responseBody - The raw HTML response body.
 * @returns True if a block is detected.
 */
function detectBlock(responseBody: string): boolean {
    const isConsent = responseBody.includes('consent.youtube.com');
    const isForbidden = responseBody.includes('403 Forbidden') || responseBody.includes('RequestBlocked');
    return isConsent || isForbidden;
}

/** Assembled handler export satisfying the CheerioHandler interface. */
const youtubeHandler: CheerioHandler = {
    crawlerType: 'cheerio',
    handle,
    validate,
    detectBlock,
};
export default youtubeHandler;
