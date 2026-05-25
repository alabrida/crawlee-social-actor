/**
 * @module api/youtube
 * @description YouTube Data API v3 client.
 */

import { log } from '../utils/logger.js';

export interface YoutubeChannelData {
    id: string;
    title: string;
    description: string;
    customUrl: string;
    publishedAt: string;
    subscriberCount: number | null;
    videoCount: number | null;
    viewCount: number | null;
    recentVideos: Array<{
        videoId: string;
        title: string;
        publishedAt: string;
    }>;
}

/**
 * Fetches channel details and recent videos using YouTube Data API v3.
 * @param identifier - Channel handle (e.g. "@creator") or channel ID (e.g. "UC...").
 * @param apiKey - Optional GCP API Key. Defaults to GOOGLE_CLOUD_API_KEY env var.
 */
export async function fetchYoutubeChannel(
    identifier: string,
    apiKey: string | undefined = process.env.GOOGLE_CLOUD_API_KEY
): Promise<YoutubeChannelData | null> {
    if (!apiKey) {
        log.warning('[YouTube API] Missing API Key. Skipping API call.');
        return null;
    }

    try {
        let channelId = '';
        let handle = identifier.trim();

        // Check if identifier is an ID
        if (handle.startsWith('UC') && handle.length === 24) {
            channelId = handle;
        } else {
            // It's a handle
            if (!handle.startsWith('@')) {
                handle = `@${handle}`;
            }

            log.info(`[YouTube API] Resolving channel handle: ${handle}`);
            const resolveUrl = `https://www.googleapis.com/youtube/v3/channels?part=id,snippet,statistics&forHandle=${encodeURIComponent(handle)}&key=${apiKey}`;
            const res = await fetch(resolveUrl);
            if (!res.ok) {
                log.error(`[YouTube API] Resolve handle request failed: ${res.statusText}`);
                return null;
            }
            const data: any = await res.json();
            if (data.items && data.items.length > 0) {
                const item = data.items[0];
                return await extractChannelDetails(item, apiKey);
            } else {
                // Try search.list fallback if forHandle returns empty
                log.info(`[YouTube API] forHandle returned empty. Trying search search...`);
                const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(handle)}&type=channel&key=${apiKey}`;
                const searchRes = await fetch(searchUrl);
                if (searchRes.ok) {
                    const searchData: any = await searchRes.json();
                    if (searchData.items && searchData.items.length > 0) {
                        channelId = searchData.items[0].snippet.channelId;
                    }
                }
            }
        }

        if (!channelId) {
            log.warning(`[YouTube API] Could not resolve channel for: ${identifier}`);
            return null;
        }

        log.info(`[YouTube API] Fetching channel details for ID: ${channelId}`);
        const detailsUrl = `https://www.googleapis.com/youtube/v3/channels?part=id,snippet,statistics&id=${channelId}&key=${apiKey}`;
        const res = await fetch(detailsUrl);
        if (!res.ok) {
            log.error(`[YouTube API] Channel details request failed: ${res.statusText}`);
            return null;
        }
        const data: any = await res.json();
        if (!data.items || data.items.length === 0) {
            return null;
        }

        return await extractChannelDetails(data.items[0], apiKey);
    } catch (e: unknown) {
        log.error(`[YouTube API] Error fetching channel data: ${e instanceof Error ? e.message : String(e)}`);
        return null;
    }
}

async function extractChannelDetails(item: any, apiKey: string): Promise<YoutubeChannelData> {
    const id = item.id;
    const snippet = item.snippet || {};
    const stats = item.statistics || {};

    const title = snippet.title || '';
    const description = snippet.description || '';
    const customUrl = snippet.customUrl || '';
    const publishedAt = snippet.publishedAt || '';

    const subscriberCount = stats.subscriberCount ? parseInt(stats.subscriberCount, 10) : null;
    const videoCount = stats.videoCount ? parseInt(stats.videoCount, 10) : null;
    const viewCount = stats.viewCount ? parseInt(stats.viewCount, 10) : null;

    // Fetch recent videos (up to 5)
    const recentVideos: YoutubeChannelData['recentVideos'] = [];
    try {
        const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${id}&order=date&type=video&maxResults=5&key=${apiKey}`;
        const searchRes = await fetch(searchUrl);
        if (searchRes.ok) {
            const searchData: any = await searchRes.json();
            if (searchData.items) {
                for (const video of searchData.items) {
                    recentVideos.push({
                        videoId: video.id?.videoId || '',
                        title: video.snippet?.title || '',
                        publishedAt: video.snippet?.publishedAt || ''
                    });
                }
            }
        }
    } catch (e) {
        log.warning(`[YouTube API] Failed to fetch recent videos for ${id}`);
    }

    return {
        id,
        title,
        description,
        customUrl,
        publishedAt,
        subscriberCount,
        videoCount,
        viewCount,
        recentVideos
    };
}
