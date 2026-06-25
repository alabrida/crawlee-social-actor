import { log } from './logger.js';
import { SessionVault } from './session-vault.js';
import { checkSessionHealth } from './health-check.js';
import { getExistingAssessment } from './supabase.js';
import { createProxyConfig } from './proxy.js';
import { isRedditApiEnabled } from '../api/reddit.js';
import type { ActorInput, Platform, UrlEntry } from '../types.js';

/**
 * Sets up the Session Vault, handling interactive authentication flows
 * or pulling existing session cookies into the input.
 * Supports fallback to existing Supabase data if cookie health checks fail.
 */
export async function setupSessionAndAuth(input: ActorInput): Promise<void> {
    const sessionVault = new SessionVault();
    await sessionVault.initialize();

    // Distinguish an empty vault (benign — env tokens will be used) from genuinely
    // aged tokens (the real "hard refresh" signal). Conflating the two produced a
    // false "20-day" warning on every local run, where storage (and thus the vault)
    // is wiped before each run. See SessionVault.getTokens().
    if (!sessionVault.isEmpty() && sessionVault.needsRefresh()) {
        const age = sessionVault.ageDays();
        log.warning(`Session Vault tokens are ${age ?? 'unknown'} days old and past the 20-day limit. Hard refresh recommended (run scripts/update-vault.js).`);
    }

    if (input.interactiveSessionSetup) {
        log.info('Interactive Session Setup is requested. Launching Apify Live View flow...');
        await sessionVault.runInteractiveSetup(input.proxy);
        log.info('Interactive setup complete. Sessions saved to vault.');
    }

    if (!input.authTokens) {
        const vaultTokens = await sessionVault.getTokens();
        if (vaultTokens) {
             input.authTokens = vaultTokens;
             log.info('Loaded auth tokens from Session Vault.');
        }
    }

    // Precedence: explicit input/vault tokens win where present; env fills the gaps.
    // The existing (input or vault) tokens MUST be the base of the spread — a trailing
    // `...input.authTokens` previously clobbered every env fallback above it with
    // `undefined` for any platform the vault didn't have, silently dropping fresh
    // env cookies. Per-key `|| env` now only fills slots the vault left empty.
    const existing = input.authTokens || {};
    input.authTokens = {
        ...existing,
        linkedin: existing.linkedin || process.env.AUTH_TOKENS_LINKEDIN,
        facebook: existing.facebook || process.env.AUTH_TOKENS_FACEBOOK,
        instagram: existing.instagram || process.env.AUTH_TOKENS_INSTAGRAM,
        twitter: existing.twitter || process.env.AUTH_TOKENS_X,
        youtube: existing.youtube || process.env.AUTH_TOKENS_YOUTUBE,
        tiktok: existing.tiktok || process.env.AUTH_TOKENS_TIKTOK,
        pinterest: existing.pinterest || process.env.AUTH_TOKENS_PINTEREST,
        reddit: existing.reddit || process.env.AUTH_TOKENS_REDDIT,
        google: existing.google || process.env.AUTH_TOKENS_GOOGLE,
    };

    const businessUrl = input.businessUrl || '';
    const supabaseUrl = process.env.SUPABASE_URL || input.supabaseUrl;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || input.supabaseServiceKey;
    let existingAssessment: any = null;
    if (supabaseUrl && supabaseKey && businessUrl) {
        existingAssessment = await getExistingAssessment(businessUrl, supabaseUrl, supabaseKey);
    }

    // Run the pre-flight through the same residential proxy the scrape uses, so the
    // health check shares the scrape's network path. Without this, IP-sensitive
    // platforms (Meta) wall a valid session replayed from a raw server IP, producing
    // false "expired" verdicts — and an unproxied hit on an account-settings page from
    // an unfamiliar IP is itself a strong automation signal against a fresh session.
    let healthProxy: Awaited<ReturnType<typeof createProxyConfig>> | undefined;
    try {
        healthProxy = await createProxyConfig(input.proxy, 'residential');
    } catch (e) {
        log.warning(`[Pre-flight] Could not build residential proxy for health checks; falling back to direct. ${e instanceof Error ? e.message : ''}`);
    }
    // Fresh residential exit per check — less IP correlation, gentler on the session.
    const nextProxyUrl = async (): Promise<string | undefined> => {
        try {
            return healthProxy ? await healthProxy.newUrl() : undefined;
        } catch {
            return undefined;
        }
    };

    const failedPlatforms = new Set<Platform>();
    const validatedTokenKeys = new Set<string>();

    if (input.urls) {
        const urlsToKeep: UrlEntry[] = [];
        for (const entry of input.urls) {
            const platform = entry.platform;
            if (['linkedin', 'facebook', 'instagram', 'twitter'].includes(platform)) {
                const slot = entry.sessionSlot;
                const tokenKey = slot || (platform === 'twitter' ? 'twitter' : platform);

                let isOk = true;
                if (!validatedTokenKeys.has(tokenKey)) {
                    validatedTokenKeys.add(tokenKey);
                    const token = input.authTokens?.[tokenKey];
                    const check = await checkSessionHealth(platform, token, await nextProxyUrl());
                    if (!check.ok && check.definitive) {
                        // Conclusively dead (no cookie / explicit login redirect): skip it.
                        // A single stale social cookie must never abort the whole audit.
                        isOk = false;
                        log.warning(`[Pre-flight Validation] ${platform.toUpperCase()} (${tokenKey}) session invalid: ${check.error}`);
                        if (existingAssessment?.assessment_detail?.platforms?.[platform]) {
                            log.info(`[Pre-flight Validation] Found historical data for ${platform} in database. Skipping crawl and falling back to merge.`);
                        } else {
                            log.warning(`[Pre-flight Validation] ${platform.toUpperCase()} (${tokenKey}) token invalid/expired and no historical data to merge — skipping this platform. The audit continues with the remaining platforms.`);
                        }
                        failedPlatforms.add(platform);
                    } else if (!check.ok) {
                        // Inconclusive (heuristic/network): the lightweight check can't auth
                        // browser-gated platforms like FB. Let the real browser crawl decide.
                        log.warning(`[Pre-flight Validation] ${platform.toUpperCase()} (${tokenKey}) lightweight check inconclusive (${check.error}); attempting via the full browser crawl.`);
                    }
                } else if (failedPlatforms.has(platform)) {
                    isOk = false;
                }

                if (isOk) {
                    urlsToKeep.push(entry);
                }
            } else {
                urlsToKeep.push(entry);
            }
        }
        input.urls = urlsToKeep;
    }

    if (input.platforms) {
        const platformsToKeep: Platform[] = [];
        for (const platform of input.platforms) {
            if (['linkedin', 'facebook', 'instagram', 'twitter'].includes(platform)) {
                const tokenKey = platform === 'twitter' ? 'twitter' : platform;
                let isOk = true;
                if (failedPlatforms.has(platform)) {
                    isOk = false;
                } else if (!validatedTokenKeys.has(tokenKey)) {
                    validatedTokenKeys.add(tokenKey);
                    const token = input.authTokens?.[tokenKey];
                    const check = await checkSessionHealth(platform, token, await nextProxyUrl());
                    if (!check.ok && check.definitive) {
                        isOk = false;
                        log.warning(`[Pre-flight Validation] ${platform.toUpperCase()} session invalid: ${check.error}`);
                        if (existingAssessment?.assessment_detail?.platforms?.[platform]) {
                            log.info(`[Pre-flight Validation] Found historical data for ${platform} in database. Skipping crawl and falling back to merge.`);
                        } else {
                            log.warning(`[Pre-flight Validation] ${platform.toUpperCase()} token invalid/expired and no historical data to merge — skipping this platform. The audit continues with the remaining platforms.`);
                        }
                        failedPlatforms.add(platform);
                    } else if (!check.ok) {
                        log.warning(`[Pre-flight Validation] ${platform.toUpperCase()} lightweight check inconclusive (${check.error}); attempting via the full browser crawl.`);
                    }
                }
                if (isOk) {
                    platformsToKeep.push(platform);
                }
            } else {
                platformsToKeep.push(platform);
            }
        }
        input.platforms = platformsToKeep;
    }

    // Stub Reddit until it can authenticate. Reddit (2026) rejects unauthenticated
    // `.json` scraping with a 403, and its official Data API now requires an approved
    // access request. Without OAuth creds or a session cookie, Reddit only adds noise.
    // This self-heals: the stub drops automatically once REDDIT_CLIENT_ID/SECRET (or a
    // reddit session cookie) are configured.
    const redditScrapeable = isRedditApiEnabled() || !!input.authTokens?.reddit;
    if (!redditScrapeable) {
        const hadReddit = input.urls?.some(u => u.platform === 'reddit') || input.platforms?.includes('reddit');
        if (hadReddit) {
            log.info('[Pre-flight] Reddit stubbed — no Data API credentials or session cookie configured. Add REDDIT_CLIENT_ID/SECRET (after access approval) to enable.');
        }
        if (input.urls) input.urls = input.urls.filter(u => u.platform !== 'reddit');
        if (input.platforms) input.platforms = input.platforms.filter(p => p !== 'reddit');
    }
}
