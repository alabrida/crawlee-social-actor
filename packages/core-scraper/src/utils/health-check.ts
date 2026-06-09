import { log } from './logger.js';
import type { Platform } from '../types.js';

export interface HealthCheckResult {
    ok: boolean;
    error?: string;
}

/**
 * Validates the health of session cookies for a given platform.
 */
export async function checkSessionHealth(
    platform: Platform,
    cookieStr: string | undefined
): Promise<HealthCheckResult> {
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

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
            return { ok: false, error: 'No authentication tokens found in environment or input.' };
        }

        log.info(`[Pre-flight] Checking session health for platform: ${platform}`);
        const res = await fetch(url, {
            headers: {
                'User-Agent': userAgent,
                'Cookie': cookieStr
            },
            redirect: 'manual'
        });

        const redirectUrl = res.headers.get('location');
        const isRedirect = res.status === 301 || res.status === 302 || res.status === 303 || res.status === 307 || res.status === 308;

        if (isRedirect && redirectUrl) {
            const lowerRedirect = redirectUrl.toLowerCase();
            if (lowerRedirect.includes('login') || lowerRedirect.includes('checkpoint') || lowerRedirect.includes('signup') || lowerRedirect.includes('challenge')) {
                return { ok: false, error: `Session expired. Redirected to login wall: ${redirectUrl}` };
            }
        }

        if (res.status === 200) {
            let text = '';
            try {
                text = await res.text();
            } catch (_) {}

            const lowerText = text.toLowerCase();
            if (lowerText.includes('login') && lowerText.includes('password') && text.length < 15000) {
                return { ok: false, error: 'Login wall detected in page body.' };
            }
        }

        log.info(`[Pre-flight] Session for ${platform} is healthy.`);
        return { ok: true };
    } catch (e: any) {
        return { ok: false, error: `Connection failed during pre-flight check: ${e.message}` };
    }
}
