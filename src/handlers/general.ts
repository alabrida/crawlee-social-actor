import type { PlaywrightCrawlingContext } from 'crawlee';
import type { Page } from 'playwright';
import { blockResources } from '../utils/resources.js';
import type { PlaywrightHandler, HandlerContext, ScrapedItem } from '../types.js';

export interface Forensics {
    hasSsl: boolean;
    hasGoogleAnalytics: boolean;
    hasJsonLd: boolean;
    hasMetaDescription: boolean;
    hasCanonical: boolean;
    hasNewsletter: boolean;
    hasPrivacyPolicy: boolean;
    hasCookieBanner: boolean;
    hasBlog: boolean;
    hasCaseStudies: boolean;
    hasTestimonials: boolean;
    hasLeadMagnet: boolean;
    hasQuiz: boolean;
    hasPricing: boolean;
    hasIntentTracking: boolean;
    hasInstantBooking: boolean;
}

/**
 * Extracts initial forensics data based on URL and raw HTML content.
 * @param url - The requested URL.
 * @param content - The raw HTML content of the page.
 * @returns Initial forensics object.
 */
export function extractInitialForensics(url: string, content: string): Forensics {
    return {
        hasSsl: url.startsWith('https'),
        hasGoogleAnalytics: content.includes('UA-') || content.includes('G-') || content.includes('googletagmanager.com'),
        hasJsonLd: content.includes('application/ld+json'),
        hasMetaDescription: false,
        hasCanonical: false,
        hasNewsletter: false,
        hasPrivacyPolicy: false,
        hasCookieBanner: content.toLowerCase().includes('cookie') && (content.toLowerCase().includes('consent') || content.toLowerCase().includes('accept')),
        hasBlog: content.includes('/blog') || content.includes('/news') || content.includes('/articles'),
        hasCaseStudies: content.includes('/case-study') || content.includes('/success-story') || content.includes('/customers'),
        hasTestimonials: content.includes('testimonial') || content.includes('reviews'),
        hasLeadMagnet: content.includes('.pdf') || content.includes('download') || content.includes('ebook') || content.includes('whitepaper'),
        hasQuiz: content.includes('quiz') || content.includes('assessment') || content.includes('calculator'),
        hasPricing: content.includes('/pricing') || content.toLowerCase().includes('pricing'),
        hasIntentTracking: content.includes('facebook.com/tr') || content.includes('hubspot') || content.includes('marketo') || content.includes('intercom'),
        hasInstantBooking: content.includes('calendly') || content.includes('acuity') || content.includes('booking'),
    };
}

/**
 * Parses the page DOM to extract SEO markers, privacy policy, and CTA indicators.
 * Updates the forensics object and returns arrays of CTAs and conversion markers.
 * @param page - Playwright Page object.
 * @param forensics - The forensics object to update.
 * @param log - Logger instance for debugging.
 * @returns Object containing extracted ctas and conversionMarkers arrays.
 */
export async function extractPageData(
    page: Page,
    forensics: Forensics,
    log: PlaywrightCrawlingContext['log']
): Promise<{ ctas: string[], conversionMarkers: string[] }> {
    const ctas: string[] = [];
    const conversionMarkers: string[] = [];

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
                if (ind.term === 'pricing') forensics.hasPricing = true;
            }
        }

        // Deep link analysis for high-fidelity signals
        const links = await page.locator('a').evaluateAll(els => els.map(el => (el as HTMLAnchorElement).href));
        for (const link of links) {
            const lowLink = link.toLowerCase();
            if (lowLink.includes('/blog') || lowLink.includes('/news')) forensics.hasBlog = true;
            if (lowLink.includes('/case-study') || lowLink.includes('/success-story')) forensics.hasCaseStudies = true;
            if (lowLink.includes('/testimonial')) forensics.hasTestimonials = true;
            if (lowLink.includes('calendly.com/') || lowLink.includes('acuityscheduling.com')) forensics.hasInstantBooking = true;
        }

        // Form detection for "Capture Forms"
        const formCount = await page.locator('form').count();
        if (formCount > 0) conversionMarkers.push(`Signal: Forms Detected (${formCount})`);

        // Map forensics to markers for immediate visibility
        Object.entries(forensics).forEach(([key, val]) => {
            if (val) conversionMarkers.push(`Signal: ${key}`);
        });

    } catch (e) {
        log.debug('[General] Failed to parse body text', { error: String(e) });
    }

    return { ctas, conversionMarkers };
}

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
        waitUntil: 'domcontentloaded',
        timeout: 60000 
    });

    const content = await page.content();
    const isBlocked = detectBlock(content);
    
    if (isBlocked || (response && response.status() >= 400)) {
        log.warning(`[General] WAF challenge or block detected at ${request.url} (Status: ${response?.status()})`);
    }

    const links: string[] = [];
    let ctas: string[] = [];
    let conversionMarkers: string[] = [];

    // Phase 2: Technical Forensics
    const forensics = extractInitialForensics(request.url, content);

    // Generic extraction: look for "Book Now", "Contact", "Pricing", etc.
    if (!isBlocked) {
        const extractedData = await extractPageData(page, forensics, log);
        ctas = extractedData.ctas;
        conversionMarkers = extractedData.conversionMarkers;
    } else {
        conversionMarkers.push('BLOCKED: WAF Challenge Detected');
    }

    // Extract additional structured fields for business hub mapping
    let metaDescription: string | null = null;
    let canonicalUrl: string | null = null;
    let loadedUrl: string | null = null;
    let httpStatus: number | null = null;

    try {
        const metaDesc = await page.locator('meta[name="description"]').getAttribute('content').catch(() => null);
        if (metaDesc) metaDescription = metaDesc;

        const canonical = await page.locator('link[rel="canonical"]').getAttribute('href').catch(() => null);
        if (canonical) canonicalUrl = canonical;

        loadedUrl = page.url();
        httpStatus = response ? response.status() : null;
    } catch (e) {
        // ignore extraction failures
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
            // Structured fields for direct Supabase mapping
            metaDescription,
            canonicalUrl,
            loadedUrl,
            httpStatus,
            scrapeSuccess: !isBlocked && (response ? response.status() < 400 : false),
        } as any,
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
        typeof payload.profileHtml === 'string'
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
