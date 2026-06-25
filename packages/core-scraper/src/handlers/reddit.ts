/**
 * @module handlers/reddit
 * @description Reddit handler using CheerioCrawler with the public .json endpoint.
 */

import type { CheerioCrawlingContext } from 'crawlee';
import type { CheerioHandler, HandlerContext, ScrapedItem } from '../types.js';
import { analyzeBio } from '../utils/bio-analyzer.js';
import { getRedditAccessToken, redditRequestHeaders, toOauthUrls } from '../api/reddit.js';

const URL_REGEX = /https?:\/\/[^\s)\]>"]+/gi;

function extractExternalLinks(text: string): string[] {
    if (!text) return [];
    const matches = text.match(URL_REGEX) || [];
    const external = matches.filter(
        (url) => !url.includes('reddit.com') && !url.includes('redd.it')
    );
    return Array.from(new Set(external));
}

export async function handle(
    context: CheerioCrawlingContext,
    _handlerContext: HandlerContext
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

    const kind = parsed.kind as string;
    const data = parsed.data as Record<string, any>;

    if (!data) {
        throw new Error(`[Reddit] No data field in response for ${url}`);
    }

    const isUser = kind === 't2';
    const ctas: string[] = [];
    const links: string[] = [];
    const conversionMarkers: string[] = [];

    let username: string | null = null;
    let karma: number | null = null;
    let postKarma: number | null = null;
    let commentKarma: number | null = null;
    let accountAgeDays: number | null = null;
    let activeAccounts: number | null = null;
    let description = '';

    if (isUser) {
        username = data.name || null;
        karma = data.total_karma ?? null;
        postKarma = data.link_karma ?? null;
        commentKarma = data.comment_karma ?? null;
        description = data.subreddit?.public_description || '';

        links.push(...extractExternalLinks(description));
        links.push(...extractExternalLinks(data.subreddit?.title || ''));

        if (data.created_utc) {
            accountAgeDays = Math.floor((Date.now() - data.created_utc * 1000) / (1000 * 60 * 60 * 24));
        }
    } else {
        username = data.display_name || null;
        karma = data.subscribers ?? null;
        activeAccounts = data.accounts_active ?? null;
        description = data.public_description || '';

        links.push(...extractExternalLinks(description));
        links.push(...extractExternalLinks(data.description || ''));

        if (data.created_utc) {
            accountAgeDays = Math.floor((Date.now() - data.created_utc * 1000) / (1000 * 60 * 60 * 24));
        }
    }

    if (links.length > 0) {
        ctas.push(isUser ? 'Bio Link' : 'Sidebar Link');
        conversionMarkers.push('Website Click');
    }

    // Inline feed query for posts details. In OAuth mode the request URL is an
    // oauth.reddit.com `about` endpoint, so derive the authenticated listing URL and
    // attach the bearer token; otherwise fall back to the public `.json` feed.
    let postsCount: number | null = null;
    let latestPostDate: string | null = null;
    try {
        const isOauth = url.includes('oauth.reddit.com');
        let feedUrl = url.replace('/about.json', '.json');
        let feedHeaders: Record<string, string> | undefined;
        if (isOauth) {
            const oauth = toOauthUrls(url);
            const token = await getRedditAccessToken();
            if (oauth && token) {
                feedUrl = oauth.listingUrl;
                feedHeaders = redditRequestHeaders(token);
            }
        }
        const feedResp = await context.sendRequest({ url: feedUrl, headers: feedHeaders });
        const feedJson = JSON.parse(feedResp.body);
        if (feedJson?.data?.children) {
            const posts = feedJson.data.children;
            postsCount = posts.length; // baseline active post count in feed window
            if (posts.length > 0 && posts[0].data?.created_utc) {
                latestPostDate = new Date(posts[0].data.created_utc * 1000).toISOString();
            }
        }
    } catch (e) {
        log.warning(`[Reddit] Failed to fetch recent feed for ${url}`);
    }

    const bioAnalysis = analyzeBio(description);

    const scrapedItem: ScrapedItem = {
        platform: 'reddit',
        url: request.loadedUrl || url,
        crawlerUsed: 'cheerio',
        scrapedAt: new Date().toISOString(),
        data: {
            username,
            karma,
            followers: karma, // Alias
            postKarma,
            commentKarma,
            accountAgeDays,
            activeAccounts,
            postsCount,
            latestPostDate,
            bio_analysis: bioAnalysis,
            revenueIndicators: {
                ctas,
                links: Array.from(new Set(links)),
                conversionMarkers
            },
            screenshotUrl: ''
        } as any,
        errors: []
    };

    return [scrapedItem];
}

export function validate(data: Record<string, unknown>): boolean {
    return !!data && typeof data.username === 'string';
}

export function detectBlock(responseBody: string): boolean {
    const lower = responseBody.toLowerCase();
    return (
        lower.includes('whoa there, pardner') ||
        lower.includes('too many requests') ||
        lower.includes('"error": 429')
    );
}

const redditHandler: CheerioHandler = {
    crawlerType: 'cheerio',
    handle,
    validate,
    detectBlock
};

export default redditHandler;
