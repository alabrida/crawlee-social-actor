/**
 * @module scoring/rubric
 * @description Defines the 30 mechanisms, weights, and scoring rules for the Revenue Journey.
 */

import { BusinessClass } from './types.js';

export interface MechanismConfig {
    name: string;
    label: string;
    stage: 'awareness' | 'consideration' | 'decision' | 'conversion' | 'retention';
    weights: Record<BusinessClass, number>;
    lowScoreInsight: string;
    evaluate(platforms: Record<string, any>, hub: any, serp: any): { score: number; evidence: string | null };
}

export const STAGE_WEIGHTS: Record<BusinessClass, Record<string, number>> = {
    local: {
        awareness: 0.25,
        consideration: 0.20,
        decision: 0.15,
        conversion: 0.25,
        retention: 0.15
    },
    professional_services: {
        awareness: 0.20,
        consideration: 0.25,
        decision: 0.20,
        conversion: 0.20,
        retention: 0.15
    },
    ecommerce: {
        awareness: 0.20,
        consideration: 0.15,
        decision: 0.20,
        conversion: 0.30,
        retention: 0.15
    },
    saas: {
        awareness: 0.15,
        consideration: 0.20,
        decision: 0.25,
        conversion: 0.25,
        retention: 0.15
    },
    content_creator: {
        awareness: 0.25,
        consideration: 0.20,
        decision: 0.15,
        conversion: 0.25,
        retention: 0.15
    }
};

