/**
 * @module utils/session-vault
 * @description Vault Scaffold for managing the Session Lifecycle.
 * Implements the 20-day "Hard Refresh" logic and interfaces with Apify Key-Value Store.
 */

import { Actor } from 'apify';
import { log } from './logger.js';
import type { Platform } from '../types.js';

const SESSION_VAULT_KEY = 'AUTH_SESSION_VAULT';
const MAX_SESSION_AGE_DAYS = 20;

export interface VaultCookie {
    name: string;
    value: string;
    domain: string;
    path: string;
}

export interface PlatformSession {
    platform: Platform;
    cookies: VaultCookie[];
    updatedAt: string;
    expiresAt: string;
}

export interface SessionVaultData {
    sessions: Record<string, PlatformSession>;
}

/**
 * Retrieves the Session Vault from the Apify Key-Value Store.
 * @returns The current session vault data.
 */
export async function getSessionVault(): Promise<SessionVaultData> {
    const store = await Actor.openKeyValueStore();
    const vault = await store.getValue<SessionVaultData>(SESSION_VAULT_KEY);

    if (!vault) {
        return { sessions: {} };
    }

    return vault;
}

/**
 * Saves the Session Vault to the Apify Key-Value Store.
 * @param vault - The session vault data to save.
 */
export async function saveSessionVault(vault: SessionVaultData): Promise<void> {
    const store = await Actor.openKeyValueStore();
    await store.setValue(SESSION_VAULT_KEY, vault);
    log.info('Session Vault saved successfully.');
}

/**
 * Stores cookies for a specific platform in the Session Vault.
 * Calculates expiration based on the MAX_SESSION_AGE_DAYS constant.
 * @param platform - The platform identifier.
 * @param cookies - Array of cookies to store.
 */
export async function storePlatformSession(platform: Platform, cookies: VaultCookie[]): Promise<void> {
    const vault = await getSessionVault();

    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(now.getDate() + MAX_SESSION_AGE_DAYS);

    vault.sessions[platform] = {
        platform,
        cookies,
        updatedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
    };

    await saveSessionVault(vault);
    log.info(`Stored new session for ${platform} in Vault. Expires at ${expiresAt.toISOString()}.`);
}

/**
 * Retrieves valid cookies for a platform from the Session Vault.
 * Checks if the session has expired (older than MAX_SESSION_AGE_DAYS).
 * @param platform - The platform identifier.
 * @returns Array of valid cookies, or null if expired/not found.
 */
export async function getPlatformCookies(platform: Platform): Promise<VaultCookie[] | null> {
    const vault = await getSessionVault();
    const session = vault.sessions[platform];

    if (!session) {
        return null;
    }

    const now = new Date();
    const expiresAt = new Date(session.expiresAt);

    if (now > expiresAt) {
        log.warning(`[Session Vault] The session for ${platform} has expired (older than ${MAX_SESSION_AGE_DAYS} days). A manual refresh is required.`);
        return null;
    }

    return session.cookies;
}

/**
 * Calculates and logs the health of all sessions in the vault.
 * Useful for the health dashboard output.
 * @returns An object containing session health metrics.
 */
export async function checkSessionHealth(): Promise<Record<string, any>> {
    const vault = await getSessionVault();
    const health: Record<string, any> = {};
    const now = new Date();

    for (const [platform, session] of Object.entries(vault.sessions)) {
        const expiresAt = new Date(session.expiresAt);
        const daysRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        health[platform] = {
            status: daysRemaining > 0 ? 'active' : 'expired',
            daysRemaining: Math.max(0, daysRemaining),
            updatedAt: session.updatedAt,
        };

        if (daysRemaining <= 3 && daysRemaining > 0) {
            log.warning(`[Session Vault] The session for ${platform} will expire in ${daysRemaining} days. Consider a manual refresh soon.`);
        } else if (daysRemaining <= 0) {
            log.error(`[Session Vault] The session for ${platform} has EXPIRED. A manual refresh is required immediately.`);
        } else {
            log.info(`[Session Vault] ${platform} session is healthy. ${daysRemaining} days remaining.`);
        }
    }

    return health;
}
