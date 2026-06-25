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

    // Analytics
    if (base.analytics && incoming.analytics) {
        base.analytics.google_analytics = base.analytics.google_analytics || incoming.analytics.google_analytics;
        base.analytics.tag_manager = base.analytics.tag_manager || incoming.analytics.tag_manager;
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
