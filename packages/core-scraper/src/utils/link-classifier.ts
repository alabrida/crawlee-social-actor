/**
 * @module utils/link-classifier
 * @description Classifies profile/bio links into standard categories (aggregator, booking, direct website, social cross-link).
 */

export type LinkType =
    | 'link_aggregator'
    | 'booking'
    | 'direct_website'
    | 'social_cross_link'
    | 'unknown';

export interface ClassifiedLink {
    url: string;
    type: LinkType;
    provider: string | null;
}

const AGGREGATOR_PATTERNS = [
    { name: 'linktree', pattern: /linktr\.ee|linktree/i },
    { name: 'stan_store', pattern: /stan\.store/i },
    { name: 'beacons', pattern: /beacons\.(ai|page)/i },
    { name: 'lnk_bio', pattern: /lnk\.bio/i },
    { name: 'campsite', pattern: /campsite\.bio/i },
    { name: 'bio_fm', pattern: /bio\.fm/i },
    { name: 'tap_bio', pattern: /tap\.bio/i },
    { name: 'solo_to', pattern: /solo\.to/i },
    { name: 'shor_by', pattern: /shor\.by/i },
    { name: 'linkpop', pattern: /linkpop\.com/i },
    { name: 'feedlink', pattern: /feedlink\.io/i },
    { name: 'milkshake', pattern: /msha\.ke/i },
];

const BOOKING_PATTERNS = [
    { name: 'calendly', pattern: /calendly\.com/i },
    { name: 'acuity', pattern: /acuityscheduling\.com/i },
    { name: 'oncehub', pattern: /oncehub\.com|meetme\.so/i },
    { name: 'tidycal', pattern: /tidycal\.com/i },
    { name: 'bookafy', pattern: /bookafy\.com/i },
    { name: 'simplybook', pattern: /simplybook\.me/i },
    { name: 'squarespace_scheduling', pattern: /squarespace.*scheduling/i },
];

const SOCIAL_PATTERNS = [
    { name: 'facebook', pattern: /facebook\.com|fb\.com/i },
    { name: 'instagram', pattern: /instagram\.com|instagr\.am/i },
    { name: 'twitter', pattern: /twitter\.com|x\.com/i },
    { name: 'linkedin', pattern: /linkedin\.com/i },
    { name: 'youtube', pattern: /youtube\.com|youtu\.be/i },
    { name: 'tiktok', pattern: /tiktok\.com/i },
    { name: 'pinterest', pattern: /pinterest\.com|pin\.it/i },
    { name: 'reddit', pattern: /reddit\.com/i },
    { name: 'threads', pattern: /threads\.net/i },
];

/**
 * Classifies a URL link to identify its type and provider.
 * @param url - The URL to classify.
 */
export function classifyLink(url: string | undefined | null): ClassifiedLink {
    if (!url) {
        return { url: '', type: 'unknown', provider: null };
    }

    const trimmedUrl = url.trim();

    // 1. Check for Social Network Cross-links
    for (const item of SOCIAL_PATTERNS) {
        if (item.pattern.test(trimmedUrl)) {
            return { url: trimmedUrl, type: 'social_cross_link', provider: item.name };
        }
    }

    // 2. Check for Link Aggregators
    for (const item of AGGREGATOR_PATTERNS) {
        if (item.pattern.test(trimmedUrl)) {
            return { url: trimmedUrl, type: 'link_aggregator', provider: item.name };
        }
    }

    // 3. Check for Booking Links
    for (const item of BOOKING_PATTERNS) {
        if (item.pattern.test(trimmedUrl)) {
            return { url: trimmedUrl, type: 'booking', provider: item.name };
        }
    }

    // 4. Fallback to direct website if it looks like a HTTP/HTTPS URL
    if (/^https?:\/\//i.test(trimmedUrl)) {
        return { url: trimmedUrl, type: 'direct_website', provider: null };
    }

    return { url: trimmedUrl, type: 'unknown', provider: null };
}
