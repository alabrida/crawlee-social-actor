/**
 * @module handlers/google-maps
 * @description Google Business Profile (Maps) handler using PlaywrightCrawler.
 * Direct profile extraction targeting revenue indicators.
 * @see PRD Section 5.4
 */

import type { PlaywrightCrawlingContext } from 'crawlee';
import type { PlaywrightHandler, HandlerContext, ScrapedItem } from '../types.js';
import { blockResources } from '../utils/resources.js';
import { reportIssue } from '../utils/issue-log.js';

/**
 * Handles Google Maps profile extraction.
 * @param context The Playwright crawling context.
 * @param _handlerContext The shared handler context.
 * @returns An array of scraped items.
 */
export async function handle(
    context: PlaywrightCrawlingContext,
    _handlerContext: HandlerContext,
): Promise<ScrapedItem[]> {
    const { page, request, log } = context;

    // G-COST-02: Block heavy resources (Excluding image for high-res screenshots)
    await blockResources(page, ['media', 'font', 'stylesheet'], ['image']);

    log.info(`[Google Maps] Extracting data from: ${request.url}`);

    // G-BOT-02: Randomized delay to mimic human behavior
    await page.waitForTimeout(Math.floor(Math.random() * 3000) + 2000);

    // Handle EU Consent Wall or Unusual Traffic
    try {
        const consentSelectors = [
            'button:has-text("Accept all")',
            'button:has-text("Reject all")',
            'button:has-text("I agree")',
            'button:has-text("Tout accepter")', // French
            'button:has-text("Accetto")'         // Italian
        ];
        
        const consentButton = page.locator(consentSelectors.join(', ')).first();
        if (await consentButton.isVisible({ timeout: 5000 })) {
            log.info(`[Google Maps] Consent screen detected, clicking`, { url: request.url });
            await consentButton.click();
            await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
        }
    } catch (e) {
        // Ignore timeout if consent screen isn't there
    }

    // Wait for the main place pane to load
    // h1.DUwDvf is the standard for the side pane, but let's be more flexible
    try {
        await page.waitForSelector('h1', { timeout: 15000 });
    } catch (e) {
        log.warning(`[Google Maps] Main title (h1) did not load within timeout.`, { url: request.url });
    }

    // Extract revenue indicators
    const links: string[] = [];
    const ctas: string[] = [];
    const conversionMarkers: string[] = [];

    // Extract Title for context
    let title = '';
    try {
        const titleLocator = page.locator('h1').first();
        title = await titleLocator.innerText();
        if (title) conversionMarkers.push(`Title: ${title.trim()}`);
    } catch (e) { /* ignore */ }

    // 1. Business Category
    try {
        // Look for buttons that look like categories (often near the rating)
        const categoryBtn = page.locator('button[jsaction*="category"], .fontBodyMedium[jsaction*="category"]').first();
        if (await categoryBtn.isVisible()) {
            const categoryText = await categoryBtn.innerText();
            if (categoryText) conversionMarkers.push(`Category: ${categoryText.trim()}`);
        }
    } catch (e) { /* ignore */ }

    // 2. Website Link
    try {
        const websiteLocator = page.locator('a[aria-label^="Website:" i], a[data-item-id="authority"], a[jsaction*="website"]');
        const extractedHrefs = await websiteLocator.evaluateAll(elements =>
            elements.map(el => el.getAttribute('href')).filter((href): href is string => href !== null)
        );
        for (const href of extractedHrefs) {
        const hrefs = await websiteLocator.evaluateAll(els =>
            els.map(el => (el as HTMLAnchorElement).href).filter(href => !!href)
        );
        for (const href of hrefs) {
            if (href && !links.includes(href)) links.push(href);
        }
    } catch (e) { /* ignore */ }

    // 3. Phone Number
    try {
        const phoneLocator = page.locator('button[aria-label^="Phone:" i], button[data-tooltip*="phone" i], button[data-item-id^="phone" i]');
        const extractedPhones = await phoneLocator.evaluateAll(elements =>
            elements.map(el => el.getAttribute('aria-label') || (el as HTMLElement).innerText).filter((text): text is string => text !== null)
        );
        for (let phoneText of extractedPhones) {
            if (phoneText) {
                phoneText = phoneText.replace(/Phone:|/gi, '').trim();
                if (phoneText && !conversionMarkers.some(m => m.includes(phoneText))) {
                    conversionMarkers.push(`Phone: ${phoneText}`);
                }
        const phoneTexts = await phoneLocator.evaluateAll(els =>
            els.map(el => el.getAttribute('aria-label') || (el as HTMLElement).innerText).filter(text => !!text)
        );
        for (let phoneText of phoneTexts) {
            phoneText = phoneText.replace(/Phone:|/gi, '').trim();
            if (phoneText && !conversionMarkers.some(m => m.includes(phoneText))) {
                conversionMarkers.push(`Phone: ${phoneText}`);
            }
        }
    } catch (e) { /* ignore */ }

    // 3.1 Business Address (Phase 2 Enrichment)
    try {
        const addressLocator = page.locator('button[aria-label^="Address:" i], [data-item-id="address"]').first();
        if (await addressLocator.isVisible()) {
            let addressText = await addressLocator.getAttribute('aria-label') || await addressLocator.innerText();
            addressText = addressText.replace(/Address:|/gi, '').trim();
            if (addressText) conversionMarkers.push(`Address: ${addressText}`);
        }
    } catch (e) { /* ignore */ }

    // 3.2 Photo Presence (Phase 2 Enrichment)
    try {
        const photosLocator = page.locator('button[aria-label*="photo" i], img[src*="ggpht"]').first();
        if (await photosLocator.count() > 0) {
            conversionMarkers.push('Signal: Has Photos');
        }
    } catch (e) { /* ignore */ }

    // 4. Rating and Reviews Count (Retention Indicators)
    try {
        const ratingLocator = page.locator('span.ceNzKf, span.MW4etd').first();
        if (await ratingLocator.isVisible()) {
            const ratingText = await ratingLocator.getAttribute('aria-label') || await ratingLocator.innerText();
            if (ratingText) {
                const ratingValue = ratingText.replace(/stars| /gi, '').trim();
                conversionMarkers.push(`Rating: ${ratingValue}`);
            }
        }
        
        const reviewsLocator = page.locator('span.UY7F9, button[jsaction*="reviews"]').first();
        if (await reviewsLocator.isVisible()) {
            const reviewsText = await reviewsLocator.innerText();
            if (reviewsText) {
                const reviewsValue = reviewsText.replace(/[()]/g, '').trim();
                conversionMarkers.push(`Reviews: ${reviewsValue}`);
            }
        }
    } catch (e) { /* ignore */ }

    // 5. Booking/Order CTAs
    const possibleCtas = ['Book', 'Order', 'Reserve', 'Tickets', 'Menu', 'Appointments', 'Reservations'];
    for (const cta of possibleCtas) {
        try {
            const btn = page.locator(`button[aria-label*="${cta}" i], a[aria-label*="${cta}" i], button:has-text("${cta}"), a:has-text("${cta}")`).first();
            if (await btn.isVisible()) {
                ctas.push(cta);
            }
        } catch (e) { /* ignore */ }
    }

    // Extract profile HTML snapshot (prioritize the main info pane)
    let profileHtml = '';
    try {
        const mainPane = page.locator('div[role="main"][aria-label]');
        if (await mainPane.count() > 0) {
            profileHtml = await mainPane.first().innerHTML();
        } else {
            // Fallback to the scrollable container
            const fallBackPane = page.locator('div.m6QErb.DByne').first();
            if (await fallBackPane.isVisible()) {
                profileHtml = await fallBackPane.innerHTML();
            } else {
                profileHtml = await page.innerHTML('body');
            }
        }
    } catch (e) {
        log.warning(`[Google Maps] Failed to extract profile HTML fallback`, { url: request.url });
    }

    // Ensure the output platform label matches what was requested
    // so that the enricher maps it to the correct DB columns.
    const outputPlatform = request.userData?.platform === 'google_business_profile'
        ? 'google_business_profile'
        : 'google_maps';

    const scrapedItem: ScrapedItem = {
        platform: outputPlatform,
        url: request.url,
        crawlerUsed: 'playwright',
        scrapedAt: new Date().toISOString(),
        data: {
            revenueIndicators: {
                ctas,
                links,
                conversionMarkers,
            },
            profileHtml: profileHtml,
            screenshotUrl: '',
        },
        errors: []
    };

    if (links.length === 0 && ctas.length === 0 && conversionMarkers.length === 0) {
        log.warning(`[Google Maps] Extracted zero revenue indicators. Check selectors for layout shifts.`, { url: request.url });
        await reportIssue({
            platform: 'google_maps',
            url: request.url,
            severity: 'WARNING',
            message: 'Extracted zero revenue indicators. Potential selector shift or empty profile.',
        });
    }

    return [scrapedItem];
}

/**
 * Validate that the extracted Google Maps data contains expected keys.
 * @param data The data object to validate.
 * @returns True if valid.
 */
export function validate(data: Record<string, unknown>): boolean {
    const payload = data as any;
    if (!payload || typeof payload !== 'object') return false;
    if (!payload.revenueIndicators || !Array.isArray(payload.revenueIndicators.links)) return false;
    if (typeof payload.profileHtml !== 'string') return false;
    if (typeof payload.screenshotUrl !== 'string') return false;
    return true;
}

/**
 * Detect if the response indicates a Google Maps block.
 * @param responseBody The response body text.
 * @returns True if a block is detected.
 */
export function detectBlock(responseBody: string): boolean {
    const lowerBody = responseBody.toLowerCase();
    const isCaptcha = lowerBody.includes('unusual traffic') || 
                      lowerBody.includes('captcha') || 
                      lowerBody.includes('our systems have detected');
    
    // consent.google.com is usually bypassed by Playwright if we wait for it, 
    // but if we are hard redirected here and fail to bypass, it's a block.
    const isConsentBlock = lowerBody.includes('before you continue to google') || 
                           lowerBody.includes('consent.google.com');

    return isCaptcha || isConsentBlock;
}

/** Assembled handler export satisfying the PlaywrightHandler interface. */
const googleMapsHandler: PlaywrightHandler = {
    crawlerType: 'playwright',
    handle,
    validate,
    detectBlock,
};
export default googleMapsHandler;
