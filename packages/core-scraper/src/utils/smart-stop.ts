/**
 * @module utils/smart-stop
 * @description Manages the targeted crawl and adaptive stopping for the website (general hub) crawler.
 */

import { log } from './logger.js';

export interface KeyPage {
    url: string;
    type: 'pricing' | 'blog' | 'about' | 'contact' | 'case_study' | 'other';
    score: number;
}

const KEY_PAGE_PATTERNS = [
    { type: 'pricing', pattern: /\/(pricing|plans|rates|subscription|packages|fees|buy-now)\b/i, score: 10 },
    { type: 'blog', pattern: /\/(blog|news|articles|journal|posts)\b/i, score: 8 },
    { type: 'case_study', pattern: /\/(case-stud|success-stor|portfolio|customers|clients|case_study)\b/i, score: 9 },
    { type: 'contact', pattern: /\/(contact|support|get-in-touch|help|location|address)\b/i, score: 7 },
    { type: 'about', pattern: /\/(about|team|company|story|who-we-are)\b/i, score: 5 }
] as const;

/**
 * Filters a list of URLs to find and score key marketing pages.
 * @param urls - Raw URLs found on the page.
 * @param baseUrl - Base URL of the website to ensure same-domain filtering.
 */
export function identifyKeyPages(urls: string[], baseUrl: string): KeyPage[] {
    const keyPages: KeyPage[] = [];
    const baseDomain = new URL(baseUrl).hostname.replace('www.', '');

    const uniqueUrls = Array.from(new Set(urls));

    for (const url of uniqueUrls) {
        try {
            const parsedUrl = new URL(url);
            // Ensure same domain
            if (!parsedUrl.hostname.replace('www.', '').endsWith(baseDomain)) {
                continue;
            }

            const path = parsedUrl.pathname;
            let matched = false;

            for (const item of KEY_PAGE_PATTERNS) {
                if (item.pattern.test(path)) {
                    keyPages.push({
                        url: url,
                        type: item.type,
                        score: item.score
                    });
                    matched = true;
                    break;
                }
            }

            if (!matched) {
                keyPages.push({
                    url: url,
                    type: 'other',
                    score: 1
                });
            }
        } catch (e) {
            // Ignore invalid URLs
        }
    }

    // Sort by score descending (so pricing/case studies/blog are crawled first)
    return keyPages.sort((a, b) => b.score - a.score);
}

export class SmartCrawlTracker {
    private visitedUrls = new Set<string>();
    private enqueuedUrls = new Set<string>();
    private foundSignals = new Set<string>();
    private consecutiveDryPages = 0;
    private maxConsecutiveDryPages = 5;
    private maxPages = 15; // Target is 5-10, cap at 15
    private stopReason = 'in_progress';

    /**
     * Determines whether a URL should be crawled based on page limits and status.
     */
    public shouldCrawl(url: string): boolean {
        if (this.visitedUrls.size >= this.maxPages) {
            this.stopReason = 'max_pages_reached';
            return false;
        }
        if (this.consecutiveDryPages >= this.maxConsecutiveDryPages) {
            this.stopReason = 'signal_saturation';
            return false;
        }
        return !this.visitedUrls.has(url);
    }

    /**
     * Registers a crawled page and its detected signals.
     * Updates dry-run counters and checks for stop conditions.
     * @param url - The crawled URL.
     * @param signals - List of signal string identifiers.
     */
    public recordPageCrawl(url: string, signals: string[]): {
        shouldStop: boolean;
        newSignals: string[];
        stopReason: string;
    } {
        this.visitedUrls.add(url);
        
        const newSignals: string[] = [];
        for (const sig of signals) {
            if (!this.foundSignals.has(sig)) {
                this.foundSignals.add(sig);
                newSignals.push(sig);
            }
        }

        if (newSignals.length > 0) {
            this.consecutiveDryPages = 0; // Reset dry counter
        } else {
            this.consecutiveDryPages++;
        }

        let shouldStop = false;
        if (this.visitedUrls.size >= this.maxPages) {
            this.stopReason = 'max_pages_reached';
            shouldStop = true;
        } else if (this.consecutiveDryPages >= this.maxConsecutiveDryPages) {
            this.stopReason = 'signal_saturation';
            shouldStop = true;
        }

        log.info(`[SmartCrawl] Page Crawled: ${url}. New Signals: ${newSignals.join(', ') || 'none'}. Dry run streak: ${this.consecutiveDryPages}/${this.maxConsecutiveDryPages}`);

        return {
            shouldStop,
            newSignals,
            stopReason: this.stopReason
        };
    }

    public trackEnqueued(url: string): void {
        this.enqueuedUrls.add(url);
    }

    public isEnqueued(url: string): boolean {
        return this.enqueuedUrls.has(url);
    }

    public getSummary() {
        return {
            pagesCrawled: this.visitedUrls.size,
            visitedUrls: Array.from(this.visitedUrls),
            signalsFound: Array.from(this.foundSignals),
            stopReason: this.stopReason
        };
    }
}
