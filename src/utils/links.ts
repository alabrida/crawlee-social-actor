/**
 * @module utils/links
 * @description Utilities for deep-link forensics and strategy audit.
 * Owned by the Link-Strategist Agent.
 */

import { log } from './logger.js';
import { validateSafeUrl } from './security.js';

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
        let currentUrl = url;
        let response: Response;
        let finalUrlString = currentUrl;
        let redirectCount = 0;
        const MAX_REDIRECTS = 5;

        while (true) {
            // Validate URL for SSRF protection before fetching
            const safeUrl = await validateSafeUrl(currentUrl);

            response = await fetch(safeUrl.toString(), {
                method: 'GET',
                redirect: 'manual', // Prevent automatic following to intercept and validate redirects
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                }
            });

            const isRedirect = response.status >= 300 && response.status < 400;
            if (isRedirect) {
                const location = response.headers.get('location');
                if (!location) {
                    finalUrlString = currentUrl;
                    break;
                }

                redirectCount++;
                if (redirectCount > MAX_REDIRECTS) {
                    throw new Error(`Too many redirects (max ${MAX_REDIRECTS})`);
                }

                // Resolve relative redirects
                const nextUrl = new URL(location, currentUrl).toString();
                currentUrl = nextUrl;
            } else {
                finalUrlString = response.url || currentUrl;
                break;
            }
        }

        audit.redirectCount = redirectCount;
        audit.finalUrl = finalUrlString;
        audit.hasSsl = finalUrlString.startsWith('https');
        
        // Basic Linktree detection
        const linkTreeDomains = ['linktr.ee', 'beacons.ai', 'koji.to', 'linkin.bio'];
        audit.isLinkTree = linkTreeDomains.some(d => finalUrlString.includes(d));

        // UTM and Tracking detection
        const urlObj = new URL(finalUrlString);
        const params = Array.from(urlObj.searchParams.keys());
        audit.trackingParams = params.filter(p => p.startsWith('utm_') || p === 'fbclid' || p === 'gclid');
        
        audit.isOptimized = audit.trackingParams.length > 0 || audit.isLinkTree;

        log.debug(`[Link-Strategist] Audited link: ${url} -> ${finalUrlString}`);
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        log.warning(`[Link-Strategist] Link audit failed for: ${url}`, { error: msg });
    }

    return audit;
}
