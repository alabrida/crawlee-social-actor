/**
 * @module scoring/crawl-quality
 * @description Assesses whether the website-hub crawl produced trustworthy forensics, so a
 * degraded/blocked crawl (which yields false-negative zeros across mechanisms) is flagged
 * instead of silently scored. Would have caught the Best Buy run (29.8s TTFB, 1 page).
 */

export interface CrawlQuality {
    status: 'ok' | 'degraded' | 'failed';
    reasons: string[];
    ttfb_ms: number | null;
    pages_crawled: number;
}

/** Threshold (ms) above which a hub TTFB indicates a slow/bot-blocked crawl. */
export const DEGRADED_TTFB_MS = 8000;

export function assessCrawlQuality(hub: any): CrawlQuality {
    const ttfb: number | null = typeof hub?.performance?.ttfb_ms === 'number' ? hub.performance.ttfb_ms : null;
    const pages: number = typeof hub?.pages_crawled === 'number' ? hub.pages_crawled : 0;

    if (!hub || hub.scrapeSuccess === false) {
        return { status: 'failed', reasons: ['Hub crawl failed, was blocked, or returned no forensics'], ttfb_ms: ttfb, pages_crawled: pages };
    }

    const reasons: string[] = [];
    if (ttfb !== null && ttfb > DEGRADED_TTFB_MS) {
        reasons.push(`Slow/likely bot-blocked crawl (TTFB ${ttfb}ms > ${DEGRADED_TTFB_MS}ms) — conversion/decision signals may be understated`);
    }
    if (pages <= 1) {
        reasons.push('Only the homepage was crawled — sub-page signals (forms, case studies, pricing) may be missing');
    }

    return { status: reasons.length > 0 ? 'degraded' : 'ok', reasons, ttfb_ms: ttfb, pages_crawled: pages };
}
