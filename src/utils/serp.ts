/**
 * @module utils/serp
 * @description Utility for interacting with Search Engine Results Page (SERP) APIs.
 * Primarily uses SerpApi for reliable organic result tracking.
 */

import { log } from './logger.js';

export interface OrganicResult {
    position: number;
    title: string;
    link: string;
    snippet: string;
    displayed_link: string;
}

export interface SerpData {
    organic_results: OrganicResult[];
    search_metadata: {
        id: string;
        status: string;
    };
    local_results?: any[];
}

/**
 * Perform a Google Search via SerpApi.
 * @param query - The search query string.
 * @param apiKey - SerpApi private key.
 * @returns Parsed SERP data.
 */
export async function fetchSerpApi(query: string, apiKey: string): Promise<SerpData | null> {
    const params = new URLSearchParams({
        engine: 'google',
        q: query,
        api_key: apiKey,
        num: '10', // Top 10 results for ranking position
    });

    const url = `https://serpapi.com/search?${params.toString()}`;
    log.info(`[SerpApi] Fetching results for: "${query}"`);

    try {
        const response = await fetch(url);
        if (!response.ok) {
            log.error(`[SerpApi] Request failed`, { status: response.status, statusText: response.statusText });
            return null;
        }

        const data = await response.json() as SerpData;
        return data;
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        log.error(`[SerpApi] Error fetching search results`, { error: msg });
        return null;
    }
}
