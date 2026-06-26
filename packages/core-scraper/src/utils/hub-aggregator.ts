/**
 * @module utils/hub-aggregator
 * @description Helper to merge multiple scraped pages from the same general hub into a single unified profile.
 */

export function aggregateHubItem(hubForensics: any, item: any, businessUrl?: string): any {
    const fd = item.data;
    const url = item.url;

    // Check if this item is the primary homepage
    const isHomepage = !hubForensics || url === businessUrl || url === `${businessUrl}/`;

    if (isHomepage) {
        // Initialize/overwrite using homepage as the base to preserve main branding, title, description
        const previous = hubForensics ? JSON.parse(JSON.stringify(hubForensics)) : null;
        hubForensics = JSON.parse(JSON.stringify(fd));
        if (previous) {
            mergeSignals(hubForensics, previous);
        }
    } else {
        // Merge subpage signals into the existing hub forensics
        mergeSignals(hubForensics, fd);
    }

    return hubForensics;
}

function mergeSignals(base: any, incoming: any): void {
    if (!base || !incoming) return;

    // SSL
    if (incoming.ssl?.present) {
        base.ssl = { present: true };
    }

    // Analytics (incl. marketing/intent pixels)
    if (base.analytics && incoming.analytics) {
        base.analytics.google_analytics = base.analytics.google_analytics || incoming.analytics.google_analytics;
        base.analytics.tag_manager = base.analytics.tag_manager || incoming.analytics.tag_manager;
        base.analytics.facebook_pixel = base.analytics.facebook_pixel || incoming.analytics.facebook_pixel;
        base.analytics.hubspot = base.analytics.hubspot || incoming.analytics.hubspot;
        base.analytics.intent_pixels = Array.from(new Set([...(base.analytics.intent_pixels || []), ...(incoming.analytics.intent_pixels || [])]));
    }

    // Blog
    if (base.blog && incoming.blog) {
        base.blog.detected = base.blog.detected || incoming.blog.detected;
        base.blog.post_count = Math.max(base.blog.post_count || 0, incoming.blog.post_count || 0);
    }

    // Pricing
    if (base.pricing && incoming.pricing) {
        base.pricing.detected = base.pricing.detected || incoming.pricing.detected;
        base.pricing.has_tiers = base.pricing.has_tiers || incoming.pricing.has_tiers;
    }

    // Case Studies
    if (base.case_studies && incoming.case_studies) {
        base.case_studies.detected = base.case_studies.detected || incoming.case_studies.detected;
        base.case_studies.count = Math.max(base.case_studies.count || 0, incoming.case_studies.count || 0);
    }

    // Forms
    if (base.forms && incoming.forms) {
        base.forms.count = (base.forms.count || 0) + (incoming.forms.count || 0);
        const uniqueTypes = new Set([...(base.forms.types || []), ...(incoming.forms.types || [])]);
        base.forms.types = Array.from(uniqueTypes);
    }

    // Chat
    if (base.chat && incoming.chat) {
        base.chat.detected = base.chat.detected || incoming.chat.detected;
        base.chat.provider = base.chat.provider || incoming.chat.provider;
    }

    // E-commerce (OR-merge signals; a product/cart page may surface what the homepage hid)
    if (incoming.ecommerce) {
        base.ecommerce = base.ecommerce || { detected: false, platform: null, has_cart: false, has_checkout: false };
        base.ecommerce.detected = base.ecommerce.detected || incoming.ecommerce.detected;
        base.ecommerce.platform = base.ecommerce.platform || incoming.ecommerce.platform;
        base.ecommerce.has_cart = base.ecommerce.has_cart || incoming.ecommerce.has_cart;
        base.ecommerce.has_checkout = base.ecommerce.has_checkout || incoming.ecommerce.has_checkout;
    }

    // Compliance / contact / booking / testimonials (OR-merge; sub-pages — /contact,
    // /privacy, /terms — typically carry these even when the homepage does not).
    for (const key of ['privacy', 'cookie_consent', 'terms', 'testimonials'] as const) {
        if (incoming[key]?.detected && base[key]) base[key].detected = true;
    }
    if (incoming.booking?.detected && base.booking) {
        base.booking.detected = true;
        base.booking.provider = base.booking.provider || incoming.booking.provider;
    }
    if (incoming.contact_info && base.contact_info) {
        base.contact_info.phone = base.contact_info.phone || incoming.contact_info.phone;
        base.contact_info.email = base.contact_info.email || incoming.contact_info.email;
        base.contact_info.has_address = base.contact_info.has_address || incoming.contact_info.has_address;
    }

    // Any successfully crawled page marks the hub as scraped.
    if (incoming.scrapeSuccess) base.scrapeSuccess = true;

    // Performance (Keep the best TTFB)
    if (base.performance && incoming.performance?.ttfb_ms) {
        base.performance.ttfb_ms = base.performance.ttfb_ms 
            ? Math.min(base.performance.ttfb_ms, incoming.performance.ttfb_ms)
            : incoming.performance.ttfb_ms;
    }

    // Social Links
    if (incoming.social_links) {
        base.social_links = {
            ...base.social_links,
            ...incoming.social_links
        };
    }

    // Meta / Count
    base.pages_crawled = Math.max(base.pages_crawled || 0, incoming.pages_crawled || 0);
}
