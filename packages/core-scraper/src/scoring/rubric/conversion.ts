import { MechanismConfig } from '../types.js';

export const CONVERSION_MECHANISMS: MechanismConfig[] = [
    {
        name: 'forms_lead_capture',
        label: 'Forms & Lead Capture',
        stage: 'conversion',
        weights: { local: 2, professional_services: 3, ecommerce: 2, saas: 3, content_creator: 2, influencer: 1 },
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
        weights: { local: 1, professional_services: 1, ecommerce: 3, saas: 2, content_creator: 2, influencer: 1 },
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
        weights: { local: 3, professional_services: 2, ecommerce: 3, saas: 3, content_creator: 3, influencer: 2 },
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
        weights: { local: 1, professional_services: 3, ecommerce: 3, saas: 3, content_creator: 3, influencer: 2 },
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
        weights: { local: 2, professional_services: 2, ecommerce: 2, saas: 3, content_creator: 1, influencer: 1 },
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
    }
];
