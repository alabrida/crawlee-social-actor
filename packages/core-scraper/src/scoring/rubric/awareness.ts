import { MechanismConfig } from '../types.js';

export const AWARENESS_MECHANISMS: MechanismConfig[] = [
    {
        name: 'website_ssl',
        label: 'Website exists & SSL',
        stage: 'awareness',
        weights: { local: 3, professional_services: 3, ecommerce: 3, saas: 3, content_creator: 2, influencer: 1 },
        lowScoreInsight: 'You have no home base on the web or it lacks encryption. Every other platform you are on links to nowhere or warns visitors about security risks.',
        evaluate(platforms, hub) {
            if (!hub || hub.scrapeSuccess === false) {
                return { score: 0, evidence: 'No website found or hub returned error' };
            }
            const isHttps = hub.ssl?.present || (hub.loadedUrl && hub.loadedUrl.startsWith('https:'));
            const ttfb = hub.performance?.ttfb_ms;
            if (!isHttps) {
                return { score: 1, evidence: 'Website exists but HTTP only (no SSL)' };
            }
            if (ttfb && ttfb > 3000) {
                return { score: 2, evidence: 'HTTPS active but load time is slow (> 3s)' };
            }
            return { score: 3, evidence: `HTTPS active, loaded successfully (TTFB: ${ttfb || 'unknown'}ms)` };
        }
    },
    {
        name: 'seo_foundations',
        label: 'SEO Foundations',
        stage: 'awareness',
        weights: { local: 3, professional_services: 3, ecommerce: 3, saas: 3, content_creator: 1, influencer: 1 },
        lowScoreInsight: 'Search engines cannot understand what your business does. You are invisible to intent-based search.',
        evaluate(platforms, hub) {
            if (!hub || hub.scrapeSuccess === false) return { score: 0, evidence: 'No hub forensics available' };
            const desc = hub.seo?.meta_description;
            const canonical = hub.seo?.canonical;
            const jsonLd = hub.seo?.json_ld?.present;

            if (!desc && !canonical && !jsonLd) {
                return { score: 0, evidence: 'No meta description, canonical, or JSON-LD' };
            }
            if (desc && !canonical && !jsonLd) {
                return { score: 1, evidence: 'Meta description present but lacks canonical and structured data' };
            }
            if (desc && canonical && !jsonLd) {
                return { score: 2, evidence: 'Meta description and canonical URL present' };
            }
            return { score: 3, evidence: `SEO optimized: Meta description, canonical, and JSON-LD present (${hub.seo?.json_ld?.type || 'Generic'})` };
        }
    },
    {
        name: 'analytics_tracking',
        label: 'Analytics & Tracking',
        stage: 'awareness',
        weights: { local: 2, professional_services: 3, ecommerce: 3, saas: 3, content_creator: 2, influencer: 1 },
        lowScoreInsight: 'You cannot optimize what you do not measure. No analytics means you are flying blind on every marketing dollar.',
        evaluate(platforms, hub) {
            if (!hub || hub.scrapeSuccess === false) return { score: 0, evidence: 'No hub forensics available' };
            const ga = hub.analytics?.google_analytics;
            const gtm = hub.analytics?.tag_manager;
            const pixel = hub.analytics?.intent_pixels?.length > 0 || hub.analytics?.facebook_pixel || hub.analytics?.hubspot;

            if (ga && gtm && pixel) {
                return { score: 3, evidence: 'GA + GTM + intent tracking pixel(s) detected' };
            }
            if (ga && gtm) {
                return { score: 2, evidence: 'GA and GTM both detected' };
            }
            if (ga || gtm || pixel) {
                return { score: 1, evidence: `${ga ? 'GA' : gtm ? 'GTM' : 'Pixel'} detected` };
            }
            return { score: 0, evidence: 'No analytics detected' };
        }
    },
    {
        name: 'serp_discoverability',
        label: 'SERP Discoverability',
        stage: 'awareness',
        weights: { local: 3, professional_services: 3, ecommerce: 3, saas: 3, content_creator: 1, influencer: 2 },
        lowScoreInsight: 'When someone Googles your brand name, they do not find you. That is immediate lost revenue from word-of-mouth referrals.',
        evaluate(platforms, hub, serp) {
            if (!serp || serp.serpRankingPosition === undefined || serp.serpRankingPosition === null) {
                return { score: 0, evidence: 'Brand name not found in top 50 search results' };
            }
            const pos = serp.serpRankingPosition;
            if (pos > 10) {
                return { score: 1, evidence: `Found in search positions 11-50 (Rank: ${pos})` };
            }
            if (pos >= 4 && pos <= 10) {
                return { score: 2, evidence: `Found on first page, below fold (Rank: ${pos})` };
            }
            return { score: 3, evidence: `Found in top search positions (Rank: ${pos})` };
        }
    },
    {
        name: 'gbp_presence',
        label: 'Google Business Profile Presence',
        stage: 'awareness',
        weights: { local: 3, professional_services: 2, ecommerce: 1, saas: 1, content_creator: 1, influencer: 1 },
        lowScoreInsight: 'Your Google Maps listing is your digital storefront. 46% of searches have local intent — you are missing nearly half of them.',
        evaluate(platforms) {
            const gbp = platforms.google_business_profile || platforms.google_maps;
            if (!gbp || !gbp.url) {
                return { score: 0, evidence: 'No GBP listing found' };
            }
            if (!gbp.claimed_status && (!gbp.photo_count || gbp.photo_count < 2)) {
                return { score: 1, evidence: 'Listing exists but unclaimed or incomplete' };
            }
            if (gbp.claimed_status && gbp.photo_count < 10) {
                return { score: 2, evidence: 'Claimed listing with basic photos and hours' };
            }
            return { score: 3, evidence: `Optimized listing: Claimed, ${gbp.photo_count || 0} photos, hours defined` };
        }
    },
    {
        name: 'social_presence',
        label: 'Social Platform Presence',
        stage: 'awareness',
        weights: { local: 2, professional_services: 3, ecommerce: 3, saas: 2, content_creator: 3, influencer: 3 },
        lowScoreInsight: 'You have very few active social profiles. Your competitors have multiple touchpoints where prospects can discover them.',
        evaluate(platforms) {
            const activePlatforms = Object.keys(platforms).filter(key => platforms[key] && platforms[key].url);
            const count = activePlatforms.length;
            if (count <= 1) {
                return { score: 0, evidence: `Only ${count} platform profile found: [${activePlatforms.join(', ')}]` };
            }
            if (count <= 3) {
                return { score: 1, evidence: `${count} platform profiles found: [${activePlatforms.join(', ')}]` };
            }
            if (count <= 5) {
                return { score: 2, evidence: `${count} platform profiles found: [${activePlatforms.join(', ')}]` };
            }
            return { score: 3, evidence: `${count} platform profiles found: [${activePlatforms.join(', ')}]` };
        }
    },
    {
        name: 'follower_reach',
        label: 'Aggregate Follower Reach',
        stage: 'awareness',
        weights: { local: 2, professional_services: 2, ecommerce: 3, saas: 2, content_creator: 3, influencer: 3 },
        lowScoreInsight: 'Your total online audience is extremely small. Every piece of content you create reaches very few people.',
        evaluate(platforms) {
            let total = 0;
            Object.values(platforms).forEach((p: any) => {
                if (p && typeof p.followers === 'number') total += p.followers;
                else if (p && typeof p.subscribers === 'number') total += p.subscribers;
            });

            if (total < 100) {
                return { score: 0, evidence: `Total reach is ${total} followers` };
            }
            if (total < 1000) {
                return { score: 1, evidence: `Total reach is ${total} followers` };
            }
            if (total < 10000) {
                return { score: 2, evidence: `Total reach is ${total} followers` };
            }
            return { score: 3, evidence: `Total reach is ${total} followers` };
        }
    },
    {
        name: 'content_marketing',
        label: 'Content Marketing (Blog)',
        stage: 'awareness',
        weights: { local: 1, professional_services: 3, ecommerce: 2, saas: 3, content_creator: 2, influencer: 1 },
        lowScoreInsight: 'No active blog/articles. Content marketing compounds — every month you do not publish is a month competitors build SEO authority.',
        evaluate(platforms, hub) {
            if (!hub || hub.scrapeSuccess === false) return { score: 0, evidence: 'No hub forensics available' };
            const blog = hub.blog;
            if (!blog || !blog.detected) {
                return { score: 0, evidence: 'No blog or article section detected' };
            }
            // post_count null = blog present but depth not countable -> "present, unknown depth".
            if (blog.post_count == null) {
                return { score: 1, evidence: 'Blog/article section present (post count not determinable)' };
            }
            if (blog.post_count < 5 || (blog.days_since_post && blog.days_since_post > 180)) {
                return { score: 1, evidence: `Blog exists but inactive (< 5 posts or last post > 6 months ago)` };
            }
            if (blog.days_since_post && blog.days_since_post > 90) {
                return { score: 2, evidence: 'Blog exists with recent content (> 5 posts, last post < 3 months ago)' };
            }
            return { score: 3, evidence: `Active blog: ${blog.post_count || 5}+ posts, last post ${blog.days_since_post || 0} days ago` };
        }
    }
];
