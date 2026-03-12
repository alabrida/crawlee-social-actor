/**
 * @module proxy
 * @description Centralized proxy configuration and bandwidth tracking.
 * Supports both Apify Cloud proxies and third-party proxy URLs.
 * @see G-ENV-03 — All proxy config must use this utility.
 * @see G-COST-04 — Track bandwidth to flag runs exceeding 500 MB.
 */

import { Actor, ProxyConfiguration } from 'apify';
import type { ProxyConfig } from '../types.js';
import { log } from './logger.js';

/** Running total of estimated proxy bandwidth consumed in bytes. */
let totalBandwidthBytes = 0;

/** Bandwidth warning threshold in bytes (500 MB). */
const BANDWIDTH_WARNING_THRESHOLD = 500 * 1024 * 1024;

/**
 * Create a ProxyConfiguration from the actor input proxy settings.
 * Uses Actor.createProxyConfiguration() for Apify proxies,
 * or raw ProxyConfiguration for third-party proxy URLs.
 * @param config - Proxy configuration from actor input.
 * @returns ProxyConfiguration instance, or undefined if no proxy.
 */
export async function createProxyConfig(
    config: ProxyConfig,
): Promise<ProxyConfiguration | undefined> {
    if (config.useApifyProxy) {
        log.info('Using Apify proxy', { groups: config.apifyProxyGroups });
        return await Actor.createProxyConfiguration({
            groups: config.apifyProxyGroups,
        });
    }

    if (config.proxyUrls && config.proxyUrls.length > 0) {
        log.info('Using third-party proxies', { count: config.proxyUrls.length });
        return new ProxyConfiguration({
            proxyUrls: config.proxyUrls,
        });
    }

    log.warning('No proxy configured — requests will use direct IP');
    return undefined;
}

/**
 * Record bandwidth consumption and log a warning if threshold is exceeded.
 * @param bytes - Number of bytes consumed by the request.
 * @returns Current total bandwidth in bytes.
 */
export function trackBandwidth(bytes: number): number {
    totalBandwidthBytes += bytes;
    if (totalBandwidthBytes > BANDWIDTH_WARNING_THRESHOLD) {
        log.warning(
            `Proxy bandwidth exceeded 500 MB: ${(totalBandwidthBytes / 1024 / 1024).toFixed(1)} MB used`,
        );
    }
    return totalBandwidthBytes;
}

/**
 * Get current bandwidth usage in bytes.
 * @returns Total bandwidth consumed so far.
 */
export function getBandwidthUsage(): number {
    return totalBandwidthBytes;
}
