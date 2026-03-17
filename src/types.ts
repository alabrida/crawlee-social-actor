/**
 * @module types
 * @description Shared type definitions for the Crawlee social media scraping actor.
 */

import type { CheerioCrawlingContext, PlaywrightCrawlingContext } from 'crawlee';

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
    | 'twitter'
    | 'google_business_profile'
    | 'seo_serp'
    | 'general_hub'
    | 'general';

/**
 * Crawler type used for extraction.
 */
export type CrawlerType = 'cheerio' | 'playwright';

/**
 * Maps each platform to its crawler type.
 */
export const PLATFORM_CRAWLER_MAP: Record<Platform, CrawlerType> = {
    tiktok: 'playwright',
    youtube: 'cheerio',
    reddit: 'cheerio',
    google_maps: 'playwright',
    pinterest: 'playwright',
    linkedin: 'playwright',
    facebook: 'playwright',
    instagram: 'playwright',
    twitter: 'playwright',
    google_business_profile: 'playwright',
    seo_serp: 'playwright',
    general_hub: 'playwright',
    general: 'playwright',
};

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
    /** Third-party proxy URLs (used when useApifyProxy is false). */
    proxyUrls?: string[];
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
    /** Single business URL for discovery. */
    businessUrl?: string;
    /** Brand name/Business title. */
    brandName?: string;
    /** Email of the consultant triggering the run. */
    consultantEmail?: string;
    /** Workflow status (draft/final). */
    workflowStatus?: string;
    /** Supabase URL for direct upsert. */
    supabaseUrl?: string;
    /** Supabase Service Role Key. */
    supabaseServiceKey?: string;
    /** Proxy configuration. */
    proxy: ProxyConfig;
    /** Authentication tokens/cookies. */
    authTokens?: {
        linkedin?: string;
        facebook?: string;
        instagram?: string;
        twitter?: string;
    };
    /** Interactive Session Setup flag. */
    interactiveSessionSetup?: boolean;
    /** Maximum concurrent requests. */
    maxConcurrency: number;
    /** Maximum retries per failed request. */
    maxRequestRetries: number;
    /** LinkedIn daily profile cap. */
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
    data: Record<string, unknown> & {
        /** Public URL to the full-page screenshot in Apify KVS. */
        screenshotUrl: string;
    };
    /** Non-fatal warnings or issues. */
    errors: string[];
}

/**
 * Shared context passed to every handler from the crawler.
 * Provides access to actor input and shared utilities without
 * requiring handlers to create their own infrastructure.
 * @see G-CODE-02 — No handler may create its own SessionPool.
 * @see G-ENV-03 — Proxy config via shared utility.
 */
export interface HandlerContext {
    /** Full actor input for accessing platform-specific config. */
    input: ActorInput;
}

/**
 * Handler interface for CheerioCrawler-based platforms.
 * @see G-CODE-01
 */
export interface CheerioHandler {
    /** Crawler type identifier. */
    readonly crawlerType: 'cheerio';

    /**
     * Execute the scraping logic within a Cheerio crawling context.
     * @param context - The Crawlee CheerioCrawlingContext.
     * @param handlerContext - Shared handler context with actor input.
     * @returns Scraped item(s) in the normalized envelope.
     */
    handle(
        context: CheerioCrawlingContext,
        handlerContext: HandlerContext,
    ): Promise<ScrapedItem[]>;

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

/**
 * Handler interface for PlaywrightCrawler-based platforms.
 * @see G-CODE-01
 */
export interface PlaywrightHandler {
    /** Crawler type identifier. */
    readonly crawlerType: 'playwright';

    /**
     * Execute the scraping logic within a Playwright crawling context.
     * @param context - The Crawlee PlaywrightCrawlingContext.
     * @param handlerContext - Shared handler context with actor input.
     * @returns Scraped item(s) in the normalized envelope.
     */
    handle(
        context: PlaywrightCrawlingContext,
        handlerContext: HandlerContext,
    ): Promise<ScrapedItem[]>;

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

/**
 * Union type for all platform handlers.
 */
export type PlatformHandler = CheerioHandler | PlaywrightHandler;
