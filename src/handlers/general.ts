import type { PlaywrightCrawlingContext } from 'crawlee';
import { blockResources } from '../utils/resources.js';
import type { PlaywrightHandler, HandlerContext, ScrapedItem } from '../types.js';

/**
 * Handle general business website URLs.
 * @param context - Crawlee PlaywrightCrawlingContext.
 * @param _handlerContext - Shared handler context.
 * @returns Array of scraped items.
 */
export async function handle(
    context: PlaywrightCrawlingContext,
    _handlerContext: HandlerContext,
): Promise<ScrapedItem[]> {
    const { page, request, log } = context;

    log.info(`[General] Extracting: ${request.url}`);

    // G-COST-02: Block heavy resources
    await blockResources(page, ['media', 'font']);

    const response = await page.goto(request.url, { 
        waitUntil: 'networkidle',
        timeout: 60000 
    });

    const content = await page.content();
    const isBlocked = detectBlock(content);
    
    if (isBlocked || (response && response.status() >= 400)) {
        log.warning(`[General] WAF challenge or block detected at ${request.url} (Status: ${response?.status()})`);
    }

    const links: string[] = [];
    const ctas: string[] = [];
    const conversionMarkers: string[] = [];

    // Phase 2: Technical Forensics
    const forensics = {
        hasSsl: request.url.startsWith('https'),
        hasGoogleAnalytics: content.includes('UA-') || content.includes('G-') || content.includes('googletagmanager.com'),
        hasJsonLd: content.includes('application/ld+json'),
        hasMetaDescription: false,
        hasCanonical: false,
        hasNewsletter: false,
        hasPrivacyPolicy: false,
    };

    // Generic extraction: look for "Book Now", "Contact", "Pricing", etc.
    if (!isBlocked) {
        try {
            // Check for SEO metadata
            const metaDescription = await page.locator('meta[name="description"]').getAttribute('content').catch(() => null);
            if (metaDescription) forensics.hasMetaDescription = true;

            const canonical = await page.locator('link[rel="canonical"]').getAttribute('href').catch(() => null);
            if (canonical) forensics.hasCanonical = true;

            // Check for Privacy Policy
            const privacyLinkCount = await page.locator('a[href*="privacy"]').count();
            if (privacyLinkCount > 0) forensics.hasPrivacyPolicy = true;

            const textContent = await page.innerText('body');
            const lowerText = textContent.toLowerCase();

            const indicators = [
                { term: 'book now', label: 'Booking CTA' },
                { term: 'contact us', label: 'Contact CTA' },
                { term: 'pricing', label: 'Pricing Link' },
                { term: 'free trial', label: 'Trial CTA' },
                { term: 'get started', label: 'Onboarding CTA' },
                { term: 'sign up', label: 'Signup CTA' },
                { term: 'newsletter', label: 'Newsletter' },
                { term: 'subscribe', label: 'Subscription' },
            ];

            for (const ind of indicators) {
                if (lowerText.includes(ind.term)) {
                    ctas.push(ind.label);
                    if (ind.term === 'newsletter' || ind.term === 'subscribe') forensics.hasNewsletter = true;
                }
            }

            // Map forensics to markers for immediate visibility
            Object.entries(forensics).forEach(([key, val]) => {
                if (val) conversionMarkers.push(`Signal: ${key}`);
            });

        } catch (e) {
            log.debug('[General] Failed to parse body text', { error: String(e) });
        }
    } else {
        conversionMarkers.push('BLOCKED: WAF Challenge Detected');
    }

    const scrapedItem: ScrapedItem = {
        platform: 'general',
        url: request.url,
        crawlerUsed: 'playwright',
        scrapedAt: new Date().toISOString(),
        data: {
            revenueIndicators: {
                ctas,
                links,
                conversionMarkers,
            },
            forensics, // Phase 2 Structured Data
            profileHtml: content,
            screenshotUrl: '',
        },
        errors: []
    };

    return [scrapedItem];
}

/**
 * Validate extracted general website data.
 * @param data - The data object.
 * @returns True if valid.
 */
export function validate(data: Record<string, unknown>): boolean {
    const payload = data as any;
    return (
        !!payload &&
        !!payload.revenueIndicators &&
        typeof payload.profileHtml === 'string' &&
        typeof payload.screenshotUrl === 'string'
    );
}

/**
 * Detect WAF blocks (Cloudflare, DataDome, etc.).
 * @param responseBody - Page content.
 * @returns True if blocked.
 */
export function detectBlock(responseBody: string): boolean {
    const lower = responseBody.toLowerCase();
    return (
        lower.includes('checking your browser') ||
        lower.includes('just a moment') ||
        lower.includes('verifying you are human') ||
        lower.includes('access denied') ||
        lower.includes('datadome') ||
        lower.includes('cloudflare') ||
        lower.includes('perimeterx')
    );
}

const generalHandler: PlaywrightHandler = {
    crawlerType: 'playwright',
    handle,
    validate,
    detectBlock,
};

export default generalHandler;
