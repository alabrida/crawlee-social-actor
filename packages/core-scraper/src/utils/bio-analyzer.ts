/**
 * @module utils/bio-analyzer
 * @description Analyzes social profile bios/descriptions for key business signals (authority, conversion call-to-actions, and revenue models).
 */

export interface BioAnalysis {
    bioText: string;
    conversionSignals: string[];
    authoritySignals: string[];
    revenueModelSignals: string[];
    hasConversionCta: boolean;
    hasAuthorityProof: boolean;
    hasClearRevenueModel: boolean;
}

const CONVERSION_KEYWORDS = [
    { label: 'Shop/Store', pattern: /\b(shop|store|buy|purchase|catalog|merch)\b/i },
    { label: 'Booking', pattern: /\b(book|reserve|schedule|calendly|appointment|call)\b/i },
    { label: 'Direct Message', pattern: /\b(dm|message|inbox)\b/i },
    { label: 'Link CTA', pattern: /\b(link\s*(in|below|bio|here)|click\s*here)\b/i },
    { label: 'Promotion/Code', pattern: /\b(code|coupon|discount|off|promo|sale)\b/i },
    { label: 'Lead Magnet', pattern: /\b(free\s*(consultation|guide|template|ebook|pdf|webinar|class))\b/i },
    { label: 'Contact Info', pattern: /\b(contact|email|phone|call\s*us|whatsapp)\b/i },
    { label: 'Onboarding CTA', pattern: /\b(get\s*started|apply\s*now|hire\s*me|join\s*free)\b/i }
];

const AUTHORITY_KEYWORDS = [
    { label: 'Certification', pattern: /\b(certified|certification|pmp|gcp|aws|salesforce|licensed)\b/i },
    { label: 'Social Proof', pattern: /\b(award-winning|featured\s*in|press|recommended|trusted)\b/i },
    { label: 'Expert Role', pattern: /\b(speaker|author|expert|specialist|consultant|architect|strategist|advisor)\b/i },
    { label: 'Experience', pattern: /\b(\d+\s*\+?\s*years?\s*exp(erience)?|industry\s*leader)\b/i },
    { label: 'Founder', pattern: /\b(founder|co-founder|ceo|owner|creator\s*of)\b/i }
];

const REVENUE_MODEL_KEYWORDS = [
    { label: 'Subscription', pattern: /\b(subscribe|subscription|monthly|patreon|subscribestar|onlyfans|substack|newsletter)\b/i },
    { label: 'E-Learning', pattern: /\b(course|academy|class|masterclass|coaching|mentorship|training|bootcamp)\b/i },
    { label: 'Digital Products', pattern: /\b(template|ebook|preset|kit|asset|digital\s*product|download)\b/i },
    { label: 'SaaS/Software', pattern: /\b(saas|software|app|tool|platform|extension)\b/i },
    { label: 'Physical Products', pattern: /\b(shipping|delivery|worldwide\s*shipping|handmade|crafted)\b/i },
    { label: 'Services', pattern: /\b(agency|services|consulting|freelance|contract|outsourcing)\b/i }
];

/**
 * Analyzes bio/description text for conversion, authority, and revenue model signals.
 * @param bio - The bio or description string to analyze.
 */
export function analyzeBio(bio: string | undefined | null): BioAnalysis {
    const text = bio || '';
    const conversionSignals: string[] = [];
    const authoritySignals: string[] = [];
    const revenueModelSignals: string[] = [];

    if (!text.trim()) {
        return {
            bioText: '',
            conversionSignals: [],
            authoritySignals: [],
            revenueModelSignals: [],
            hasConversionCta: false,
            hasAuthorityProof: false,
            hasClearRevenueModel: false
        };
    }

    // 1. Scan for Conversion Signals
    for (const item of CONVERSION_KEYWORDS) {
        if (item.pattern.test(text)) {
            conversionSignals.push(item.label);
        }
    }

    // 2. Scan for Authority Proofs
    for (const item of AUTHORITY_KEYWORDS) {
        if (item.pattern.test(text)) {
            authoritySignals.push(item.label);
        }
    }

    // 3. Scan for Revenue Model Signals
    for (const item of REVENUE_MODEL_KEYWORDS) {
        if (item.pattern.test(text)) {
            revenueModelSignals.push(item.label);
        }
    }

    return {
        bioText: text,
        conversionSignals,
        authoritySignals,
        revenueModelSignals,
        hasConversionCta: conversionSignals.length > 0,
        hasAuthorityProof: authoritySignals.length > 0,
        hasClearRevenueModel: revenueModelSignals.length > 0
    };
}
