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

    /**
     * Check if the vault requires a "Hard Refresh" (older than 20 days).
     */
    needsRefresh(): boolean {
        if (!this.vaultData?.updatedAt) return true;
        const updatedDate = new Date(this.vaultData.updatedAt);
        const today = new Date();
        const diffTime = Math.abs(today.getTime() - updatedDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays >= MAX_AGE_DAYS;
    }

    /**
     * Get the currently valid tokens.
     */
    async getTokens() {
        if (this.needsRefresh()) {
            log.warning('[SessionVault] Tokens are older than 20 days and may be expired.');
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

        // As per memory, use default unnamed request queue for login
        const requestQueue = await RequestQueue.open();

        // Add auth-wall URLs to queue
        await requestQueue.addRequests([
            { url: 'https://www.linkedin.com/login', label: 'linkedin' },
            { url: 'https://www.facebook.com/login', label: 'facebook' },
            { url: 'https://www.instagram.com/accounts/login/', label: 'instagram' },
            { url: 'https://twitter.com/i/flow/login', label: 'twitter' },
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
                pwLog.info(`[Live View] Please log into ${platform}. Waiting 3 minutes...`);

                // Allow user 3 minutes per platform to login
                await page.waitForTimeout(180000);

                const cookies = await page.context().cookies();

                // Convert cookies back to a token string for simple storage
                const tokenString = cookies.map(c => `${c.name}=${c.value}`).join('; ');
                capturedTokens[platform] = tokenString;

                pwLog.info(`[Live View] Captured cookies for ${platform}.`);
            }
        });

        await crawler.run();

        await this.saveTokens(capturedTokens);

        log.info('[SessionVault] Interactive setup finished. Tokens saved.');
    }
}