export const MECHANISMS: MechanismConfig[] = [
    // ==========================================
    // STAGE 1: AWARENESS
    // ==========================================
    {
        name: 'website_ssl',
        label: 'Website exists & SSL',
        stage: 'awareness',
        weights: { local: 3, professional_services: 3, ecommerce: 3, saas: 3, content_creator: 2 },
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
        weights: { local: 3, professional_services: 3, ecommerce: 3, saas: 3, content_creator: 1 },
        lowScoreInsight: 'Search engines cannot understand what your business does. You are invisible to intent-based search.',
        evaluate(platforms, hub) {
            if (!hub || hub.scrapeSuccess === false) return { score: 0, evidence: 'No hub forensics available' };
            const desc = hub.seo?.meta_description;
            const canonical = hub.seo?.canonical;
            const jsonLd = hub.seo?.json_ld?.present;
            const ogTags = hub.seo?.og_tags; // Optional check

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
        weights: { local: 2, professional_services: 3, ecommerce: 3, saas: 3, content_creator: 2 },
        lowScoreInsight: 'You cannot optimize what you do not measure. No analytics means you are flying blind on every marketing dollar.',
        evaluate(platforms, hub) {
            if (!hub || hub.scrapeSuccess === false) return { score: 0, evidence: 'No hub forensics available' };
            const ga = hub.analytics?.google_analytics;
            const gtm = hub.analytics?.tag_manager;
            const pixel = hub.analytics?.intent_pixels?.length > 0 || hub.analytics?.facebook_pixel || hub.analytics?.hubspot;

            if (!ga && !gtm && !pixel) {
                return { score: 0, evidence: 'No analytics detected' };
            }
            if ((ga || gtm) && !pixel) {
                return { score: 1, evidence: `${ga ? 'GA' : 'GTM'} detected` };
            }
            if (ga && gtm && !pixel) {
                return { score: 2, evidence: 'GA and GTM both detected' };
            }
            return { score: 3, evidence: 'GA + GTM + intent tracking pixel(s) detected' };
        }
    },
    {
        name: 'serp_discoverability',
        label: 'SERP Discoverability',
        stage: 'awareness',
        weights: { local: 3, professional_services: 3, ecommerce: 3, saas: 3, content_creator: 1 },
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
        weights: { local: 3, professional_services: 2, ecommerce: 1, saas: 1, content_creator: 1 },
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
        weights: { local: 2, professional_services: 3, ecommerce: 3, saas: 2, content_creator: 3 },
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
        weights: { local: 2, professional_services: 2, ecommerce: 3, saas: 2, content_creator: 3 },
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
        weights: { local: 1, professional_services: 3, ecommerce: 2, saas: 3, content_creator: 2 },
        lowScoreInsight: 'No active blog/articles. Content marketing compounds — every month you do not publish is a month competitors build SEO authority.',
        evaluate(platforms, hub) {
            if (!hub || hub.scrapeSuccess === false) return { score: 0, evidence: 'No hub forensics available' };
            const blog = hub.blog;
            if (!blog || !blog.detected) {
                return { score: 0, evidence: 'No blog or article section detected' };
            }
            if (blog.post_count < 5 || (blog.days_since_post && blog.days_since_post > 180)) {
                return { score: 1, evidence: `Blog exists but inactive (< 5 posts or last post > 6 months ago)` };
            }
            if (blog.days_since_post && blog.days_since_post > 90) {
                return { score: 2, evidence: 'Blog exists with recent content (> 5 posts, last post < 3 months ago)' };
            }
            return { score: 3, evidence: `Active blog: ${blog.post_count || 5}+ posts, last post ${blog.days_since_post || 0} days ago` };
        }
    },

    // ==========================================
    // STAGE 2: CONSIDERATION
    // ==========================================
    {
        name: 'reviews_ratings',
        label: 'Reviews & Ratings',
        stage: 'consideration',
        weights: { local: 3, professional_services: 2, ecommerce: 3, saas: 2, content_creator: 1 },
        lowScoreInsight: 'You have few reviews or low average ratings. Prospects will choose competitors with richer social proof.',
        evaluate(platforms) {
            let totalReviews = 0;
            let avgRating = 0;
            let count = 0;

            const gbp = platforms.google_business_profile || platforms.google_maps;
            if (gbp && gbp.reviews_count) {
                totalReviews += gbp.reviews_count;
                avgRating += gbp.rating || 0;
                count++;
            }
            const fb = platforms.facebook;
            if (fb && fb.reviews_count) {
                totalReviews += fb.reviews_count;
                avgRating += fb.rating || 0;
                count++;
            }

            const finalRating = count > 0 ? avgRating / count : 0;

            if (totalReviews === 0) {
                return { score: 0, evidence: 'No reviews found on main profiles' };
            }
            if (totalReviews < 10 || finalRating < 3.5) {
                return { score: 1, evidence: `Few reviews: ${totalReviews} reviews, average ${finalRating.toFixed(1)} rating` };
            }
            if (totalReviews < 25 || finalRating < 4.0) {
                return { score: 2, evidence: `Functional reviews: ${totalReviews} reviews, average ${finalRating.toFixed(1)} rating` };
            }
            return { score: 3, evidence: `Strong reviews: ${totalReviews} reviews, average ${finalRating.toFixed(1)} rating` };
        }
    },
    {
        name: 'case_studies',
        label: 'Case Studies & Portfolio',
        stage: 'consideration',
        weights: { local: 1, professional_services: 3, ecommerce: 1, saas: 3, content_creator: 2 },
        lowScoreInsight: 'You have no proof your services work. A prospect comparing you to a competitor with detailed case studies will choose them every time.',
        evaluate(platforms, hub) {
            if (!hub || hub.scrapeSuccess === false) return { score: 0, evidence: 'No hub forensics available' };
            const caseStudies = hub.case_studies || {};
            if (!caseStudies.detected) {
                return { score: 0, evidence: 'No case studies or portfolio pages detected' };
            }
            if (caseStudies.type === 'logo_wall' || (caseStudies.count && caseStudies.count <= 1)) {
                return { score: 1, evidence: 'Logo wall or single customer reference detected' };
            }
            if (caseStudies.count && caseStudies.count < 3) {
                return { score: 2, evidence: 'Multiple portfolio/case studies detected, but lack outcome metrics' };
            }
            return { score: 3, evidence: 'Dedicated case study or portfolio section with multiple rich entries' };
        }
    },
    {
        name: 'testimonials',
        label: 'Testimonials',
        stage: 'consideration',
        weights: { local: 2, professional_services: 3, ecommerce: 2, saas: 3, content_creator: 2 },
        lowScoreInsight: 'You are asking prospects to trust you based on your own claims. Client testimonials are 12x more persuasive.',
        evaluate(platforms, hub) {
            if (!hub || hub.scrapeSuccess === false) return { score: 0, evidence: 'No hub forensics available' };
            const test = hub.testimonials || {};
            if (!test.detected) {
                return { score: 0, evidence: 'No testimonials detected on website' };
            }
            if (!test.has_named_source) {
                return { score: 1, evidence: 'Generic unattributed testimonials present' };
            }
            if (test.count && test.count < 3) {
                return { score: 2, evidence: 'Attributed testimonials present (text only)' };
            }
            return { score: 3, evidence: 'Rich testimonials (with names, photos, or video elements) present' };
        }
    },
    {
        name: 'content_recency',
        label: 'Content Recency (Cross-Platform)',
        stage: 'consideration',
        weights: { local: 2, professional_services: 3, ecommerce: 3, saas: 3, content_creator: 3 },
        lowScoreInsight: 'Your social channels have not posted recently. An inactive online presence signals an inactive business.',
        evaluate(platforms) {
            let minDaysAgo: number | null = null;
            Object.values(platforms).forEach((p: any) => {
                if (p && typeof p.days_since_post === 'number') {
                    if (minDaysAgo === null || p.days_since_post < minDaysAgo) {
                        minDaysAgo = p.days_since_post;
                    }
                }
            });

            if (minDaysAgo === null) {
                return { score: 0, evidence: 'No recent posts found or no post data extracted' };
            }
            if (minDaysAgo > 180) {
                return { score: 0, evidence: `Last social post was > 180 days ago (${minDaysAgo} days)` };
            }
            if (minDaysAgo > 30) {
                return { score: 1, evidence: `Last social post was ${minDaysAgo} days ago (inactive)` };
            }
            if (minDaysAgo > 7) {
                return { score: 2, evidence: `Last social post was ${minDaysAgo} days ago` };
            }
            return { score: 3, evidence: `Active social posting: Last post was ${minDaysAgo} days ago` };
        }
    },
    {
        name: 'authority_signals',
        label: 'Authority Signals (Verified)',
        stage: 'consideration',
        weights: { local: 1, professional_services: 3, ecommerce: 2, saas: 2, content_creator: 3 },
        lowScoreInsight: 'You have no verified credentials or authority proof visible in bios. Prospects must take a leap of faith to trust you.',
        evaluate(platforms) {
            let verifiedCount = 0;
            let bioAuthorityCount = 0;

            Object.values(platforms).forEach((p: any) => {
                if (p && p.verified) verifiedCount++;
                if (p && p.bio_analysis?.hasAuthorityProof) bioAuthorityCount++;
            });

            if (verifiedCount === 0 && bioAuthorityCount === 0) {
                return { score: 0, evidence: 'No verified badges or authority proof detected' };
            }
            if (verifiedCount === 0 && bioAuthorityCount >= 1) {
                return { score: 1, evidence: 'Authority keywords in bio detected on 1 platform' };
            }
            if (verifiedCount >= 1 || bioAuthorityCount >= 2) {
                return { score: 2, evidence: 'Verified badge or authority proof across 1-2 platforms' };
            }
            return { score: 3, evidence: `Strong authority: Verified on ${verifiedCount} platforms, consistent authority indicators` };
        }
    },
    {
        name: 'external_link_quality',
        label: 'External Link Quality',
        stage: 'consideration',
        weights: { local: 2, professional_services: 2, ecommerce: 3, saas: 2, content_creator: 3 },
        lowScoreInsight: 'Your social profile links are broken or point to non-hub pages. Every profile visit is a missed funnel opportunity.',
        evaluate(platforms) {
            let workingLinks = 0;
            let optimizedLinks = 0;
            let total = 0;

            Object.values(platforms).forEach((p: any) => {
                if (p && p.link_in_bio) {
                    total++;
                    if (p.link_in_bio.type === 'link_aggregator' || p.link_in_bio.type === 'booking') {
                        optimizedLinks++;
                        workingLinks++;
                    } else if (p.link_in_bio.type === 'direct_website') {
                        workingLinks++;
                    }
                }
            });

            if (total === 0) {
                return { score: 0, evidence: 'No link-in-bio or external links found on profiles' };
            }
            if (workingLinks === 0) {
                return { score: 1, evidence: 'Links present but fail verification or point to broken pages' };
            }
            if (optimizedLinks === 0) {
                return { score: 2, evidence: 'Profiles link directly to corporate website homepage' };
            }
            return { score: 3, evidence: 'Profiles use optimized landing pages or link aggregator tools' };
        }
    },
    {
        name: 'linkedin_presence',
        label: 'LinkedIn Professional Presence',
        stage: 'consideration',
        weights: { local: 1, professional_services: 3, ecommerce: 1, saas: 2, content_creator: 2 },
        lowScoreInsight: 'LinkedIn is your sales catalog for B2B. An incomplete or dormant profile loses deals before the first meeting is scheduled.',
        evaluate(platforms) {
            const li = platforms.linkedin;
            if (!li || !li.url) {
                return { score: 0, evidence: 'No LinkedIn profile found' };
            }
            const hasAbout = li.about_length && li.about_length > 0;
            const hasConnections = li.connections && li.connections >= 100;
            const hasFeatured = li.featured_section;

            if (!hasAbout && !hasConnections) {
                return { score: 1, evidence: 'LinkedIn profile exists but is minimal/incomplete' };
            }
            if (hasAbout && hasConnections && !hasFeatured) {
                return { score: 2, evidence: 'LinkedIn profile complete with About section and 100+ connections' };
            }
            return { score: 3, evidence: 'LinkedIn optimized: Headline, About, 500+ connections, and Featured content active' };
        }
    },

    // ==========================================
    // STAGE 3: DECISION
    // ==========================================
    {
        name: 'pricing_transparency',
        label: 'Pricing Transparency',
        stage: 'decision',
        weights: { local: 1, professional_services: 2, ecommerce: 3, saas: 3, content_creator: 2 },
        lowScoreInsight: 'No visible pricing means prospects must contact you just to find out what you cost. Most will not bother.',
        evaluate(platforms, hub) {
            if (!hub || hub.scrapeSuccess === false) return { score: 0, evidence: 'No hub forensics available' };
            const pricing = hub.pricing || {};
            if (!pricing.detected) {
                return { score: 0, evidence: 'No pricing information found' };
            }
            if (pricing.has_tiers === false && pricing.has_quotes_only) {
                return { score: 1, evidence: '"Contact for pricing" or quote request flow detected' };
            }
            if (pricing.has_tiers === false) {
                return { score: 2, evidence: 'Pricing page exists with general starter pricing or ranges' };
            }
            return { score: 3, evidence: `Clear pricing: ${pricing.tier_count || 'multiple'} tiers or transparent rates defined` };
        }
    },
    {
        name: 'booking_cta',
        label: 'Booking / Demo / Consultation CTA',
        stage: 'decision',
        weights: { local: 3, professional_services: 3, ecommerce: 1, saas: 3, content_creator: 2 },
        lowScoreInsight: 'A prospect just decided they want to work with you, but there is no booking mechanism on your site. They will book with whoever makes it easiest.',
        evaluate(platforms, hub) {
            let hasBooking = false;
            let isInstant = false;

            if (hub && hub.scrapeSuccess !== false) {
                if (hub.forms?.types?.includes('booking') || hub.booking?.detected) hasBooking = true;
                if (hub.booking?.provider) isInstant = true;
            }

            Object.values(platforms).forEach((p: any) => {
                if (p && p.link_in_bio?.type === 'booking') {
                    hasBooking = true;
                    isInstant = true;
                }
            });

            if (!hasBooking) {
                return { score: 0, evidence: 'No booking, demo, or consultation CTA detected' };
            }
            if (hasBooking && !isInstant) {
                return { score: 1, evidence: 'Booking CTA exists but relies on standard contact form' };
            }
            return { score: 3, evidence: 'Instant booking integration detected (e.g. Calendly, Acuity)' };
        }
    },
    {
        name: 'contact_accessibility',
        label: 'Contact Accessibility',
        stage: 'decision',
        weights: { local: 3, professional_services: 3, ecommerce: 2, saas: 2, content_creator: 1 },
        lowScoreInsight: 'It is too hard for customers to contact you. Ensure email, phone, and address are prominently displayed.',
        evaluate(platforms, hub) {
            let hasPhone = false;
            let hasEmail = false;
            let hasForm = false;

            if (hub && hub.scrapeSuccess !== false) {
                if (hub.forms?.count > 0) hasForm = true;
                if (hub.contact_info?.phone) hasPhone = true;
                if (hub.contact_info?.email) hasEmail = true;
            }

            const gbp = platforms.google_business_profile || platforms.google_maps;
            if (gbp) {
                if (gbp.phone) hasPhone = true;
            }

            const activeCount = [hasPhone, hasEmail, hasForm].filter(Boolean).length;

            if (activeCount === 0) {
                return { score: 0, evidence: 'No phone, email, or contact form found' };
            }
            if (activeCount === 1) {
                return { score: 1, evidence: `Only one contact method available (${hasPhone ? 'Phone' : hasEmail ? 'Email' : 'Form'})` };
            }
            if (activeCount === 2) {
                return { score: 2, evidence: 'Two contact channels available' };
            }
            return { score: 3, evidence: 'Omnichannel access: Phone, email, and contact forms all prominent' };
        }
    },
    {
        name: 'privacy_compliance',
        label: 'Privacy & Compliance',
        stage: 'decision',
        weights: { local: 1, professional_services: 2, ecommerce: 3, saas: 3, content_creator: 1 },
        lowScoreInsight: 'You collect user data without a visible privacy policy. This is a GDPR/CCPA risk and immediate trust killer.',
        evaluate(platforms, hub) {
            if (!hub || hub.scrapeSuccess === false) return { score: 0, evidence: 'No hub forensics available' };
            const priv = hub.privacy || {};
            const cookie = hub.cookie_consent || {};

            if (!priv.detected && !cookie.detected) {
                return { score: 0, evidence: 'No privacy policy or cookie banner found' };
            }
            if (priv.detected && !cookie.detected) {
                return { score: 1, evidence: 'Privacy policy page exists' };
            }
            if (priv.detected && cookie.detected) {
                return { score: 2, evidence: 'Privacy policy and cookie banner detected' };
            }
            return { score: 3, evidence: 'Compliant: Privacy policy, terms of service, and cookie consent detected' };
        }
    },
    {
        name: 'platform_decision_signals',
        label: 'Platform-Specific Decision Signals',
        stage: 'decision',
        weights: { local: 2, professional_services: 2, ecommerce: 3, saas: 2, content_creator: 3 },
        lowScoreInsight: 'You are not utilizing platform-specific transaction features like shops or call-to-action buttons.',
        evaluate(platforms) {
            let count = 0;
            const features: string[] = [];

            const ig = platforms.instagram;
            if (ig && ig.has_shop) {
                count++;
                features.push('Instagram Shop');
            }
            const yt = platforms.youtube;
            if (yt && (yt.has_membership || yt.has_merch)) {
                count++;
                features.push('YouTube Memberships/Store');
            }
            const tt = platforms.tiktok;
            if (tt && tt.has_shop) {
                count++;
                features.push('TikTok Shop');
            }
            const fb = platforms.facebook;
            if (fb && fb.cta_button_type) {
                count++;
                features.push(`FB CTA: ${fb.cta_button_type}`);
            }

            if (count === 0) {
                return { score: 0, evidence: 'No native platform commerce or call features active' };
            }
            if (count === 1) {
                return { score: 1, evidence: `1 conversion feature active: ${features[0]}` };
            }
            if (count <= 3) {
                return { score: 2, evidence: `${count} platform features active: [${features.join(', ')}]` };
            }
            return { score: 3, evidence: `Optimized: ${count} features active: [${features.join(', ')}]` };
        }
    },

    // ==========================================
    // STAGE 4: CONVERSION
    // ==========================================
    {
        name: 'forms_lead_capture',
        label: 'Forms & Lead Capture',
        stage: 'conversion',
        weights: { local: 2, professional_services: 3, ecommerce: 2, saas: 3, content_creator: 2 },
        lowScoreInsight: 'No forms detected. You cannot capture lead information without a structured capture form.',
        evaluate(platforms, hub) {
            if (!hub || hub.scrapeSuccess === false) return { score: 0, evidence: 'No hub forensics available' };
            const formCount = hub.forms?.count || 0;
            const formTypes = hub.forms?.types || [];

            if (formCount === 0) {
                return { score: 0, evidence: 'No forms detected on site' };
            }
            if (formCount === 1) {
                return { score: 1, evidence: `1 form detected: [${formTypes.join(', ')}]` };
            }
            if (formTypes.length >= 2) {
                return { score: 2, evidence: `${formCount} forms found of types: [${formTypes.join(', ')}]` };
            }
            return { score: 3, evidence: `Strategic forms: ${formCount} forms, segmented: [${formTypes.join(', ')}]` };
        }
    },
    {
        name: 'ecommerce_checkout',
        label: 'E-Commerce Checkout',
        stage: 'conversion',
        weights: { local: 1, professional_services: 1, ecommerce: 3, saas: 2, content_creator: 2 },
        lowScoreInsight: 'No checkout infrastructure detected. E-Commerce brands must have a fully functional checkout stack.',
        evaluate(platforms, hub) {
            if (!hub || hub.scrapeSuccess === false) return { score: 0, evidence: 'No hub forensics available' };
            const eco = hub.ecommerce || {};
            if (!eco.detected && !eco.platform) {
                return { score: 0, evidence: 'No e-commerce indicators detected' };
            }
            if (eco.detected && !eco.has_cart) {
                return { score: 1, evidence: 'Products present but no cart/checkout flow visible' };
            }
            if (eco.has_cart && !eco.has_checkout) {
                return { score: 2, evidence: `Cart detected on ${eco.platform || 'custom'} platform` };
            }
            return { score: 3, evidence: `Checkout stack active: ${eco.platform || 'Stripe/WooCommerce/Shopify'} cart and checkout detected` };
        }
    },
    {
        name: 'mobile_optimization',
        label: 'Mobile Optimization',
        stage: 'conversion',
        weights: { local: 3, professional_services: 2, ecommerce: 3, saas: 3, content_creator: 3 },
        lowScoreInsight: 'More than half of web traffic is mobile. Your site lacks optimization or loads too slowly on mobile devices.',
        evaluate(platforms, hub) {
            if (!hub || hub.scrapeSuccess === false) return { score: 0, evidence: 'No hub forensics available' };
            const viewport = hub.mobile?.viewport_meta;
            const responsive = hub.mobile?.responsive;
            const ttfb = hub.performance?.ttfb_ms;

            if (!viewport && !responsive) {
                return { score: 0, evidence: 'No viewport meta tag or responsive signals found' };
            }
            if (viewport && !responsive) {
                return { score: 1, evidence: 'Viewport meta tag present but layout responsive check failed' };
            }
            if (viewport && responsive && ttfb && ttfb > 2000) {
                return { score: 2, evidence: 'Responsive layout present, but mobile TTFB is slow (> 2s)' };
            }
            return { score: 3, evidence: `Fully responsive + fast mobile load (TTFB: ${ttfb || 'unknown'}ms)` };
        }
    },
    {
        name: 'email_newsletter_capture',
        label: 'Email & Newsletter Capture',
        stage: 'conversion',
        weights: { local: 1, professional_services: 3, ecommerce: 3, saas: 3, content_creator: 3 },
        lowScoreInsight: 'No email or newsletter capture. Build your mailing list to capture leads before they leave.',
        evaluate(platforms, hub) {
            let hasNewsletter = false;
            let hasLeadMagnet = false;

            if (hub && hub.scrapeSuccess !== false) {
                const types = hub.forms?.types || [];
                if (types.includes('newsletter')) hasNewsletter = true;
                if (types.includes('lead_magnet')) hasLeadMagnet = true;
            }

            const li = platforms.linkedin;
            if (li && li.newsletter) hasNewsletter = true;

            if (!hasNewsletter && !hasLeadMagnet) {
                return { score: 0, evidence: 'No newsletter signup or email capture detected' };
            }
            if (hasNewsletter && !hasLeadMagnet) {
                return { score: 1, evidence: 'Basic newsletter subscription available' };
            }
            if (!hasNewsletter && hasLeadMagnet) {
                return { score: 2, evidence: 'Lead magnet email gate detected' };
            }
            return { score: 3, evidence: 'Segmented email capture: newsletter and lead magnet both active' };
        }
    },
    {
        name: 'chat_realtime',
        label: 'Chat & Real-Time Engagement',
        stage: 'conversion',
        weights: { local: 2, professional_services: 2, ecommerce: 2, saas: 3, content_creator: 1 },
        lowScoreInsight: 'No chat widget detected. Instant messaging options raise conversion rates by answering questions in real-time.',
        evaluate(platforms, hub) {
            if (!hub || hub.scrapeSuccess === false) return { score: 0, evidence: 'No chat widget detected' };
            const chat = hub.chat || {};
            if (!chat.detected) {
                return { score: 0, evidence: 'No chat widget detected' };
            }
            if (chat.detected && !chat.provider) {
                return { score: 1, evidence: 'Generic chat button present (unidentified provider)' };
            }
            if (chat.detected && chat.provider && !chat.has_bot) {
                return { score: 2, evidence: `Live chat present powered by ${chat.provider}` };
            }
            return { score: 3, evidence: `AI/bot chat integrated via ${chat.provider || 'CRM'}` };
        }
    },

    // ==========================================
    // STAGE 5: RETENTION
    // ==========================================
    {
        name: 'content_consistency',
        label: 'Content Consistency',
        stage: 'retention',
        weights: { local: 2, professional_services: 3, ecommerce: 3, saas: 3, content_creator: 3 },
        lowScoreInsight: 'You post infrequently. Retention and community growth depend on a steady content calendar.',
        evaluate(platforms) {
            let activePlatforms = 0;
            let sumFrequency = 0;

            Object.values(platforms).forEach((p: any) => {
                if (p && typeof p.days_since_post === 'number') {
                    sumFrequency += p.days_since_post;
                    activePlatforms++;
                }
            });

            if (activePlatforms === 0) {
                return { score: 0, evidence: 'No posting frequency data extracted' };
            }

            const avgDays = sumFrequency / activePlatforms;

            if (avgDays > 60) {
                return { score: 0, evidence: `Infrequent posting: average ${avgDays.toFixed(1)} days between posts` };
            }
            if (avgDays > 14) {
                return { score: 1, evidence: `Occasional posting: average ${avgDays.toFixed(1)} days between posts` };
            }
            if (avgDays > 3) {
                return { score: 2, evidence: `Steady posting: average ${avgDays.toFixed(1)} days between posts` };
            }
            return { score: 3, evidence: `Highly active: average ${avgDays.toFixed(1)} days between posts` };
        }
    },
    {
        name: 'cross_platform_connectivity',
        label: 'Cross-Platform Connectivity',
        stage: 'retention',
        weights: { local: 2, professional_services: 3, ecommerce: 3, saas: 3, content_creator: 3 },
        lowScoreInsight: 'Your social profiles and website do not link to each other. Users cannot follow you across the web.',
        evaluate(platforms, hub) {
            let socialLinksCount = 0;
            if (hub && hub.scrapeSuccess !== false) {
                socialLinksCount = Object.keys(hub.social_links || {}).length;
            }

            let profileLinksBack = 0;
            let totalProfiles = 0;
            Object.values(platforms).forEach((p: any) => {
                if (p && p.url) {
                    totalProfiles++;
                    if (p.link_in_bio?.url) {
                        profileLinksBack++;
                    }
                }
            });

            if (socialLinksCount === 0 && profileLinksBack === 0) {
                return { score: 0, evidence: 'No cross-platform linking detected' };
            }
            if (socialLinksCount <= 2 && profileLinksBack <= 1) {
                return { score: 1, evidence: `Minimal connection: Hub links to ${socialLinksCount} profiles, ${profileLinksBack}/${totalProfiles} profiles link back` };
            }
            if (socialLinksCount >= 3 && profileLinksBack >= 2) {
                return { score: 2, evidence: `Good connection: Hub links to ${socialLinksCount} profiles, ${profileLinksBack}/${totalProfiles} profiles link back` };
            }
            return { score: 3, evidence: `Full ecosystem: Hub links to ${socialLinksCount} profiles, active cross-links on profiles` };
        }
    },
    {
        name: 'community_presence',
        label: 'Community Presence',
        stage: 'retention',
        weights: { local: 1, professional_services: 2, ecommerce: 2, saas: 3, content_creator: 3 },
        lowScoreInsight: 'No community channels detected. Build customer stickiness by hosting interactive communities.',
        evaluate(platforms, hub) {
            let communityCount = 0;
            const channels: string[] = [];

            if (platforms.reddit && platforms.reddit.url) {
                communityCount++;
                channels.push('Reddit');
            }
            if (platforms.youtube && platforms.youtube.content_tabs?.includes('community')) {
                communityCount++;
                channels.push('YouTube Community');
            }

            if (hub && hub.scrapeSuccess !== false) {
                const links = Object.values(hub.social_links || {});
                const hasDiscord = links.some((l: any) => l.includes('discord.gg') || l.includes('discord.com'));
                const hasSlack = links.some((l: any) => l.includes('slack.com'));
                const hasFacebookGroup = links.some((l: any) => l.includes('facebook.com/groups'));
                if (hasDiscord) { communityCount++; channels.push('Discord'); }
                if (hasSlack) { communityCount++; channels.push('Slack'); }
                if (hasFacebookGroup) { communityCount++; channels.push('Facebook Group'); }
            }

            if (communityCount === 0) {
                return { score: 0, evidence: 'No community channels detected' };
            }
            if (communityCount === 1) {
                return { score: 1, evidence: `Community presence on 1 channel: ${channels[0]}` };
            }
            if (communityCount === 2) {
                return { score: 2, evidence: `Active community on 2 channels: [${channels.join(', ')}]` };
            }
            return { score: 3, evidence: `Strategic community: active across ${communityCount} channels: [${channels.join(', ')}]` };
        }
    },
    {
        name: 'gbp_review_engagement',
        label: 'GBP Review Engagement',
        stage: 'retention',
        weights: { local: 3, professional_services: 2, ecommerce: 2, saas: 1, content_creator: 1 },
        lowScoreInsight: 'Reviews exist but you respond to few or none. Responding build client retention and search ranking authority.',
        evaluate(platforms) {
            const gbp = platforms.google_business_profile || platforms.google_maps;
            if (!gbp || !gbp.url || !gbp.reviews_count) {
                return { score: 0, evidence: 'No reviews found on Google listing' };
            }
            const rate = gbp.owner_response_rate || 0; // expected 0.0 - 1.0 (or percentage)
            const ratePercent = rate <= 1 ? rate * 100 : rate;

            if (ratePercent === 0) {
                return { score: 0, evidence: 'Owner has responded to 0% of reviews' };
            }
            if (ratePercent < 25) {
                return { score: 1, evidence: `Owner responses minimal: responded to ${ratePercent.toFixed(0)}% of reviews` };
            }
            if (ratePercent < 75) {
                return { score: 2, evidence: `Owner responses active: responded to ${ratePercent.toFixed(0)}% of reviews` };
            }
            return { score: 3, evidence: `Owner responses optimized: responded to ${ratePercent.toFixed(0)}% of reviews` };
        }
    },
    {
        name: 'content_organization',
        label: 'Content Organization',
        stage: 'retention',
        weights: { local: 1, professional_services: 2, ecommerce: 2, saas: 2, content_creator: 3 },
        lowScoreInsight: 'Your social content is disorganized. Curation helps direct viewers through the marketing funnel.',
        evaluate(platforms) {
            let count = 0;
            const details: string[] = [];

            const yt = platforms.youtube;
            if (yt && yt.playlist_count && yt.playlist_count > 0) {
                count++;
                details.push(`${yt.playlist_count} YT playlists`);
            }
            const pin = platforms.pinterest;
            if (pin && pin.board_count && pin.board_count > 0) {
                count++;
                details.push(`${pin.board_count} Pinterest boards`);
            }
            const ig = platforms.instagram;
            if (ig && ig.content_mix?.highlights && ig.content_mix.highlights > 0) {
                count++;
                details.push(`${ig.content_mix.highlights} IG highlights`);
            }
            const li = platforms.linkedin;
            if (li && li.featured_section) {
                count++;
                details.push('LinkedIn Featured section');
            }

            if (count === 0) {
                return { score: 0, evidence: 'No content organization detected' };
            }
            if (count === 1) {
                return { score: 1, evidence: `Basic organization: ${details[0]}` };
            }
            if (count <= 3) {
                return { score: 2, evidence: `Organized content on multiple platforms: [${details.join(', ')}]` };
            }
            return { score: 3, evidence: `Strategic curation active: [${details.join(', ')}]` };
        }
    }
];
