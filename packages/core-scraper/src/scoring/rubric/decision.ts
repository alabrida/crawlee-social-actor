import { MechanismConfig } from '../types.js';

export const DECISION_MECHANISMS: MechanismConfig[] = [
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
    }
];
