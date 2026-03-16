/**
 * @module utils/enrichment
 * @description Master utility for Phase 2 data enrichment.
 * Orchestrates Math-Steward, Link-Strategist, and forensic mappings.
 */

import { parseNumericCount } from './parsers.js';
import { auditLink } from './links.js';
import { FEATURES } from './mode-gate.js';
import type { ScrapedItem } from '../types.js';
import { log } from './logger.js';

/**
 * Enrich a scraped item with high-resolution structured data.
 * @param item - The raw scraped item.
 * @returns The enriched scraped item.
 */
export async function enrichItem(item: ScrapedItem): Promise<ScrapedItem> {
    const { platform, data } = item;
    const { revenueIndicators } = data;

    log.info(`[Enrichment] Processing ${platform}: ${item.url}`);

    // 1. Numeric Enrichment (Math-Steward)
    const enrichedData: any = { ...data };
    const revIndicators = revenueIndicators as any;
    
    if (revIndicators && revIndicators.conversionMarkers) {
        revIndicators.conversionMarkers.forEach((marker: string) => {
            if (marker.includes('Followers Raw:')) {
                enrichedData.followerCount = parseNumericCount(marker.split(':')[1]);
            }
            if (marker.includes('Following Raw:')) {
                enrichedData.followingCount = parseNumericCount(marker.split(':')[1]);
            }
            // Google Business Profile (GBP) High-Res Mapping
            if (platform === 'google_maps' || platform === 'google_business_profile') {
                if (marker.includes('Title:')) enrichedData.gbpBusinessName = marker.split('Title:')[1].trim();
                if (marker.includes('Category:')) enrichedData.gbpCategory = marker.split('Category:')[1].trim();
                if (marker.includes('Rating:')) enrichedData.gbpRating = parseFloat(marker.split('Rating:')[1].trim());
                if (marker.includes('Reviews:')) enrichedData.gbpReviewsCount = parseNumericCount(marker.split('Reviews:')[1].trim());
                if (marker.includes('Phone:')) enrichedData.gbpPhone = marker.split('Phone:')[1].trim();
                if (marker.includes('Address:')) enrichedData.gbpAddress = marker.split('Address:')[1].trim();
                if (marker.includes('Signal: Has Photos')) enrichedData.gbpHasPhotos = true;
            }
        });
    }

    // 2. Link Enrichment (Link-Strategist) - Gated for non-public modes
    if (FEATURES.deepLinkAudit() && revIndicators && revIndicators.links && revIndicators.links.length > 0) {
        const primaryLink = revIndicators.links[0];
        const audit = await auditLink(primaryLink);
        enrichedData.linkAudit = audit;
        
        enrichedData.isLinkOptimized = audit.isOptimized;
        enrichedData.isLinkTreeUsed = audit.isLinkTree;
    }

    // 3. Privacy Gate: Remove forensic details for public marketplace mode
    if (!FEATURES.revenueScoring()) {
        delete enrichedData.forensics;
        // Keep the record lean for public users
    }

    enrichedData.scrapeDate = item.scrapedAt;
    enrichedData.humanAssessment = null;

    return {
        ...item,
        data: enrichedData
    };
}
