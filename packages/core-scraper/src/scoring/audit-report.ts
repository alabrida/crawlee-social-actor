/**
 * @module scoring/audit-report
 * @description Builds a per-assessment audit report so degraded/low-confidence scores are
 * visible and a human can spot-check them. For each scored mechanism it records the score,
 * the human evidence, the raw hub/platform signal it read, and a needs_review flag — so a
 * false negative (e.g. ecommerce_checkout=0 on a degraded crawl) is surfaced, not hidden.
 */

import type { ScoredMechanism } from './types.js';
import { MECHANISMS } from './rubric.js';
import { assessCrawlQuality, type CrawlQuality } from './crawl-quality.js';

/** Classifier confidence below this is flagged as a low-confidence classification. */
export const LOW_CONFIDENCE = 0.55;

interface SignalSource {
    hub?: string[];
    platforms?: string[]; // platform keys, or ['*'] for "all active profiles"
}

/** Which hub fields / platform keys each mechanism reads (for raw_signal traceability). */
const MECHANISM_SOURCES: Record<string, SignalSource> = {
    website_ssl: { hub: ['ssl.present', 'performance.ttfb_ms', 'scrapeSuccess'] },
    seo_foundations: { hub: ['seo.meta_description', 'seo.canonical', 'seo.json_ld.present'] },
    analytics_tracking: { hub: ['analytics.google_analytics', 'analytics.tag_manager', 'analytics.intent_pixels', 'analytics.facebook_pixel'] },
    serp_discoverability: {},
    gbp_presence: { platforms: ['google_business_profile', 'google_maps'] },
    social_presence: { platforms: ['*'] },
    follower_reach: { platforms: ['*'] },
    content_marketing: { hub: ['blog.detected', 'blog.post_count', 'blog.days_since_post'] },
    reviews_ratings: { platforms: ['google_business_profile', 'google_maps', 'facebook'] },
    case_studies: { hub: ['case_studies.detected', 'case_studies.count'] },
    testimonials: { hub: ['testimonials.detected', 'testimonials.has_named_source', 'testimonials.count'] },
    content_recency: { platforms: ['*'] },
    authority_signals: { platforms: ['*'] },
    external_link_quality: { platforms: ['*'] },
    linkedin_presence: { platforms: ['linkedin'] },
    pricing_transparency: { hub: ['pricing.detected', 'pricing.has_tiers', 'pricing.tier_count'] },
    booking_cta: { hub: ['booking.detected', 'booking.provider', 'forms.types'], platforms: ['*'] },
    contact_accessibility: { hub: ['contact_info.phone', 'contact_info.email', 'forms.count'], platforms: ['google_business_profile'] },
    privacy_compliance: { hub: ['privacy.detected', 'cookie_consent.detected'] },
    platform_decision_signals: { platforms: ['instagram', 'youtube', 'tiktok', 'facebook'] },
    forms_lead_capture: { hub: ['forms.count', 'forms.types'] },
    ecommerce_checkout: { hub: ['ecommerce.detected', 'ecommerce.platform', 'ecommerce.has_cart', 'ecommerce.has_checkout'] },
    mobile_optimization: { hub: ['mobile.viewport_meta', 'mobile.responsive', 'performance.ttfb_ms'] },
    email_newsletter_capture: { hub: ['forms.types'], platforms: ['linkedin'] },
    chat_realtime: { hub: ['chat.detected', 'chat.provider'] },
    content_consistency: { platforms: ['*'] },
    cross_platform_connectivity: { hub: ['social_links'], platforms: ['*'] },
    community_presence: { hub: ['social_links'], platforms: ['reddit', 'youtube'] },
    gbp_review_engagement: { platforms: ['google_business_profile', 'google_maps'] },
    content_organization: { platforms: ['youtube', 'pinterest', 'instagram', 'linkedin'] },
};

const STAGE_BY_NAME: Record<string, string> = Object.fromEntries(MECHANISMS.map(m => [m.name, m.stage]));

function getPath(obj: any, path: string): any {
    return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

function resolveRawSignal(src: SignalSource, hub: any, platforms: Record<string, any>): Record<string, any> {
    const out: Record<string, any> = {};
    for (const p of src.hub || []) out[`hub.${p}`] = getPath(hub, p);
    if (src.platforms?.includes('*')) {
        out['platforms.active'] = Object.keys(platforms || {}).filter(k => platforms[k]?.url);
    } else {
        for (const k of src.platforms || []) out[`platforms.${k}`] = platforms?.[k] ? 'present' : 'absent';
    }
    return out;
}

export interface AuditedMechanism {
    name: string;
    label: string;
    stage: string;
    score: number;
    max: number;
    evidence: string | null;
    recommendation: string | null;
    raw_signal: Record<string, any>;
    needs_review: boolean;
    review_reason: string | null;
}

export interface AuditReport {
    crawl_quality: CrawlQuality;
    classifier_confidence: number;
    low_confidence_classification: boolean;
    needs_review_count: number;
    mechanisms: AuditedMechanism[];
}

export function buildAuditReport(
    scored: ScoredMechanism[],
    hub: any,
    platforms: Record<string, any>,
    classifierConfidence: number,
): AuditReport {
    const crawl_quality = assessCrawlQuality(hub);
    const crawlBad = crawl_quality.status !== 'ok';

    const mechanisms: AuditedMechanism[] = scored.map(m => {
        const src = MECHANISM_SOURCES[m.name] || {};
        const readsHub = (src.hub?.length || 0) > 0;
        const raw_signal = resolveRawSignal(src, hub, platforms);

        let needs_review = false;
        let review_reason: string | null = null;
        if (crawlBad && readsHub) {
            needs_review = true;
            review_reason = `Crawl ${crawl_quality.status} — this hub-derived ${m.score === 0 ? 'zero may be a false negative' : 'reading may be unreliable'}`;
        }

        return {
            name: m.name,
            label: m.label,
            stage: STAGE_BY_NAME[m.name] || 'unknown',
            score: m.score,
            max: m.max,
            evidence: m.evidence,
            recommendation: m.recommendation,
            raw_signal,
            needs_review,
            review_reason,
        };
    });

    return {
        crawl_quality,
        classifier_confidence: classifierConfidence,
        low_confidence_classification: classifierConfidence < LOW_CONFIDENCE,
        needs_review_count: mechanisms.filter(x => x.needs_review).length,
        mechanisms,
    };
}
