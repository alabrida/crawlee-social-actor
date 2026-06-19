/**
 * @module scoring/classifier
 * @description Automatically detects the business class based on website forensics, JSON-LD types, and platform signals.
 */

import { BusinessClass } from './types.js';
import { resolveNaics } from './naics-mapper.js';

export interface ClassificationResult {
    detected_class: BusinessClass;
    confidence: number;
    signals: string[];
    override: BusinessClass | null;
    local_archetype: string;
    naics_code: string;
    naics_title: string;
}

const ARCHETYPE_MAP: Record<BusinessClass, string> = {
    local: 'Local Storefront',
    professional_services: 'High-Ticket Services',
    ecommerce: 'E-Commerce Brand',
    saas: 'SaaS/Software',
    content_creator: 'Content Creator',
    influencer: 'Personal Brand/Influencer'
};

/**
 * Classifies a business based on all collected signals.
 */
export function classifyBusiness(
    platforms: Record<string, any>,
    hubForensics: any,
    override: BusinessClass | null = null
): ClassificationResult {
    if (override) {
        const archetype = ARCHETYPE_MAP[override];
        const gbpCategory = platforms.google_business_profile?.gbp_category || platforms.google_maps?.gbp_category;
        const naics = resolveNaics(gbpCategory, override);
        return {
            detected_class: override,
            confidence: 1.0,
            signals: ['Manual override applied'],
            override,
            local_archetype: archetype,
            naics_code: naics.code,
            naics_title: naics.title
        };
    }

    const signals: string[] = [];
    const scores: Record<BusinessClass, number> = {
        local: 0,
        professional_services: 0,
        ecommerce: 0,
        saas: 0,
        content_creator: 0,
        influencer: 0
    };

    // 1. Analyze JSON-LD Type (Strong Signal)
    const jsonLdSchema = hubForensics?.seo?.json_ld_schema || {};
    const jsonLdType = jsonLdSchema.type || hubForensics?.seo?.json_ld?.type || '';
    if (jsonLdType) {
        signals.push(`JSON-LD Type: ${jsonLdType}`);
        const lowType = jsonLdType.toLowerCase();

        if (lowType.includes('localbusiness') || lowType.includes('store') || lowType.includes('restaurant') || lowType.includes('hotel') || lowType.includes('medicalbusiness') || lowType.includes('dentist')) {
            scores.local += 6;
            if (lowType.includes('store')) scores.ecommerce += 3;
        } else if (lowType.includes('professionalservice') || lowType.includes('attorney') || lowType.includes('accounting') || lowType.includes('consulting')) {
            scores.professional_services += 6;
        } else if (lowType.includes('softwareapplication') || lowType.includes('webapplication')) {
            scores.saas += 6;
        } else if (lowType.includes('person') || lowType.includes('blogposting')) {
            scores.content_creator += 3;
            scores.influencer += 3;
        }
    }

    // 2. Analyze E-Commerce signals
    const eco = hubForensics?.ecommerce || {};
    if (eco.detected || eco.platform) {
        scores.ecommerce += 5;
        signals.push(`E-Commerce platform detected: ${eco.platform || 'unknown'}`);
    }
    if (eco.has_cart) {
        scores.ecommerce += 3;
        signals.push('Shopping cart widget detected on site');
    }

    // 3. Analyze SaaS signals
    const pricing = hubForensics?.pricing || {};
    if (pricing.detected && pricing.has_tiers) {
        scores.saas += 3;
        scores.professional_services += 1;
        signals.push('Pricing page with comparison tiers detected');
    }

    // 4. Analyze Local signals
    const hasGbp = platforms.google_business_profile || platforms.google_maps;
    if (hasGbp && hasGbp.url) {
        scores.local += 4;
        signals.push('Google Business Profile listing detected');
        if (hasGbp.phone || hasGbp.address) scores.local += 2;
    }
    const hasAddress = hubForensics?.contact_info?.address || hubForensics?.contact_info?.has_address;
    if (hasAddress) {
        scores.local += 2;
        signals.push('Physical address detected on website');
    }

    // 5. Hero Section Headings (H1/H2 Hints)
    const heroHeadings = hubForensics?.seo?.hero_headings || [];
    heroHeadings.forEach((heading: string) => {
        const lowText = heading.toLowerCase();
        if (/\b(dentist|plumbing|plumber|restaurant|burger|pizza|salon|clinic|roofing|hvac|construction|cleaning|lawyer|attorney|clinic|booking|book a call)\b/i.test(lowText)) {
            scores.local += 2;
        }
        if (/\b(consulting|consultant|agency|firm|advisory|solutions|partner|strategic|b2b)\b/i.test(lowText)) {
            scores.professional_services += 2;
        }
        if (/\b(saas|software|platform|api|app|automate|integrations|analytics|dashboard|pricing plan)\b/i.test(lowText)) {
            scores.saas += 3;
        }
        if (/\b(shop|store|collection|apparel|free shipping|cart|products|checkout|buy now|sale)\b/i.test(lowText)) {
            scores.ecommerce += 2;
        }
        if (/\b(course|academy|class|masterclass|coaching|mentorship|training|newsletter|substack|patreon|community|skool)\b/i.test(lowText)) {
            scores.content_creator += 2;
        }
        if (/\b(watch|podcast|vlog|creator|my channels|youtube|tiktok|instagram|socials|follow)\b/i.test(lowText)) {
            scores.influencer += 1;
        }
    });

    // 6. Analyze Creator vs. Influencer signals
    let isInfluencerSignal = false;
    let totalFollowers = 0;
    let platformCount = 0;

    Object.values(platforms).forEach((p: any) => {
        if (p && p.url) {
            platformCount++;
            if (p.link_in_bio) {
                const tool = (p.link_in_bio.tool || '').toLowerCase();
                const linkUrl = (p.link_in_bio.url || '').toLowerCase();
                if (tool === 'linktree' || linkUrl.includes('linktr.ee') || linkUrl.includes('ltk.app') || linkUrl.includes('amazon.com/shop')) {
                    scores.influencer += 3;
                    isInfluencerSignal = true;
                } else if (tool === 'stan' || tool === 'beacons' || linkUrl.includes('stan.store') || linkUrl.includes('beacons.ai') || linkUrl.includes('patreon.com') || linkUrl.includes('substack.com')) {
                    scores.content_creator += 3;
                }
            }
            if (p.bio_analysis) {
                const bioText = (p.bio_analysis.bioText || '').toLowerCase();
                if (/\b(collab|sponsorship|sponsor|brand deal|pr|representation|management|media kit|inquiries|talent|mgmt)\b/i.test(bioText)) {
                    scores.influencer += 3;
                    isInfluencerSignal = true;
                }
                if (/\b(course|template|ebook|membership|skool|patreon|substack|newsletter|digital product|coaching|stan\.store|beacons\.ai)\b/i.test(bioText)) {
                    scores.content_creator += 3;
                }
            }
            if (typeof p.followers === 'number') totalFollowers += p.followers;
            else if (typeof p.subscribers === 'number') totalFollowers += p.subscribers;
        }
    });

    if (totalFollowers > 50000) {
        scores.influencer += 4;
        signals.push(`Very high reach (${totalFollowers} aggregate followers), favoring influencer`);
    } else if (totalFollowers > 10000) {
        scores.influencer += 2;
        scores.content_creator += 2;
        signals.push(`High follower reach: ${totalFollowers} aggregate followers`);
    }

    if (platformCount >= 3 && !hubForensics?.scrapeSuccess) {
        if (isInfluencerSignal) scores.influencer += 4;
        else scores.content_creator += 4;
        signals.push('Multiple social profiles active but no business website detected');
    }

    // 7. Keywords in Description/Meta (Fallback)
    const metaDesc = (hubForensics?.seo?.meta_description || '').toLowerCase();
    const title = (hubForensics?.seo?.title || '').toLowerCase();
    const combinedText = `${metaDesc} ${title}`;

    if (combinedText.includes('software') || combinedText.includes('saas') || combinedText.includes('platform') || combinedText.includes('app')) {
        scores.saas += 2;
    }
    if (combinedText.includes('shop') || combinedText.includes('store') || combinedText.includes('products') || combinedText.includes('buy online')) {
        scores.ecommerce += 2;
    }
    if (combinedText.includes('consulting') || combinedText.includes('agency') || combinedText.includes('services') || combinedText.includes('firm')) {
        scores.professional_services += 2;
    }
    if (combinedText.includes('local') || combinedText.includes('near me') || combinedText.includes('serving')) {
        scores.local += 1;
    }
    if (combinedText.includes('creator') || combinedText.includes('blogger') || combinedText.includes('vlog')) {
        scores.content_creator += 2;
    }
    if (combinedText.includes('influencer') || combinedText.includes('sponsor') || combinedText.includes('collab')) {
        scores.influencer += 2;
    }

    // Final Selection
    let maxClass: BusinessClass = 'professional_services';
    let maxScore = 0;

    for (const [key, val] of Object.entries(scores)) {
        if (val > maxScore) {
            maxScore = val;
            maxClass = key as BusinessClass;
        }
    }

    const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
    const confidence = totalScore > 0 ? Math.min(0.95, maxScore / totalScore + 0.1) : 0.50;

    signals.push(`Auto-detected class as '${maxClass}' (Confidence: ${(confidence * 100).toFixed(0)}%)`);

    const local_archetype = ARCHETYPE_MAP[maxClass];
    const gbpCategory = platforms.google_business_profile?.gbp_category || platforms.google_maps?.gbp_category;
    const naics = resolveNaics(gbpCategory, maxClass);

    return {
        detected_class: maxClass,
        confidence,
        signals,
        override: null,
        local_archetype,
        naics_code: naics.code,
        naics_title: naics.title
    };
}
