/**
 * @module utils/links
 * @description Utilities for deep-link forensics and strategy audit.
 * Owned by the Link-Strategist Agent.
 */

import { log } from './logger.js';

export interface LinkAudit {
    originalUrl: string;
    finalUrl: string;
    redirectCount: number;
    isOptimized: boolean;
    trackingParams: string[];
    isLinkTree: boolean;
    hasSsl: boolean;
}

/**
 * Audit a link by following its redirection chain.
 * @param url - The URL to audit.
 * @returns LinkAudit result.
 */
export async function auditLink(url: string): Promise<LinkAudit> {
    const audit: LinkAudit = {
        originalUrl: url,
        finalUrl: url,
        redirectCount: 0,
        isOptimized: false,
        trackingParams: [],
        isLinkTree: false,
        hasSsl: false,
    };

    try {
        const response = await fetch(url, {
            method: 'GET',
            redirect: 'follow',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            }
        });

        audit.finalUrl = response.url;
        audit.hasSsl = response.url.startsWith('https');
        
        // Basic Linktree detection
        const linkTreeDomains = ['linktr.ee', 'beacons.ai', 'koji.to', 'linkin.bio'];
        audit.isLinkTree = linkTreeDomains.some(d => response.url.includes(d));

        // UTM and Tracking detection
        const urlObj = new URL(response.url);
        const params = Array.from(urlObj.searchParams.keys());
        audit.trackingParams = params.filter(p => p.startsWith('utm_') || p === 'fbclid' || p === 'gclid');
        
        audit.isOptimized = audit.trackingParams.length > 0 || audit.isLinkTree;

        log.debug(`[Link-Strategist] Audited link: ${url} -> ${response.url}`);
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        log.warning(`[Link-Strategist] Link audit failed for: ${url}`, { error: msg });
    }

    return audit;
}
