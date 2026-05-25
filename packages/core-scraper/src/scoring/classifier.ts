/**
 * @module scoring/classifier
 * @description Automatically detects the business class based on website forensics, JSON-LD types, and platform signals.
 */

import { BusinessClass } from './types.js';

export interface ClassificationResult {
    detected_class: BusinessClass;
    confidence: number;
    signals: string[];
    override: BusinessClass | null;
}

/**
 * Classifies a business based on all collected signals.
 * @param platforms - Map of platform-specific extracted data.
 * @param hubForensics - General website forensics.
 * @param override - Optional manual override.
 */
export function classifyBusiness(
    platforms: Record<string, any>,
    hubForensics: any,
    override: BusinessClass | null = null
): ClassificationResult {
    if (override) {
        return {
            detected_class: override,
            confidence: 1.0,
            signals: ['Manual override applied'],
            override
        };
    }

    const signals: string[] = [];
    const scores: Record<BusinessClass, number> = {
        local: 0,
        professional_services: 0,
        ecommerce: 0,
        saas: 0,
        content_creator: 0
    };

    // ------------------------------------------
    // 1. Analyze JSON-LD Type (Strong Signal)
    // ------------------------------------------
    const jsonLdType = hubForensics?.seo?.json_ld?.type || '';
    if (jsonLdType) {
        signals.push(`JSON-LD Type: ${jsonLdType}`);
        const lowType = jsonLdType.toLowerCase();

        if (lowType.includes('localbusiness') || lowType.includes('store') || lowType.includes('restaurant') || lowType.includes('hotel') || lowType.includes('medicalbusiness')) {
            scores.local += 5;
            if (lowType.includes('store')) scores.ecommerce += 3;
        } else if (lowType.includes('professionalservice') || lowType.includes('attorney') || lowType.includes('accounting') || lowType.includes('consulting')) {
            scores.professional_services += 5;
        } else if (lowType.includes('softwareapplication') || lowType.includes('webapplication')) {
            scores.saas += 6;
        } else if (lowType.includes('person') || lowType.includes('blogposting')) {
            scores.content_creator += 3;
        }
    }

    // ------------------------------------------
    // 2. Analyze E-Commerce signals
    // ------------------------------------------
    const eco = hubForensics?.ecommerce || {};
    if (eco.detected || eco.platform) {
        scores.ecommerce += 5;
        signals.push(`E-Commerce platform detected: ${eco.platform || 'unknown'}`);
    }
    if (eco.has_cart) {
        scores.ecommerce += 3;
        signals.push('Shopping cart widget detected on site');
    }

    // ------------------------------------------
    // 3. Analyze SaaS signals
    // ------------------------------------------
    const pricing = hubForensics?.pricing || {};
    if (pricing.detected && pricing.has_tiers) {
        scores.saas += 3;
        scores.professional_services += 1;
        signals.push('Pricing page with comparison tiers detected');
    }

    // ------------------------------------------
    // 4. Analyze Local signals
    // ------------------------------------------
    const hasGbp = platforms.google_business_profile || platforms.google_maps;
    if (hasGbp && hasGbp.url) {
        scores.local += 4;
        signals.push('Google Business Profile listing detected');
        if (hasGbp.phone || hasGbp.address) {
            scores.local += 2;
        }
    }
    const hasAddress = hubForensics?.contact_info?.address || hubForensics?.contact_info?.has_address;
    if (hasAddress) {
        scores.local += 2;
        signals.push('Physical address detected on website');
    }

    // ------------------------------------------
    // 5. Analyze Creator signals
    // ------------------------------------------
    let hasAggregator = false;
    let totalFollowers = 0;
    let platformCount = 0;

    Object.values(platforms).forEach((p: any) => {
        if (p && p.url) {
            platformCount++;
            if (p.link_in_bio?.type === 'link_aggregator') {
                hasAggregator = true;
            }
            if (typeof p.followers === 'number') totalFollowers += p.followers;
            else if (typeof p.subscribers === 'number') totalFollowers += p.subscribers;
        }
    });

    if (hasAggregator) {
        scores.content_creator += 5;
        signals.push('Link aggregator (Linktree/Stan/Beacons) detected in bios');
    }
    if (totalFollowers > 10000) {
        scores.content_creator += 3;
        scores.saas += 1;
        scores.ecommerce += 1;
        signals.push(`High follower reach: ${totalFollowers} aggregate followers`);
    }
    if (platformCount >= 3 && !hubForensics?.scrapeSuccess) {
        // Active social but no core corporate site
        scores.content_creator += 4;
        signals.push('Multiple social profiles active but no business website detected');
    }

    // ------------------------------------------
    // 6. Keywords in Description/Meta (Fallback)
    // ------------------------------------------
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
    if (combinedText.includes('creator') || combinedText.includes('influencer') || combinedText.includes('blogger') || combinedText.includes('vlog')) {
        scores.content_creator += 2;
    }

    // ------------------------------------------
    // Final Selection
    // ------------------------------------------
    let maxClass: BusinessClass = 'professional_services'; // Default fallback
    let maxScore = 0;

    for (const [key, val] of Object.entries(scores)) {
        if (val > maxScore) {
            maxScore = val;
            maxClass = key as BusinessClass;
        }
    }

    // Compute confidence (scale 0-1 based on score margin)
    const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
    const confidence = totalScore > 0 ? Math.min(0.95, maxScore / totalScore + 0.1) : 0.50;

    signals.push(`Auto-detected class as '${maxClass}' (Confidence: ${(confidence * 100).toFixed(0)}%)`);

    return {
        detected_class: maxClass,
        confidence,
        signals,
        override: null
    };
}
