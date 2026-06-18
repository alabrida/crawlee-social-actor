import type { ActorInput, UrlEntry, Platform } from '../types.js';
import { PLATFORM_CRAWLER_MAP } from '../types.js';

/**
 * Prepares and partitions the input URLs into cheerio vs playwright crawl lists,
 * including any explicit target keywords search URLs.
 */
export function prepareUrls(input: ActorInput): { cheerioUrls: UrlEntry[], playwrightUrls: UrlEntry[], finalUrls: UrlEntry[] } {
    const finalUrls: UrlEntry[] = input.urls || [];
    if (input.businessUrl && !finalUrls.some(u => u.platform === 'general_hub')) {
        finalUrls.push({ platform: 'general_hub', url: input.businessUrl });
    }

    // Enqueue target keywords SERP checks if provided explicitly
    if (input.targetKeywords) {
        input.targetKeywords.forEach(kw => {
            if (kw && kw.trim()) {
                const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(kw.trim())}`;
                if (!finalUrls.some(u => u.platform === 'seo_serp' && u.url === searchUrl)) {
                    finalUrls.push({ platform: 'seo_serp', url: searchUrl });
                }
            }
        });
    }

    const cheerioUrls: UrlEntry[] = [];
    const playwrightUrls: UrlEntry[] = [];

    for (const entry of finalUrls) {
        const platform = entry.platform as Platform;
        const crawlerType = PLATFORM_CRAWLER_MAP[platform];
        if (crawlerType === 'cheerio') {
            cheerioUrls.push(entry);
        } else {
            playwrightUrls.push(entry);
        }
    }

    return { cheerioUrls, playwrightUrls, finalUrls };
}
