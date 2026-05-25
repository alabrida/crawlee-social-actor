/**
 * @module api/facebook
 * @description Facebook Graph API client.
 */

import { log } from '../utils/logger.js';

export interface FacebookPageData {
    id: string;
    name: string;
    about: string | null;
    category: string | null;
    fanCount: number | null; // Followers
    ratingCount: number | null;
    overallStarRating: number | null;
    website: string | null;
    link: string;
    verificationStatus: string | null;
}

/**
 * Fetches page details using Facebook Graph API.
 * @param pageIdOrUsername - The page ID or vanity username.
 * @param accessToken - Optional Graph API Page or User Access Token. Defaults to FACEBOOK_ACCESS_TOKEN env var.
 */
export async function fetchFacebookPage(
    pageIdOrUsername: string,
    accessToken: string | undefined = process.env.FACEBOOK_ACCESS_TOKEN
): Promise<FacebookPageData | null> {
    if (!accessToken) {
        log.info('[Facebook API] No Graph API Access Token provided. Fallback to browser scraper.');
        return null;
    }

    try {
        const fields = 'id,name,about,category,fan_count,rating_count,overall_star_rating,website,link,verification_status';
        const url = `https://graph.facebook.com/v19.0/${encodeURIComponent(pageIdOrUsername)}?fields=${fields}&access_token=${accessToken}`;
        
        log.info(`[Facebook API] Querying page details for: ${pageIdOrUsername}`);
        const res = await fetch(url);
        
        if (!res.ok) {
            log.error(`[Facebook API] Request failed: ${res.status} ${res.statusText}`);
            return null;
        }

        const data: any = await res.json();
        
        return {
            id: data.id || '',
            name: data.name || '',
            about: data.about || null,
            category: data.category || null,
            fanCount: typeof data.fan_count === 'number' ? data.fan_count : null,
            ratingCount: typeof data.rating_count === 'number' ? data.rating_count : null,
            overallStarRating: typeof data.overall_star_rating === 'number' ? data.overall_star_rating : null,
            website: data.website || null,
            link: data.link || `https://facebook.com/${data.id}`,
            verificationStatus: data.verification_status || null
        };
    } catch (e: unknown) {
        log.error(`[Facebook API] Error fetching page details: ${e instanceof Error ? e.message : String(e)}`);
        return null;
    }
}
