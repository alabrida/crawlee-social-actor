/**
 * @module proxy
 * @description Centralized proxy configuration and bandwidth tracking.
 * @see G-ENV-03 — All proxy config must use this utility.
 * @see G-COST-04 — Track bandwidth to flag runs exceeding 500 MB.
 */

import { ProxyConfiguration } from 'crawlee';
import type { ProxyConfig } from '../types.js';
import { log } from './logger.js';

/** Running total of estimated proxy bandwidth consumed in bytes. */
let totalBandwidthBytes = 0;

/** Bandwidth warning threshold in bytes (500 MB). */
const BANDWIDTH_WARNING_THRESHOLD = 500 * 1024 * 1024;

/**
 * Create a ProxyConfiguration from the actor input proxy settings.
 * @param config - Proxy configuration from actor input.
 * @returns Crawlee ProxyConfiguration instance.
 */
export function createProxyConfig(config: ProxyConfig): ProxyConfiguration {
    return new ProxyConfiguration({
        useApifyProxy: config.useApifyProxy,
        apifyProxyGroups: config.apifyProxyGroups,
    });
}

/**
 * Record bandwidth consumption and log a warning if threshold is exceeded.
 * @param bytes - Number of bytes consumed by the request.
 * @returns Current total bandwidth in bytes.
 */
export function trackBandwidth(bytes: number): number {
    totalBandwidthBytes += bytes;
    if (totalBandwidthBytes > BANDWIDTH_WARNING_THRESHOLD) {
        log.warning(`Proxy bandwidth exceeded 500 MB: ${(totalBandwidthBytes / 1024 / 1024).toFixed(1)} MB used`);
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
