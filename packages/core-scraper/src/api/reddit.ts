/**
 * @module api/reddit
 * @description Official Reddit API client (OAuth2 application-only / client_credentials).
 *
 * NOTE ON APPROACH: Reddit's `developers.reddit.com` "server" API (`@devvit/reddit`)
 * only runs inside Reddit's Devvit serverless runtime for apps installed into a
 * subreddit — it cannot be called from an external Apify actor. The externally
 * callable official API is the classic OAuth2 REST API on `oauth.reddit.com`.
 * As of 2026 Reddit rejects unauthenticated/no-OAuth traffic outright (the 403 we
 * hit on `www.reddit.com/.../about.json`), so authenticated access is mandatory.
 *
 * Requires a registered + approved app (reddit.com/prefs/apps):
 *   REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET   (script/web app credentials)
 *   REDDIT_USER_AGENT                         (descriptive UA — Reddit blocks generic ones)
 *
 * Free tier: 100 queries/min per OAuth client id (10-min averaged window).
 */

import { log } from '../utils/logger.js';

const TOKEN_URL = 'https://www.reddit.com/api/v1/access_token';
const DEFAULT_UA = 'web:alabrida-revenue-audit:1.0 (by /u/alabrida)';

let cachedToken: { value: string; expiresAt: number } | null = null;

/**
 * Whether the official Reddit OAuth API has credentials configured. Unlike the
 * X/YouTube/Facebook official APIs (gated behind OFFICIAL_APIS_ENABLED because they
 * need platform approvals), Reddit's OAuth API is free + self-serve and is the ONLY
 * reliable path — Reddit 403s `.json` scraping even with a session cookie. So it
 * activates on its own credentials, independent of the global flag.
 */
export function isRedditApiEnabled(): boolean {
    return !!(process.env.REDDIT_CLIENT_ID && process.env.REDDIT_CLIENT_SECRET);
}

/** Descriptive User-Agent — Reddit rate-limits/blocks generic agents. */
export function redditUserAgent(): string {
    return process.env.REDDIT_USER_AGENT || DEFAULT_UA;
}

/** Standard authenticated request headers for oauth.reddit.com calls. */
export function redditRequestHeaders(token: string): Record<string, string> {
    return { Authorization: `Bearer ${token}`, 'User-Agent': redditUserAgent() };
}

/**
 * Fetch (and cache) an application-only access token via client_credentials.
 * Returns null if credentials are missing or the token request fails.
 */
export async function getRedditAccessToken(): Promise<string | null> {
    if (!isRedditApiEnabled()) return null;
    if (cachedToken && Date.now() < cachedToken.expiresAt) return cachedToken.value;

    const basic = Buffer.from(
        `${process.env.REDDIT_CLIENT_ID}:${process.env.REDDIT_CLIENT_SECRET}`,
    ).toString('base64');

    try {
        const res = await fetch(TOKEN_URL, {
            method: 'POST',
            headers: {
                Authorization: `Basic ${basic}`,
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': redditUserAgent(),
            },
            body: 'grant_type=client_credentials',
        });

        if (!res.ok) {
            log.error(`[Reddit API] Token request failed: ${res.status} ${res.statusText}`);
            return null;
        }

        const body: any = await res.json();
        if (!body.access_token) {
            log.error('[Reddit API] Token response missing access_token.');
            return null;
        }

        const ttlMs = (typeof body.expires_in === 'number' ? body.expires_in : 3600) * 1000;
        // Refresh a minute early to avoid edge-of-expiry 401s.
        cachedToken = { value: body.access_token, expiresAt: Date.now() + ttlMs - 60_000 };
        log.info('[Reddit API] Obtained application-only access token.');
        return cachedToken.value;
    } catch (e: unknown) {
        log.error(`[Reddit API] Token request error: ${e instanceof Error ? e.message : String(e)}`);
        return null;
    }
}

/**
 * Convert a public subreddit/user URL into the authenticated oauth.reddit.com
 * `about` + `listing` endpoints. Returns null for unrecognized URLs.
 */
export function toOauthUrls(originalUrl: string): { aboutUrl: string; listingUrl: string } | null {
    try {
        const u = new URL(originalUrl);
        const path = u.pathname.replace(/\/(about)?(\.json)?\/?$/, '');
        const subMatch = path.match(/\/r\/([^/]+)/i);
        if (subMatch) {
            const sub = subMatch[1];
            return {
                aboutUrl: `https://oauth.reddit.com/r/${sub}/about`,
                listingUrl: `https://oauth.reddit.com/r/${sub}/hot?limit=25`,
            };
        }
        const userMatch = path.match(/\/(?:user|u)\/([^/]+)/i);
        if (userMatch) {
            const user = userMatch[1];
            return {
                aboutUrl: `https://oauth.reddit.com/user/${user}/about`,
                listingUrl: `https://oauth.reddit.com/user/${user}/submitted?limit=25`,
            };
        }
        return null;
    } catch {
        return null;
    }
}
