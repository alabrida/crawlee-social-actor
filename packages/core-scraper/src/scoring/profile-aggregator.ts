/**
 * @module scoring/profile-aggregator
 * @description Aggregates multiple scraped profiles of the same platform type into a single virtual profile for rubric/classifier evaluation.
 */

function pick(p: any, ...names: string[]): any {
    for (const nm of names) if (p[nm] !== undefined && p[nm] !== null) return p[nm];
    return undefined;
}

const LINK_AGGREGATOR_HOSTS = ['linktr.ee', 'beacons.ai', 'lnk.bio', 'linkin.bio', 'bio.link', 'linktree', 'milkshake', 'tap.bio', 'komi.io', 'snipfeed', 'flowpage', 'liinks.co', 'solo.to', 'carrd.co', 'shorby', 'campsite.bio'];
const BOOKING_HOSTS = ['calendly.com', 'cal.com', 'acuityscheduling', 'squareup.com/appointments', 'setmore', 'calendar.app.goo', 'youcanbook', 'simplybook'];

/**
 * Classify a raw bio/external URL into the {type,url} shape the rubric reads
 * (external_link_quality, booking-decision, retention). Handlers emit a raw externalUrl
 * string; without this the link-in-bio mechanisms always scored 0.
 */
export function classifyLinkInBio(url: any): { type: string; url: string } | null {
    if (!url || typeof url !== 'string') return null;
    let host = '';
    try { host = new URL(url).hostname.replace(/^www\./, '').toLowerCase(); } catch { return null; }
    if (LINK_AGGREGATOR_HOSTS.some(h => host.includes(h))) return { type: 'link_aggregator', url };
    if (BOOKING_HOSTS.some(h => host.includes(h))) return { type: 'booking', url };
    return { type: 'direct_website', url };
}

/**
 * Map handler-specific field names onto the canonical names the rubric/classifier read.
 * Handlers emit a mix of prefixed (gbp_reviews_count), camelCase (reviewsCount, playlistCount,
 * hasShop) and raw date strings (latestPostDate), but the rubric reads snake_case canonical
 * fields (reviews_count, playlist_count, has_shop, days_since_post). The single-profile collapse
 * path passed profiles through verbatim, so these never matched and the mechanisms silently
 * scored 0 (reviews, content_recency, posting_frequency, etc.). Applied to EVERY profile before
 * collapse so both the single-profile and merge paths see canonical names.
 *
 * NOTE: the mechanism unit-test fixtures use canonical names, which is exactly why this class of
 * bug went undetected — production handler output and the fixtures disagreed.
 */
function normalizeProfileFields(p: any): any {
    if (!p || typeof p !== 'object') return p;
    const n = { ...p };

    // Reviews + rating (GBP prefix / FB camelCase -> canonical).
    const rc = pick(p, 'reviews_count', 'reviewsCount', 'gbp_reviews_count');
    if (typeof rc === 'number') { n.reviews_count = rc; n.reviewsCount = rc; }
    const rt = pick(p, 'rating', 'gbp_rating');
    if (typeof rt === 'number') n.rating = rt;

    // camelCase -> snake_case the rubric reads.
    const aliasNum = (canon: string, ...c: string[]) => { const v = pick(p, ...c); if (typeof v === 'number') n[canon] = v; };
    const aliasBool = (canon: string, ...c: string[]) => { const v = pick(p, ...c); if (typeof v === 'boolean') n[canon] = v; };
    aliasNum('playlist_count', 'playlist_count', 'playlistCount');
    aliasBool('has_membership', 'has_membership', 'hasMembership');
    aliasBool('has_shop', 'has_shop', 'hasShop');
    const tabs = pick(p, 'content_tabs', 'contentTabs'); if (Array.isArray(tabs)) n.content_tabs = tabs;
    const cta = pick(p, 'cta_button_type', 'ctaButtonType'); if (cta) n.cta_button_type = cta;

    // link-in-bio: structure the raw external URL into {type,url} the rubric reads.
    if (!n.link_in_bio) {
        const lib = classifyLinkInBio(pick(p, 'link_in_bio_url', 'externalUrl', 'external_url', 'website', 'websiteUrl'));
        if (lib) n.link_in_bio = lib;
    }

    // Recency: the rubric reads days_since_post, but most handlers emit a latest-activity date.
    // Compute it here so content_recency / posting_frequency see recency for single profiles too.
    if (typeof n.days_since_post !== 'number') {
        const ds = pick(p, 'latestPostDate', 'latestVideoDate', 'latestTweetDate', 'latest_post_date');
        if (ds) {
            const t = new Date(ds).getTime();
            if (!isNaN(t)) {
                const days = Math.floor((Date.now() - t) / 86400000);
                if (days >= 0) { n.days_since_post = days; n.daysSincePost = days; }
            }
        }
    } else {
        n.daysSincePost = n.days_since_post;
    }

    return n;
}

