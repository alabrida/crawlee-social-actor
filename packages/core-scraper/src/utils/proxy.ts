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
            log.info('Using Apify Residential proxy configuration');
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

