/**
 * @module utils/session-vault
 * @description Manages session tokens (cookies) across runs.
 * Implements the Auth-Steward Agent responsibilities: 20-day Hard Refresh
 * and Interactive Apify Live View login flow.
 */

import { Actor } from 'apify';
import { PlaywrightCrawler, RequestQueue } from 'crawlee';
import { log } from './logger.js';
import { createProxyConfig } from './proxy.js';
import type { ProxyConfig } from '../types.js';

const VAULT_STORE_NAME = 'AUTH_SESSION_VAULT';
const MAX_AGE_DAYS = 20;

export interface VaultData {
    updatedAt: string;
    tokens: {
        linkedin?: string;
        facebook?: string;
        instagram?: string;
        twitter?: string;
        youtube?: string;
    };
}

export class SessionVault {
    private vaultData: VaultData | null = null;

    async initialize() {
        const store = await Actor.openKeyValueStore(VAULT_STORE_NAME);
        this.vaultData = await store.getValue<VaultData>('tokens');

        if (!this.vaultData) {
            this.vaultData = {
                updatedAt: new Date().toISOString(),
                tokens: {}
            };
        }
    }

    /** True when the vault holds no tokens at all (distinct from aged tokens). */
    isEmpty(): boolean {
        return !this.vaultData?.tokens || Object.keys(this.vaultData.tokens).length === 0;
    }

    /** Age of the vault tokens in whole days, or null when empty/unknown. */
    ageDays(): number | null {
        if (this.isEmpty() || !this.vaultData?.updatedAt) return null;
        const diffMs = Date.now() - new Date(this.vaultData.updatedAt).getTime();
        return Math.floor(diffMs / (1000 * 60 * 60 * 24));
    }

    /**
     * Check if the vault requires a "Hard Refresh" (older than 20 days) or is empty.
     */
    needsRefresh(): boolean {
        if (this.isEmpty()) return true;
        const age = this.ageDays();
        return age === null || age >= MAX_AGE_DAYS;
    }

    /**
     * Get the currently valid tokens.
     */
    async getTokens() {
        // Only warn about expiry when tokens actually exist and are genuinely aged.
        // An empty vault is not "expired" — it just means the run will fall back to
        // env-provided AUTH_TOKENS_* (e.g. local runs whose storage was wiped).
        if (this.isEmpty()) {
            log.info('[SessionVault] Vault is empty; falling back to env-provided auth tokens.');
        } else {
            const age = this.ageDays();
            if (age !== null && age >= MAX_AGE_DAYS) {
                log.warning(`[SessionVault] Tokens are ${age} days old (>= ${MAX_AGE_DAYS}) and may be expired. Hard refresh recommended.`);
            }
        }
        return this.vaultData?.tokens || null;
    }

    /**
     * Save new tokens to the vault.
     */
    async saveTokens(tokens: VaultData['tokens']) {
        const newData: VaultData = {
            updatedAt: new Date().toISOString(),
            tokens: {
                ...this.vaultData?.tokens,
                ...tokens
            }
        };
        const store = await Actor.openKeyValueStore(VAULT_STORE_NAME);
        await store.setValue('tokens', newData);
        this.vaultData = newData;
        log.info('[SessionVault] Tokens successfully saved to vault.');
    }

    /**
     * Launch PlaywrightCrawler in a mode to allow the user to log in interactively via Apify Live View.
     */
    async runInteractiveSetup(proxyConfig: ProxyConfig) {
        log.info('[SessionVault] Starting interactive setup. Connect to Live View to log in.');

        const proxyConfiguration = await createProxyConfig(proxyConfig);

        // Use a named request queue to isolate login state from the main crawler
        const requestQueue = await RequestQueue.open('AUTH_SETUP_QUEUE');

        // Add auth-wall URLs to queue
        await requestQueue.addRequests([
            { url: 'https://www.linkedin.com/login', label: 'linkedin' },
            { url: 'https://www.facebook.com/login', label: 'facebook' },
            { url: 'https://www.instagram.com/accounts/login/', label: 'instagram' },
            { url: 'https://twitter.com/i/flow/login', label: 'twitter' },
            { url: 'https://accounts.google.com/signin', label: 'youtube' },
        ]);

        const capturedTokens: VaultData['tokens'] = {};

        const crawler = new PlaywrightCrawler({
            requestQueue,
            proxyConfiguration: proxyConfiguration as any,
            maxConcurrency: 1,
            // Disable timeouts to allow human login
            requestHandlerTimeoutSecs: 3600,
            navigationTimeoutSecs: 3600,
            browserPoolOptions: {
                useFingerprints: true,
            },
            requestHandler: async ({ page, request, log: pwLog }) => {
                const platform = request.label as keyof VaultData['tokens'];
                pwLog.info(`[Live View] Please log into ${platform}. Watching for session cookies...`);

                const requiredCookies: Record<string, string[]> = {
                    linkedin: ['li_at'],
                    facebook: ['c_user'],
                    instagram: ['ds_user_id'],
                    twitter: ['auth_token'],
                    youtube: ['VISITOR_INFO1_LIVE'],
                };

                const required = requiredCookies[platform] || [];
                const maxWaitMs = 180000;
                const pollIntervalMs = 2000;
                let elapsedMs = 0;
                let tokenString = '';

                while (elapsedMs < maxWaitMs) {
                    const cookies = await page.context().cookies([request.url]);
                    const hasAllRequired = required.length > 0 && required.every(reqName =>
                        cookies.some(c => c.name === reqName)
                    );

                    if (hasAllRequired) {
                        const state = await page.context().storageState();
                        tokenString = JSON.stringify(state);
                        pwLog.info(`[Live View] Detected successful login for ${platform}!`);
                        break;
                    }

                    await page.waitForTimeout(pollIntervalMs);
                    elapsedMs += pollIntervalMs;
                }

                if (!tokenString) {
                    const state = await page.context().storageState();
                    tokenString = JSON.stringify(state);
                    pwLog.warning(`[Live View] Timeout reached for ${platform}. Captured available storageState.`);
                }

                capturedTokens[platform] = tokenString;
                pwLog.info(`[Live View] Captured cookies for ${platform}.`);
            }
        });

        await crawler.run();

        await this.saveTokens(capturedTokens);

        log.info('[SessionVault] Interactive setup finished. Tokens saved.');
    }
}
