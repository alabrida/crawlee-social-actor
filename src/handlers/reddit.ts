/**
 * @module handlers/reddit
 * @description Reddit handler using CheerioCrawler with the public .json endpoint.
 * Appends /about.json to user/subreddit URLs for structured JSON extraction.
 * Respects BLOCK-006 rate limiting via x-ratelimit-* headers.
 * @see PRD Section 5.6
 */

import type { CheerioCrawlingContext } from 'crawlee';
import type { CheerioHandler, HandlerContext, ScrapedItem } from '../types.js';

/** Regex to extract URLs from markdown-style text and raw links. */
const URL_REGEX = /https?:\/\/[^\s)\]>"]+/gi;

/**
 * Extract external links from a text block, filtering out reddit-internal URLs.
 * @param text - Raw text possibly containing URLs.
 * @returns Array of unique external URLs.
 */
function extractExternalLinks(text: string): string[] {
    if (!text) return [];
    const matches = text.match(URL_REGEX) || [];
    const external = matches.filter(
        (url) => !url.includes('reddit.com') && !url.includes('redd.it'),
    );
    return Array.from(new Set(external));
}

/**
 * Handle a Reddit URL by fetching the .json endpoint and parsing the response.
 * Supports both user profiles (/user/X) and subreddit pages (/r/X).
 * @param context - Crawlee CheerioCrawlingContext with request/response/$.
 * @param _handlerContext - Shared handler context with actor input.
 * @returns Array of scraped items in the normalized envelope.
 */
async function handle(
    context: CheerioCrawlingContext,
    _handlerContext: HandlerContext,
): Promise<ScrapedItem[]> {
    const { request, log, body } = context;
    const url = request.url;

    log.info(`[Reddit] Extracting: ${url}`);

    let parsed: Record<string, any>;
    try {
        const raw = typeof body === 'string' ? body : body.toString();
        parsed = JSON.parse(raw);
    } catch {
        throw new Error(`[Reddit] Failed to parse JSON response for ${url}`);
    }

    if (parsed.error) {
        throw new Error(`[Reddit] API error ${parsed.error}: ${parsed.message || 'Unknown'} for ${url}`);
    }

    if (detectBlock(typeof body === 'string' ? body : body.toString())) {
        throw new Error('[Reddit] Rate limit or block detected.');
    }

    const kind = parsed.kind as string;
    const data = parsed.data as Record<string, any>;

    if (!data) {
        throw new Error(`[Reddit] No data field in response for ${url}`);
    }

    const isUser = kind === 't2';
    const ctas: string[] = [];
    const links: string[] = [];
    const conversionMarkers: string[] = [];
    let profileHtml = '';

    if (isUser) {
        // User profile: bio lives in data.subreddit.public_description
        const sub = data.subreddit || {};
        const bio = sub.public_description || '';
        const title = sub.title || '';

        links.push(...extractExternalLinks(bio));
        links.push(...extractExternalLinks(title));

        if (bio.toLowerCase().includes('book') || title.toLowerCase().includes('book')) {
            conversionMarkers.push('Booking');
        }
        if (links.length > 0) {
            ctas.push('Bio Link');
            conversionMarkers.push('Website Click');
        }

        profileHtml = JSON.stringify({
            name: data.name,
            title,
            bio,
            totalKarma: data.total_karma,
            linkKarma: data.link_karma,
            commentKarma: data.comment_karma,
            iconImg: data.icon_img,
            verified: data.verified,
            isGold: data.is_gold,
            hasVerifiedEmail: data.has_verified_email,
            created: data.created_utc,
            acceptFollowers: data.accept_followers,
            subscribers: sub.subscribers,
        });
    } else {
        // Subreddit page: description + sidebar contain links
        const pubDesc = data.public_description || '';
        const desc = data.description || '';

        links.push(...extractExternalLinks(pubDesc));
        links.push(...extractExternalLinks(desc));

        if (links.length > 0) {
            ctas.push('Sidebar Link');
            conversionMarkers.push('Website Click');
        }
        if (data.submit_link_label) ctas.push(data.submit_link_label);

        profileHtml = JSON.stringify({
            displayName: data.display_name,
            title: data.title,
            publicDescription: pubDesc,
            subscribers: data.subscribers,
            activeAccounts: data.accounts_active,
            created: data.created_utc,
            over18: data.over18,
            headerImg: data.header_img,
            bannerImg: data.banner_img,
            iconImg: data.icon_img || data.community_icon,
        });
    }

    // Compute structured data fields
    let username: string | null = null;
    let karma: number | null = null;
    let postKarma: number | null = null;
    let commentKarma: number | null = null;
    let accountAgeDays: number | null = null;

    if (isUser) {
        username = data.name || null;
        karma = data.total_karma ?? null;
        postKarma = data.link_karma ?? null;
        commentKarma = data.comment_karma ?? null;
        if (data.created_utc) {
            const createdDate = new Date(data.created_utc * 1000);
            accountAgeDays = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
        }
    } else {
        // Subreddit: use display_name as "username", and subscribers as "karma" for authority metric
        username = data.display_name || null;
        karma = data.subscribers ?? null;
        if (data.created_utc) {
            const createdDate = new Date(data.created_utc * 1000);
            accountAgeDays = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
        }
    }

    const scrapedItem: ScrapedItem = {
        platform: 'reddit',
        url: request.loadedUrl || url,
        crawlerUsed: 'cheerio',
        scrapedAt: new Date().toISOString(),
        data: {
            revenueIndicators: {
                ctas,
                links: Array.from(new Set(links)),
                conversionMarkers,
            },
            kind,
            profileHtml,
            // screenshotUrl placeholder, filled by Playwright screenshot-collector
            screenshotUrl: '',
            // Structured fields for direct Supabase mapping
            username,
            karma,
            postKarma,
            commentKarma,
            accountAgeDays,
            postsCount: null, // Not available from about.json endpoint
        } as any,
        errors: [],
    };

    log.info(`[Reddit] Extracted ${links.length} links, ${ctas.length} CTAs`, {
        url,
        kind,
    });

    return [scrapedItem];
}

/**
 * Validate that the extracted Reddit data contains expected keys.
 * @param data - The extracted data object.
 * @returns True if required fields are present.
 */
function validate(data: Record<string, unknown>): boolean {
    const payload = data as any;
    if (!payload || typeof payload !== 'object') return false;
    if (!payload.revenueIndicators) return false;
    if (!Array.isArray(payload.revenueIndicators.links)) return false;
    if (typeof payload.profileHtml !== 'string') return false;
    if (typeof payload.kind !== 'string') return false;
    return true;
    return true;
}

/**
 * Detect if the response indicates a Reddit block (rate limit, error page).
 * @param responseBody - The raw response body.
 * @returns True if a block is detected.
 */
function detectBlock(responseBody: string): boolean {
    const lower = responseBody.toLowerCase();
    return (
        lower.includes('whoa there, pardner') ||
        lower.includes('too many requests') ||
        lower.includes('"error": 429') ||
        lower.includes('rate limit')
    );
}

/** Assembled handler export satisfying the CheerioHandler interface. */
const redditHandler: CheerioHandler = {
    crawlerType: 'cheerio',
    handle,
    validate,
    detectBlock,
};
export default redditHandler;
