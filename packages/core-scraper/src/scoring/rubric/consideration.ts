import { MechanismConfig } from '../types.js';

export const CONSIDERATION_MECHANISMS: MechanismConfig[] = [
    {
        name: 'reviews_ratings',
        label: 'Reviews & Ratings',
        stage: 'consideration',
        weights: { local: 3, professional_services: 2, ecommerce: 3, saas: 2, content_creator: 1, influencer: 2 },
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
        weights: { local: 1, professional_services: 3, ecommerce: 1, saas: 3, content_creator: 2, influencer: 1 },
        lowScoreInsight: 'You have no proof your services work. A prospect comparing you to a competitor with detailed case studies will choose them every time.',
        evaluate(platforms, hub) {
            if (!hub || hub.scrapeSuccess === false) return { score: 0, evidence: 'No hub forensics available' };
            const caseStudies = hub.case_studies || {};
            if (!caseStudies.detected) {
                return { score: 0, evidence: 'No case studies or portfolio pages detected' };
            }
            // Detected but count not determinable -> "present, depth unknown" (never a fabricated high score).
            if (caseStudies.count == null && !caseStudies.type) {
                return { score: 1, evidence: 'Case study / portfolio section present (entry count not determinable)' };
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
        weights: { local: 2, professional_services: 3, ecommerce: 2, saas: 3, content_creator: 2, influencer: 2 },
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
        weights: { local: 2, professional_services: 3, ecommerce: 3, saas: 3, content_creator: 3, influencer: 3 },
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
        weights: { local: 1, professional_services: 3, ecommerce: 2, saas: 2, content_creator: 3, influencer: 2 },
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
            // Strong authority requires a verified badge AND consistent bio authority signals.
            if (verifiedCount >= 1 && bioAuthorityCount >= 1) {
                return { score: 3, evidence: `Strong authority: Verified on ${verifiedCount} platform(s) with consistent authority indicators` };
            }
            return { score: 2, evidence: 'Verified badge or authority proof across 1-2 platforms' };
        }
    },
    {
        name: 'external_link_quality',
        label: 'External Link Quality',
        stage: 'consideration',
        weights: { local: 2, professional_services: 2, ecommerce: 3, saas: 2, content_creator: 3, influencer: 3 },
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
        weights: { local: 1, professional_services: 3, ecommerce: 1, saas: 2, content_creator: 2, influencer: 1 },
        lowScoreInsight: 'LinkedIn is your sales catalog for B2B. An incomplete or dormant profile loses deals before the first meeting is scheduled.',
        evaluate(platforms) {
            const li = platforms.linkedin;
            if (!li || !li.url) {
                return { score: 0, evidence: 'No LinkedIn presence found' };
            }
            if (li.isPersonalProfile === false) {
                const hasFollowers = li.followerCount && li.followerCount > 0;
                const hasWebsite = li.websiteUrl;
                const hasDescription = li.about_length && li.about_length > 0;
                if (!hasWebsite && !hasDescription) {
                    return { score: 1, evidence: 'LinkedIn Company Page exists but lacks website link and description' };
                }
                if (hasWebsite && !hasDescription) {
                    return { score: 2, evidence: 'LinkedIn Company Page has website link but lacks detailed description' };
                }
                return { score: 3, evidence: `LinkedIn Company Page optimized: description present, website linked (${li.websiteUrl}), follower count: ${li.followerCount || 0}` };
            } else {
                const hasAbout = li.about_length && li.about_length > 0;
                const hasConnections = (li.connectionsCount || li.connections) && (li.connectionsCount || li.connections) >= 100;
                const hasFeatured = li.featured_section;

                if (!hasAbout && !hasConnections) {
                    return { score: 1, evidence: 'LinkedIn profile exists but is minimal/incomplete' };
                }
                if (hasAbout && hasConnections && !hasFeatured) {
                    return { score: 2, evidence: 'LinkedIn profile complete with About section and 100+ connections' };
                }
                return { score: 3, evidence: 'LinkedIn optimized: Headline, About, connections, and Featured content active' };
            }
        }
    }
];
