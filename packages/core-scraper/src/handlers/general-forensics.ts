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
