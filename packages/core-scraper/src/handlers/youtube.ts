/**
 * @module handlers/youtube
 * @description YouTube handler using CheerioCrawler via Residential Proxy.
 * Extracts data from ytInitialData / ytInitialPlayerResponse embedded JSON.
 * @see PRD Section 5.2
 */

import type { PlaywrightCrawlingContext } from 'crawlee';
import type { PlaywrightHandler, HandlerContext, ScrapedItem } from '../types.js';

/**
 * Handle a YouTube URL by regex-parsing embedded JSON from the HTML response.
 * @param context - Crawlee PlaywrightCrawlingContext with request/page.
 * @param _handlerContext - Shared handler context with actor input.
 * @returns Array of scraped items in the normalized envelope.
 */
async function handle(
    context: PlaywrightCrawlingContext,
    _handlerContext: HandlerContext,
): Promise<ScrapedItem[]> {
    const { request, page, log } = context;
    const url = request.url;
    log.info(`[YouTube] Extracting data from: ${url}`);

    // Wait for the channel layout to stabilize
    try { 
        await page.waitForSelector('#subscriber-count, yt-formatted-string[aria-label*="subscribers"]', { timeout: 15000 });
        await page.waitForTimeout(5000); // Allow CSR to populate values
    } catch (e) { /* ignore */ }
    const html = await page.content();

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
    let subscribersCount: number | null = null;
    let videosCount: number | null = null;
    let viewsCount: number | null = null;
    let isVerified = false;

    // Parse shorthand counts (e.g. "1.2K", "3M", "1,234")
    const parseCount = (raw: string): number | null => {
        if (!raw) return null;
        const cleaned = raw.replace(/,/g, '').replace(/subscribers?|videos?|views?/gi, '').trim();
        if (cleaned === '') return null;
        let num = parseFloat(cleaned);
        if (isNaN(num)) return null;
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
            if (pageHeader) {
                if (!channelName && pageHeader?.pageTitle) {
                    channelName = pageHeader.pageTitle;
                }
                const metadataRows = pageHeader?.content?.pageHeaderViewModel?.metadata?.contentMetadataViewModel?.metadataRows;
                if (Array.isArray(metadataRows)) {
                    for (const row of metadataRows) {
                        if (Array.isArray(row.metadataParts)) {
                            for (const part of row.metadataParts) {
                                const textContent = part?.text?.content || '';
                                if (!subscribersCount && textContent.toLowerCase().includes('subscriber')) {
                                    subscribersCount = parseCount(textContent);
                                }
                                if (!videosCount && textContent.toLowerCase().includes('video')) {
                                    videosCount = parseCount(textContent);
                                }
                            }
                        }
                    }
                }
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

        // DOM Fallback for counts using ARIA labels or specific text patterns
        try {
            if (subscribersCount === null) {
                const subText = await page.locator('#subscriber-count, yt-formatted-string[aria-label*="subscribers"]').first().innerText().catch(() => '');
                if (subText) subscribersCount = parseCount(subText);
            }
            if (videosCount === null) {
                const videoText = await page.locator('#videos-count, yt-formatted-string[aria-label*="videos"]').first().innerText().catch(() => '');
                if (videoText) videosCount = parseCount(videoText);
            }
        } catch (e) {
            log.debug(`[YouTube] DOM fallback failed for ${url}`);
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

        // Spider Architecture: Enqueue recent videos if root channel
        if (!request.userData?.isSubPage) {
            const videoUrls = await page.locator('a#video-title-link, a#video-title, a[href*="/watch?v="]').evaluateAll(els => 
                els.map(el => (el as HTMLAnchorElement).href)
                   .filter(href => href.includes('/watch?v='))
                   .slice(0, 5)
            );
            if (videoUrls.length > 0) {
                log.info(`[YouTube] Enqueueing ${videoUrls.length} recent videos for deep crawl.`);
                await context.enqueueLinks({
                    urls: videoUrls,
                    userData: { ...request.userData, isSubPage: true },
                    label: 'youtube'
                });
            }
        }

        // Link-in-Bio Spidering: Enqueue external links for general forensics
        if (!request.userData?.isSubPage && links.length > 0) {
            const externalLinks = links.filter(l => !l.includes('youtube.com') && !l.includes('googlevideo.com')).slice(0, 3);
            if (externalLinks.length > 0) {
                log.info(`[YouTube] Enqueueing ${externalLinks.length} external links for deep forensics.`);
                const { crawler } = context;
                await crawler.addRequests(externalLinks.map(lUrl => ({
                    url: lUrl,
                    userData: { ...request.userData, isSubPage: true, platform: 'general' },
                    label: 'general'
                })));
            }
        }
    }

    // Attempt to find business email / booking keywords in description
    const metaDescription = await page.locator('meta[name="description"]').getAttribute('content').catch(() => '') || '';
    if (!description && metaDescription) description = metaDescription;
    if (metaDescription.toLowerCase().includes('shop')) conversionMarkers.push('Shop');
    if (metaDescription.toLowerCase().includes('book')) conversionMarkers.push('Booking');
    if (metaDescription.toLowerCase().includes('contact') || metaDescription.includes('@')) conversionMarkers.push('Contact Info');

    // Fallback: extract channel name from <title>
    if (!channelName) {
        const titleTag = await page.title().catch(() => '');
        if (titleTag) channelName = titleTag.replace(/- YouTube$/i, '').trim() || null;
    }

    // Extract profile HTML snippet (mostly what's in head and main container, YouTube's DOM is CSR heavy)
    const titleHtml = await page.locator('title').evaluate(el => el.outerHTML).catch(() => '');
    const metaHtml = await page.locator('meta[name="description"]').evaluate(el => el.outerHTML).catch(() => '');
    const profileHtml = titleHtml + metaHtml;

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

    // Add crawlMetadata for aggregated reports
    let snippet = '';
    try {
        const text = await page.innerText('body');
        snippet = text.replace(/\s+/g, ' ').trim().substring(0, 500);
    } catch (e) {}

    (scrapedItem.data as any).crawlMetadata = {
        title: await page.title().catch(() => ''),
        h1: await page.locator('h1').first().innerText().catch(() => ''),
        metaDescription: description || '',
        httpStatus: 200,
        snippet,
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

/** Assembled handler export satisfying the PlaywrightHandler interface. */
const youtubeHandler: PlaywrightHandler = {
    crawlerType: 'playwright',
    handle,
    validate,
    detectBlock,
};
export default youtubeHandler;