export function collapsePlatforms(platforms: Record<string, any[]>): Record<string, any> {
    const collapsed: Record<string, any> = {};

    for (const [platform, rawProfiles] of Object.entries(platforms)) {
        if (!rawProfiles || !Array.isArray(rawProfiles) || rawProfiles.length === 0) {
            continue;
        }

        const profiles = rawProfiles.map(normalizeProfileFields);

        if (profiles.length === 1) {
            collapsed[platform] = profiles[0];
            continue;
        }

        // Merge/aggregate multiple profiles of the same platform type
        const merged: any = {
            url: profiles[0].url || '',
            platform: platform,
            scrapedAt: profiles[0].scrapedAt,
            crawlerUsed: profiles[0].crawlerUsed,
        };

        // 1. Follower/Subscriber reach - SUM
        let followers = 0;
        let subscribers = 0;
        let likes = 0;
        let hasReach = false;

        profiles.forEach(p => {
            if (p) {
                if (typeof p.followers === 'number') {
                    followers += p.followers;
                    hasReach = true;
                }
                if (typeof p.subscribers === 'number') {
                    subscribers += p.subscribers;
                    hasReach = true;
                }
                if (typeof p.likes === 'number') {
                    likes += p.likes;
                    hasReach = true;
                }
            }
        });

        if (hasReach) {
            if (followers > 0) merged.followers = followers;
            if (subscribers > 0) merged.subscribers = subscribers;
            if (likes > 0) merged.likes = likes;
        }

        // 2. Reviews and rating - SUM reviews, weighted AVG rating
        let totalReviews = 0;
        let ratingSum = 0;
        let hasReviews = false;

        profiles.forEach(p => {
            if (p) {
                const rev = p.reviews_count || p.reviewsCount || 0;
                if (typeof rev === 'number' && rev > 0) {
                    totalReviews += rev;
                    ratingSum += (p.rating || 0) * rev;
                    hasReviews = true;
                }
            }
        });

        if (hasReviews && totalReviews > 0) {
            merged.reviews_count = totalReviews;
            merged.reviewsCount = totalReviews;
            merged.rating = ratingSum / totalReviews;
        } else {
            // Fallback to average rating if there are ratings but no reviews_count
            const ratings = profiles.map(p => p?.rating).filter(r => typeof r === 'number');
            if (ratings.length > 0) {
                merged.rating = ratings.reduce((a, b) => a + b, 0) / ratings.length;
            }
        }

        // 3. Boolean flags - OR (if any profile is true, the aggregate is true)
        const orFlags = [
            'has_shop', 'hasShop', 'has_membership', 'has_merch', 'claimed_status', 'claimedStatus',
            'verified', 'has_phone', 'has_email', 'has_address'
        ];
        orFlags.forEach(flag => {
            if (profiles.some(p => p && p[flag] === true)) {
                merged[flag] = true;
            }
        });

        // 4. Content recency - MIN days_since_post (most recent post)
        let minDays: number | null = null;
        profiles.forEach(p => {
            if (p) {
                const val = p.days_since_post || p.daysSincePost;
                if (typeof val === 'number') {
                    if (minDays === null || val < minDays) {
                        minDays = val;
                    }
                }
            }
        });
        if (minDays !== null) {
            merged.days_since_post = minDays;
            merged.daysSincePost = minDays;
        }

        // 5. Bio and link in bio - union/coalesce
        const bios = profiles.map(p => p?.bio_analysis?.bioText || p?.bio || '').filter(Boolean);
        if (bios.length > 0) {
            merged.bio_analysis = {
                bioText: bios.join(' | '),
                hasConversionCta: profiles.some(p => p?.bio_analysis?.hasConversionCta),
                hasAuthorityProof: profiles.some(p => p?.bio_analysis?.hasAuthorityProof),
                hasClearRevenueModel: profiles.some(p => p?.bio_analysis?.hasClearRevenueModel),
            };
        }

        const linkInBio = profiles.find(p => p?.link_in_bio?.type === 'link_aggregator' || p?.link_in_bio?.type === 'booking')
            || profiles.find(p => p?.link_in_bio);
        if (linkInBio) {
            merged.link_in_bio = linkInBio.link_in_bio;
        }

        // 6. Screenshot - keep first valid screenshot
        const screenshot = profiles.find(p => p?.screenshotUrl)?.screenshotUrl;
        if (screenshot) {
            merged.screenshotUrl = screenshot;
        }

        // 7. Platform specific properties
        // YouTube tabs: union
        const contentTabs = new Set<string>();
        profiles.forEach(p => {
            if (p && Array.isArray(p.content_tabs)) {
                p.content_tabs.forEach((t: string) => contentTabs.add(t));
            }
        });
        if (contentTabs.size > 0) {
            merged.content_tabs = Array.from(contentTabs);
        }

        // Facebook CTA type
        const ctaButton = profiles.map(p => p?.cta_button_type).filter(Boolean)[0];
        if (ctaButton) {
            merged.cta_button_type = ctaButton;
        }

        // LinkedIn-specific logic:
        if (platform === 'linkedin') {
            if (profiles.some(p => p && p.isPersonalProfile === false)) {
                merged.isPersonalProfile = false;
                const companyProf = profiles.find(p => p && p.isPersonalProfile === false);
                merged.followerCount = companyProf?.followerCount || merged.followers || 0;
                merged.websiteUrl = companyProf?.websiteUrl;
                merged.about_length = companyProf?.about_length;
            } else {
                merged.isPersonalProfile = true;
                const personalProf = profiles.find(p => p && p.isPersonalProfile === true);
                merged.about_length = personalProf?.about_length;
                merged.connectionsCount = personalProf?.connectionsCount || personalProf?.connections;
                merged.connections = personalProf?.connectionsCount || personalProf?.connections;
                merged.featured_section = personalProf?.featured_section;
            }
        }

        // Google Business Profile photo count
        let maxPhotos = 0;
        profiles.forEach(p => {
            if (p && typeof p.photo_count === 'number' && p.photo_count > maxPhotos) {
                maxPhotos = p.photo_count;
            }
        });
        if (maxPhotos > 0) {
            merged.photo_count = maxPhotos;
        }

        // Google Business Profile fields
        if (platform === 'google_business_profile' || platform === 'google_maps') {
            const withCat = profiles.find(p => p && p.gbp_category);
            if (withCat) merged.gbp_category = withCat.gbp_category;
            const withName = profiles.find(p => p && p.gbp_business_name);
            if (withName) merged.gbp_business_name = withName.gbp_business_name;
            const withAddr = profiles.find(p => p && p.gbp_address);
            if (withAddr) merged.gbp_address = withAddr.gbp_address;
            const withPhone = profiles.find(p => p && p.gbp_phone);
            if (withPhone) merged.gbp_phone = withPhone.gbp_phone;
            const withWeb = profiles.find(p => p && p.gbp_website);
            if (withWeb) merged.gbp_website = withWeb.gbp_website;
        }

        collapsed[platform] = merged;
    }

    return collapsed;
}
