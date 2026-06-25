/**
 * @module utils/mode-gate
 * @description Controls feature availability based on the ACTOR_MODE environment variable.
 * Silos: INTERNAL (Consultant), SAAS (Subscription), PUBLIC (Marketplace).
 */

export type ActorMode = 'INTERNAL' | 'SAAS' | 'PUBLIC';

/**
 * Returns the current operational mode of the actor.
 * Defaults to PUBLIC for safety if no mode is defined.
 */
export function getActorMode(): ActorMode {
    const mode = (process.env.ACTOR_MODE || 'PUBLIC').toUpperCase();
    return mode as ActorMode;
}

/**
 * Feature Gating Logic
 */
export const FEATURES = {
    /** Whether to perform direct Supabase upserts. */
    directUpsert: () => getActorMode() === 'INTERNAL',
    
    /** Whether to perform high-resolution revenue journey scoring. */
    revenueScoring: () => getActorMode() !== 'PUBLIC',
    
    /** Whether to extract forensic signals (SSL, Pixels, etc). */
    hubForensics: () => getActorMode() !== 'PUBLIC',
    
    /** Whether to perform deep-link strategy audits. */
    deepLinkAudit: () => getActorMode() !== 'PUBLIC',
};

/**
 * Whether to use registered-app official platform APIs (X API v2, YouTube Data API,
 * Facebook Graph, Reddit OAuth). These require platform app approvals that are not yet
 * in place, so the default interim path relies on operator-provided session tokens +
 * browser scraping. Flip OFFICIAL_APIS_ENABLED=true per-platform-approval to light them up.
 * NOTE: Google Places/Maps is provisioned and is intentionally NOT gated by this flag.
 */
export function officialApisEnabled(): boolean {
    return process.env.OFFICIAL_APIS_ENABLED === 'true';
}

/**
 * Returns a human-readable name for the current silo.
 */
export function getSiloName(): string {
    const mode = getActorMode();
    switch (mode) {
        case 'INTERNAL': return 'Consultant Audit Tool (Private)';
        case 'SAAS': return 'Revenue Journey SaaS Engine';
        case 'PUBLIC': return 'Unified Social Media Scraper (Open Marketplace)';
        default: return 'Unknown Silo';
    }
}
