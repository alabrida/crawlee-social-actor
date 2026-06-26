/**
 * @module handlers/general-forensics
 * @description Pure forensic-derivation helpers for the general (website hub) handler.
 * Extracted so they can be unit-tested directly — these are the signals that previously
 * fabricated values (hardcoded post counts / chat provider / over-broad platform match).
 */

/** Identify the live-chat provider from page markup, or null. Matches vendor domains/scripts. */
export function detectChatProvider(content: string): string | null {
    const lc = content.toLowerCase();
    if (lc.includes('intercom')) return 'Intercom';
    if (lc.includes('hubspot')) return 'HubSpot';
    if (lc.includes('zendesk')) return 'Zendesk';
    if (lc.includes('drift.com') || lc.includes('js.driftt.com')) return 'Drift';
    if (lc.includes('tidio')) return 'Tidio';
    if (lc.includes('liveperson')) return 'LivePerson';
    if (lc.includes('livechatinc') || lc.includes('livechat.com')) return 'LiveChat';
    return null;
}

/**
 * Identify the e-commerce platform, scoped to URL/meta contexts (script/link src,
 * generator meta) so a stray word in page copy can't mis-ID it (the "Best Buy = Magento"
 * false-positive). Returns null when no platform is corroborated — detection of cart/products
 * can still be true with an unproven platform.
 */
export function detectEcommercePlatform(content: string): string | null {
    if (/(?:src|href)=["'][^"']*(?:cdn\.shopify\.com|\.myshopify\.com)/i.test(content)) return 'Shopify';
    if (/wp-content\/plugins\/woocommerce/i.test(content)) return 'WooCommerce';
    if (/<meta[^>]+name=["']generator["'][^>]+magento/i.test(content) || /(?:src|href)=["'][^"']*\/(?:static\/version\d|js\/mage)/i.test(content)) return 'Magento';
    if (/(?:src|href)=["'][^"']*\.bigcommerce\.com/i.test(content)) return 'BigCommerce';
    return null;
}

export const BLOG_LINK_RE = /\/(blog|news|articles?|posts?)\/[a-z0-9][a-z0-9-]+/i;
export const CASE_STUDY_LINK_RE = /\/(case-stud|success-stor|portfolio|customer-stor)[a-z-]*\/[a-z0-9-]+/i;

/** Count unique on-page links (ignoring fragments) matching a section pattern. */
export function countContentLinks(anchors: string[], re: RegExp): number {
    const set = new Set<string>();
    for (const href of anchors) {
        if (typeof href === 'string' && re.test(href)) set.add(href.split('#')[0]);
    }
    return set.size;
}

/**
 * Real entry count for a detected section, or null when present-but-uncountable.
 * Never fabricates a fixed number.
 */
export function sectionCount(detected: boolean, anchors: string[], re: RegExp): number | null {
    if (!detected) return 0;
    const n = countContentLinks(anchors, re);
    return n > 0 ? n : null;
}

const anchorHas = (anchors: string[], re: RegExp): boolean => anchors.some(h => typeof h === 'string' && re.test(h));

/** Privacy policy / cookie-consent / terms-of-service presence (booleans). */
export function detectComplianceSignals(content: string, anchors: string[]): {
    privacy: { detected: boolean };
    cookie_consent: { detected: boolean };
    terms: { detected: boolean };
} {
    const lc = content.toLowerCase();
    const privacy = anchorHas(anchors, /\/privacy/i) || lc.includes('privacy policy');
    const terms = anchorHas(anchors, /\/terms|\/tos(\b|\/)/i) || lc.includes('terms of service') || lc.includes('terms of use') || lc.includes('terms & conditions') || lc.includes('terms and conditions');
    const cookie = lc.includes('cookiebot') || lc.includes('onetrust') || lc.includes('osano') || lc.includes('cookieconsent')
        || lc.includes('we use cookies') || lc.includes('accept all cookies') || lc.includes('accept cookies') || lc.includes('cookie preferences');
    return { privacy: { detected: privacy }, cookie_consent: { detected: cookie }, terms: { detected: terms } };
}

/** Contact channels: phone (tel: link or phone pattern), email (mailto: or address). */
export function detectContactInfo(content: string, anchors: string[]): { phone: boolean; email: boolean } {
    const phone = anchorHas(anchors, /^tel:/i) || /\(?\d{3}\)?[\s.\-]\d{3}[\s.\-]\d{4}/.test(content);
    const email = anchorHas(anchors, /^mailto:/i) || /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(content);
    return { phone, email };
}

/** Booking/scheduling widget + provider (Calendly, Acuity, Cal.com, etc.). */
export function detectBooking(content: string): { detected: boolean; provider: string | null } {
    const lc = content.toLowerCase();
    const provider = lc.includes('calendly.com') ? 'Calendly'
        : lc.includes('acuityscheduling') ? 'Acuity'
        : lc.includes('cal.com') ? 'Cal.com'
        : lc.includes('savvycal') ? 'SavvyCal'
        : lc.includes('youcanbook.me') ? 'YouCanBook.me'
        : (lc.includes('meetings.hubspot') ? 'HubSpot Meetings' : null);
    const detected = provider !== null || lc.includes('book a call') || lc.includes('book a demo')
        || lc.includes('schedule a call') || lc.includes('schedule a demo') || lc.includes('book an appointment');
    return { detected, provider };
}

/** Marketing/intent pixels beyond GA/GTM (Meta, HubSpot, LinkedIn, X, TikTok). */
export function detectAnalyticsPixels(content: string): { facebook_pixel: boolean; hubspot: boolean; intent_pixels: string[] } {
    const lc = content.toLowerCase();
    const facebook_pixel = lc.includes('connect.facebook.net') || lc.includes('fbevents.js') || /\bfbq\s*\(/.test(content);
    const hubspot = lc.includes('hs-scripts.com') || lc.includes('js.hs-analytics') || lc.includes('js.hsforms');
    const intent_pixels: string[] = [];
    if (facebook_pixel) intent_pixels.push('meta');
    if (lc.includes('snap.licdn.com') || lc.includes('linkedin insight')) intent_pixels.push('linkedin');
    if (lc.includes('static.ads-twitter.com') || /\btwq\s*\(/.test(content)) intent_pixels.push('x');
    if (lc.includes('analytics.tiktok.com') || /\bttq\./.test(content)) intent_pixels.push('tiktok');
    return { facebook_pixel, hubspot, intent_pixels };
}

/**
 * Testimonials presence. Conservative: detects the section, but does not fabricate
 * attribution or counts (left false/null) so the rubric scores it honestly (present = 1).
 */
export function detectTestimonials(content: string): { detected: boolean; has_named_source: boolean; count: number | null } {
    const lc = content.toLowerCase();
    const detected = lc.includes('testimonial') || lc.includes('what our clients') || lc.includes('what our customers')
        || lc.includes('client reviews') || lc.includes('hear from our') || lc.includes('what people say');
    return { detected, has_named_source: false, count: null };
}
