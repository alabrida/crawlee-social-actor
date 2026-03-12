/**
 * @module types
 * @description Shared type definitions for the Crawlee social media scraping actor.
 */

/**
 * Supported platform identifiers.
 */
export type Platform =
    | 'tiktok'
    | 'youtube'
    | 'linkedin'
    | 'google_maps'
    | 'pinterest'
    | 'reddit'
    | 'facebook'
    | 'instagram'
    | 'general';

/**
 * Crawler type used for extraction.
 */
export type CrawlerType = 'cheerio' | 'playwright';

/**
 * A single target URL entry from actor input.
 */
export interface UrlEntry {
    /** Platform identifier. */
    platform: Platform;
    /** Full URL to scrape. */
    url: string;
}

/**
 * Proxy configuration from actor input.
 */
export interface ProxyConfig {
    /** Whether to use the Apify proxy. */
    useApifyProxy: boolean;
    /** Apify proxy group names (e.g., RESIDENTIAL). */
    apifyProxyGroups: string[];
}

/**
 * Google Maps grid configuration.
 */
export interface GoogleMapsGridConfig {
    /** Whether geographic grid splitting is enabled. */
    enabled: boolean;
    /** Grid cell size in kilometers. */
    cellSizeKm: number;
}

/**
 * Full actor input shape.
 */
export interface ActorInput {
    /** Platforms to enable for this run. */
    platforms: Platform[];
    /** Target URLs to scrape. */
    urls: UrlEntry[];
    /** Proxy configuration. */
    proxy: ProxyConfig;
    /** Maximum concurrent requests. */
    maxConcurrency: number;
    /** Maximum retries per failed request. */
    maxRequestRetries: number;
    /** LinkedIn daily profile cap (G-BOT-01: max 250). */
    linkedinDailyLimit: number;
    /** Google Maps grid config. */
    googleMapsGrid: GoogleMapsGridConfig;
}

/**
 * Normalized output envelope for every scraped item.
 * @see PRD Section 8
 */
export interface ScrapedItem {
    /** Source platform. */
    platform: Platform;
    /** Original URL that was scraped. */
    url: string;
    /** ISO 8601 timestamp of extraction. */
    scrapedAt: string;
    /** Which crawler type was used. */
    crawlerUsed: CrawlerType;
    /** Platform-specific structured data. */
    data: Record<string, unknown>;
    /** Non-fatal warnings or issues. */
    errors: string[];
}

/**
 * Handler interface that every platform handler must implement.
 * @see G-CODE-01
 */
export interface PlatformHandler {
    /**
     * Execute the scraping logic for a given URL.
     * @param url - The target URL to scrape.
     * @returns Scraped item(s) in the normalized envelope.
     */
    handle(url: string): Promise<ScrapedItem[]>;

    /**
     * Validate that extracted data contains expected keys (schema-drift detection).
     * @param data - The extracted data object to validate.
     * @returns True if the data structure is valid.
     */
    validate(data: Record<string, unknown>): boolean;

    /**
     * Detect if the page response indicates a block (CAPTCHA, challenge, empty-data).
     * @param responseBody - The raw response body or page content to inspect.
     * @returns True if a block is detected.
     */
    detectBlock(responseBody: string): boolean;
}
