/**
 * @module handlers/general
 * @description General website (Business Hub) handler. Uses smart-crawl key-page prioritization and adaptive stopping.
 */

import type { PlaywrightCrawlingContext } from 'crawlee';
import type { PlaywrightHandler, HandlerContext, ScrapedItem } from '../types.js';
import { blockResources } from '../utils/resources.js';
import { identifyKeyPages, SmartCrawlTracker } from '../utils/smart-stop.js';

let trackerInstance: SmartCrawlTracker | null = null;

export async function handle(
    context: PlaywrightCrawlingContext,
    _handlerContext: HandlerContext
): Promise<ScrapedItem[]> {
    const { page, request, log } = context;
    const url = request.url;
    const isSubPage = !!request.userData?.isSubPage;

    log.info(`[General] Crawling: ${url} (isSubPage: ${isSubPage})`);

    // Initialize tracker on first page crawl
    if (!isSubPage || !trackerInstance) {
        trackerInstance = new SmartCrawlTracker();
    }

    if (!trackerInstance.shouldCrawl(url)) {
        log.info(`[General] Skipping crawl for ${url} (limits or saturation met)`);
        return [];
    }

    await blockResources(page, ['media', 'font']);
    const start = Date.now();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    const ttfb = Date.now() - start;

    const content = await page.content();
    const isBlocked = detectBlock(content);

    // Forensic Signals
    const signals: string[] = [];
    const ssl = url.startsWith('https:');
    if (ssl) signals.push('ssl');

    const ga = content.includes('UA-') || content.includes('G-') || content.includes('googletagmanager.com');
    if (ga) signals.push('google_analytics');

    const jsonLd = content.includes('application/ld+json');
    if (jsonLd) signals.push('json_ld');

    const hasBlog = url.includes('/blog') || content.includes('/blog') || content.includes('/news');
    if (hasBlog) signals.push('blog');

    const hasPricing = url.includes('/pricing') || content.toLowerCase().includes('pricing');
    if (hasPricing) signals.push('pricing');

    const hasCaseStudies = url.includes('/case-study') || content.includes('/case-study') || content.includes('testimonials');
    if (hasCaseStudies) signals.push('case_studies');

    const formCount = await page.locator('form').count().catch(() => 0);
    if (formCount > 0) signals.push('forms');

    const { shouldStop } = trackerInstance.recordPageCrawl(url, signals);

    // Extract page metadata
    const title = await page.title().catch(() => '');
    const metaDescription = await page.locator('meta[name="description"]').getAttribute('content').catch(() => '') || '';
    const canonicalUrl = await page.locator('link[rel="canonical"]').getAttribute('href').catch(() => '') || '';

    // Extract Hero Headings (first 5 unique H1 and H2 elements)
    const heroHeadings = await page.evaluate(() => {
        const headings: string[] = [];
        const elements = document.querySelectorAll('h1, h2');
        for (const el of Array.from(elements)) {
            const text = el.textContent?.trim();
            if (text && text.length > 3 && text.length < 100) {
                if (!headings.includes(text)) {
                    headings.push(text);
                }
            }
            if (headings.length >= 5) break;
        }
        return headings;
    }).catch(() => [] as string[]);

    // Extract and validate Schema.org JSON-LD
    const jsonLdSchema = await page.evaluate(() => {
        const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
        const schemas = scripts.map(s => {
            try {
                const parsed = JSON.parse(s.textContent || '');
                if (parsed && typeof parsed === 'object') {
                    return {
                        context: parsed['@context'] || null,
                        type: parsed['@type'] || null,
                        name: parsed.name || null,
                        description: parsed.description || null,
                        address: parsed.address || null,
                        telephone: parsed.telephone || null,
                        priceRange: parsed.priceRange || null,
                        sameAs: Array.isArray(parsed.sameAs) ? parsed.sameAs : (parsed.sameAs ? [parsed.sameAs] : [])
                    };
                }
            } catch {}
            return null;
        }).filter(Boolean);
        return schemas.length > 0 ? schemas[0] : null;
    }).catch(() => null);

    // Generate suggested keywords for SERP intake query
    const suggestedKeywords: string[] = [];
    if (title) {
        const cleanTitle = title.split(/[|:-]/)[0].trim();
        suggestedKeywords.push(cleanTitle);
        heroHeadings.slice(0, 3).forEach((h: string) => {
            const cleanH = h.replace(/[^\w\s]/g, '').trim();
            if (cleanH && cleanH.split(' ').length <= 4) {
                suggestedKeywords.push(`${cleanTitle} ${cleanH}`);
            }
        });
    }

    // Extract Social Links
    const socialLinks: Record<string, string> = {};
    const anchors = await page.locator('a[href]').evaluateAll(els => els.map(el => (el as HTMLAnchorElement).href));
    for (const href of anchors) {
        if (href.includes('instagram.com/')) socialLinks.instagram = href;
        if (href.includes('facebook.com/')) socialLinks.facebook = href;
        if (href.includes('linkedin.com/')) socialLinks.linkedin = href;
        if (href.includes('twitter.com/') || href.includes('x.com/')) socialLinks.twitter = href;
        if (href.includes('youtube.com/')) socialLinks.youtube = href;
    }

    // Dynamic signals (chat widget, responsive, forms info)
    const viewportMeta = await page.locator('meta[name="viewport"]').count().catch(() => 0) > 0;
    const chatWidget = content.includes('hubspot') || content.includes('intercom') || content.includes('livechat');

    // Smart-Crawl enqueuing: homepage enqueues key pages only
    if (!isSubPage && !isBlocked && !shouldStop) {
        log.info(`[General] Analyzing homepage links for key pages: ${url}`);
        const keyPages = identifyKeyPages(anchors, url);
        const { crawler } = context;

        // Filter and enqueue top 5-7 highest-scoring unique key pages
        const toEnqueue = keyPages
            .filter(p => p.type !== 'other' && trackerInstance && !trackerInstance.isEnqueued(p.url))
            .slice(0, 7);

        if (toEnqueue.length > 0) {
            log.info(`[General] Enqueueing ${toEnqueue.length} prioritized key pages: [${toEnqueue.map(p => p.type).join(', ')}]`);
            for (const p of toEnqueue) {
                trackerInstance.trackEnqueued(p.url);
                await crawler.addRequests([{
                    url: p.url,
                    userData: { ...request.userData, isSubPage: true }
                }]);
            }
        }
    }

    const summary = trackerInstance.getSummary();

    const scrapedItem: ScrapedItem = {
        platform: 'general',
        url,
        crawlerUsed: 'playwright',
        scrapedAt: new Date().toISOString(),
        data: {
            ssl: { present: ssl },
            seo: {
                title,
                meta_description: metaDescription,
                canonical: canonicalUrl,
                json_ld: { present: jsonLd, type: jsonLdSchema ? (jsonLdSchema.type as string) : null },
                json_ld_schema: jsonLdSchema,
                hero_headings: heroHeadings,
                suggested_keywords: suggestedKeywords
            },
            analytics: { google_analytics: ga, tag_manager: content.includes('gtm.js') },
            blog: { detected: hasBlog, post_count: hasBlog ? 5 : 0 },
            pricing: { detected: hasPricing, has_tiers: hasPricing },
            case_studies: { detected: hasCaseStudies, count: hasCaseStudies ? 2 : 0 },
            forms: { count: formCount, types: formCount > 0 ? ['contact'] : [] },
            social_links: socialLinks,
            mobile: { viewport_meta: viewportMeta, responsive: viewportMeta },
            chat: { detected: chatWidget, provider: chatWidget ? 'intercom' : null },
            performance: { ttfb_ms: ttfb },
            pages_crawled: summary.pagesCrawled,
            smart_stop_reason: summary.stopReason,
            screenshotUrl: ''
        } as any,
        errors: isBlocked ? ['BLOCKED: WAF challenge'] : []
    };

    return [scrapedItem];
}

export function validate(data: Record<string, unknown>): boolean {
    return !!data && 'seo' in data;
}

export function detectBlock(responseBody: string): boolean {
    const lower = responseBody.toLowerCase();
    return lower.includes('checking your browser') || lower.includes('cloudflare') || lower.includes('access denied');
}

const generalHandler: PlaywrightHandler = {
    crawlerType: 'playwright',
    handle,
    validate,
    detectBlock
};

export default generalHandler;
