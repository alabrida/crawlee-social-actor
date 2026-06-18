/**
 * @module scoring/profile-aggregator
 * @description Aggregates multiple scraped profiles of the same platform type into a single virtual profile for rubric/classifier evaluation.
 */

export function collapsePlatforms(platforms: Record<string, any[]>): Record<string, any> {
    const collapsed: Record<string, any> = {};

    for (const [platform, profiles] of Object.entries(platforms)) {
        if (!profiles || !Array.isArray(profiles) || profiles.length === 0) {
            continue;
        }

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

        collapsed[platform] = merged;
    }

    return collapsed;
}
