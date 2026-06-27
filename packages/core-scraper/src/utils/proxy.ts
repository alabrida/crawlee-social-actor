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

/** Fallback country of origin when neither originCountry nor apifyProxyCountry is set. */
const DEFAULT_ORIGIN_COUNTRY = 'US';

/**
 * The country the account-sensitive residential crawl must exit from. Locking this keeps the
 * operator's session cookies on a consistent geography; a foreign exit reads as a suspicious
 * login to Meta/X. Precedence: explicit originCountry -> apifyProxyCountry -> US default.
 */
export function resolveOriginCountry(config: ProxyConfig): string {
    return (config.originCountry || config.apifyProxyCountry || DEFAULT_ORIGIN_COUNTRY).toUpperCase();
}

export async function createProxyConfig(
    config: ProxyConfig,
    type: 'datacenter' | 'residential' | 'auto' = 'auto',
): Promise<ProxyConfiguration | undefined> {
    if (config.useApifyProxy) {
        let groups: string[] | undefined = config.apifyProxyGroups;
        if (type === 'datacenter') {
            groups = groups ? groups.filter(g => g !== 'RESIDENTIAL') : undefined;
            if (groups && groups.length === 0) {
                groups = undefined;
            }
            log.info('Using Apify Datacenter proxy configuration');
        } else if (type === 'residential') {
            groups = ['RESIDENTIAL'];
            // Lock the residential (account-authenticated) path to one country of origin so
            // the operator's session cookies always exit from the expected geography.
            const originCountry = resolveOriginCountry(config);
            log.info(`Using Apify Residential proxy configuration locked to country of origin: ${originCountry}`);
            return await Actor.createProxyConfiguration({ groups, countryCode: originCountry as any });
        } else {
            log.info('Using Apify proxy', { groups });
        }

        return await Actor.createProxyConfiguration({
            groups,
            countryCode: config.apifyProxyCountry as any,
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

