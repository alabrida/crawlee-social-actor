/**
 * @module api/twitter
 * @description X (Twitter) API v2 client.
 */

import { log } from '../utils/logger.js';

export interface TwitterUserData {
    id: string;
    name: string;
    username: string;
    description: string;
    createdAt: string;
    verified: boolean;
    location: string | null;
    pinnedTweetId: string | null;
    followersCount: number | null;
    followingCount: number | null;
    tweetCount: number | null;
}

/**
 * Fetches user profile details using X API v2.
 * @param username - X/Twitter handle (without @).
 * @param bearerToken - Optional X API Bearer Token. Defaults to X_BEARER_TOKEN or TWITTER_BEARER_TOKEN env vars.
 */
export async function fetchTwitterUser(
    username: string,
    bearerToken: string | undefined = process.env.X_BEARER_TOKEN || process.env.TWITTER_BEARER_TOKEN
): Promise<TwitterUserData | null> {
    if (!bearerToken) {
        log.info('[X API] No Bearer Token provided. Fallback to browser/JSON-LD scraper.');
        return null;
    }

    try {
        const cleanUsername = username.replace(/^@/, '').trim();
        const fields = 'user.fields=public_metrics,description,created_at,verified,location,pinned_tweet_id';
        const url = `https://api.twitter.com/2/users/by/username/${encodeURIComponent(cleanUsername)}?${fields}`;
        
        log.info(`[X API] Fetching user details for: ${cleanUsername}`);
        const res = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${bearerToken}`
            }
        });

        if (!res.ok) {
            log.error(`[X API] Request failed: ${res.status} ${res.statusText}`);
            return null;
        }

        const body: any = await res.json();
        if (!body.data) {
            log.warning(`[X API] No user data found for: ${cleanUsername}`);
            return null;
        }

        const data = body.data;
        const metrics = data.public_metrics || {};

        return {
            id: data.id || '',
            name: data.name || '',
            username: data.username || cleanUsername,
            description: data.description || '',
            createdAt: data.created_at || '',
            verified: data.verified || false,
            location: data.location || null,
            pinnedTweetId: data.pinned_tweet_id || null,
            followersCount: typeof metrics.followers_count === 'number' ? metrics.followers_count : null,
            followingCount: typeof metrics.following_count === 'number' ? metrics.following_count : null,
            tweetCount: typeof metrics.tweet_count === 'number' ? metrics.tweet_count : null
        };
    } catch (e: unknown) {
        log.error(`[X API] Error fetching user details: ${e instanceof Error ? e.message : String(e)}`);
        return null;
    }
}
