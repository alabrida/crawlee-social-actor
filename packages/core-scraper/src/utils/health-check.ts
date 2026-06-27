import { log } from './logger.js';
import type { Platform } from '../types.js';

export interface HealthCheckResult {
    ok: boolean;
    error?: string;
    /**
     * True when the failure is conclusive (no cookie, or the server explicitly
     * redirected to a login/checkpoint). False for heuristic guesses (page *looks*
     * like a login wall) — those are unreliable for browser-gated platforms like
     * Facebook's mbasic, which walls bare fetches even with a valid session, and
     * should fall through to the real browser crawl rather than skip the platform.
     */
    definitive?: boolean;
}

/**
 * Account-sensitive, browser-gated platforms. A bare (non-browser) fetch carrying the
 * operator's session cookie — especially to an account-management endpoint like
 * instagram.com/accounts/edit or x.com/settings/account — from an unfamiliar IP is a
 * strong account-takeover signal and trips Meta/X "verify it's you" checkpoints against
 * the operator's own account. So we DO NOT network-probe these: a normal profile load in
 * the real browser crawl is far less suspicious, and each handler's `detectBlock` is the
 * actual gate. We still cheaply fail when there is no cookie at all (no request needed).
 */
const DEFER_TO_BROWSER_CRAWL: ReadonlySet<Platform> = new Set([
    'instagram', 'facebook', 'twitter', 'linkedin',
]);

/**
 * Validates the health of session cookies for a given platform. No network is performed:
 * the account-sensitive platforms (IG/FB/X/LinkedIn) must NOT be probed from a non-browser
 * client (see DEFER_TO_BROWSER_CRAWL), so the only safe pre-flight signal is cookie presence.
 */
export async function checkSessionHealth(
    platform: Platform,
    cookieStr: string | undefined,
): Promise<HealthCheckResult> {
    // No network probe. The only authenticated platforms we crawl are all account-sensitive
    // (DEFER_TO_BROWSER_CRAWL); probing them from a non-browser client / unfamiliar IP is the
    // very thing that trips account-protection. So the cheapest, gentlest, conclusive signal
    // is the only one we use here: a cookie is required, and that's all we can safely assert
    // pre-flight. Everything else is decided by the real browser crawl + handler detectBlock.
    if (DEFER_TO_BROWSER_CRAWL.has(platform)) {
        if (!cookieStr) {
            return { ok: false, error: 'No authentication tokens found in environment or input.', definitive: true };
        }
        log.info(`[Pre-flight] ${platform} session probe skipped (account-protection safe). Deferring validity to the browser crawl.`);
    }
    // youtube + non-authenticated platforms: nothing to validate.
    return { ok: true };
}
