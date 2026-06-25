import { ProxyAgent } from 'undici';
import { log } from './logger.js';
import type { Platform } from '../types.js';
import { getCookieHeaderString } from './auth.js';
import { getRandomUserAgent } from './ua-rotation.js';

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
 * Validates the health of session cookies for a given platform.
 *
 * @param proxyUrl - Optional proxy URL. The check MUST share the scrape's network
 *   path: IP-sensitive platforms (notably Meta) serve a login wall to a valid session
 *   cookie replayed from an unfamiliar/datacenter IP, producing false "expired"
 *   verdicts. Routing through the same residential proxy fixes that and is gentler on
 *   a freshly-issued session.
 */
export async function checkSessionHealth(
    platform: Platform,
    cookieStr: string | undefined,
    proxyUrl?: string
): Promise<HealthCheckResult> {
    const userAgent = getRandomUserAgent();
    const dispatcher = proxyUrl ? new ProxyAgent(proxyUrl) : undefined;

    try {
        let url = '';
        if (platform === 'linkedin') {
            url = 'https://www.linkedin.com/feed/';
        } else if (platform === 'facebook') {
            url = 'https://mbasic.facebook.com/profile.php';
        } else if (platform === 'instagram') {
            url = 'https://www.instagram.com/accounts/edit/';
        } else if (platform === 'twitter') {
            url = 'https://x.com/settings/account';
        } else if (platform === 'youtube') {
            // YouTube visitor cookies are anonymous and do not require login verification
            return { ok: true };
        } else {
            // Other platforms do not require authentication
            return { ok: true };
        }

        if (!cookieStr) {
            return { ok: false, error: 'No authentication tokens found in environment or input.', definitive: true };
        }

        log.info(`[Pre-flight] Checking session health for platform: ${platform}${proxyUrl ? ' (via proxy)' : ''}`);
        const cookieHeader = getCookieHeaderString(cookieStr);
        const res = await fetch(url, {
            headers: {
                'User-Agent': userAgent,
                'Cookie': cookieHeader
            },
            redirect: 'manual',
            // `dispatcher` is an undici (Node fetch) extension not in the DOM types.
            ...(dispatcher ? { dispatcher } : {}),
        } as RequestInit);

        const redirectUrl = res.headers.get('location');
        const isRedirect = res.status >= 300 && res.status < 400;

        if (isRedirect && redirectUrl) {
            const lowerRedirect = redirectUrl.toLowerCase();
            if (lowerRedirect.includes('login') || lowerRedirect.includes('checkpoint') || lowerRedirect.includes('signup') || lowerRedirect.includes('challenge')) {
                return { ok: false, error: `Session expired. Redirected to login wall: ${redirectUrl}`, definitive: true };
            }
        }

        if (res.status === 200) {
            let text = '';
            try {
                text = await res.text();
            } catch (_) {}

            const lowerText = text.toLowerCase();
            if (lowerText.includes('login') && lowerText.includes('password') && text.length < 15000) {
                // Heuristic only — browser-gated platforms (FB mbasic) wall bare fetches
                // even with a valid session. Not conclusive; let the browser crawl decide.
                return { ok: false, error: 'Login wall heuristic matched in page body (non-conclusive).', definitive: false };
            }
        }

        log.info(`[Pre-flight] Session for ${platform} is healthy.`);
        return { ok: true };
    } catch (e: any) {
        // Network/proxy hiccup — not a verdict on the session. Let the crawl proceed.
        return { ok: false, error: `Connection failed during pre-flight check: ${e.message}`, definitive: false };
    }
}
