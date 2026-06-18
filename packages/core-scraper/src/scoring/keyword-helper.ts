import { BusinessClass } from './types.js';

/**
 * Resolves the best SERP data from multiple scraped results (the one with the lowest positive rank).
 */
export function resolveBestSerp(serpResults: any[]): any {
    let bestSerpData: any = null;
    let bestRank: number | null = null;
    
    serpResults.forEach(res => {
        if (res) {
            const r = res.serpRankingPosition;
            if (typeof r === 'number') {
                if (bestRank === null || r < bestRank) {
                    bestRank = r;
                    bestSerpData = res;
                }
            }
        }
    });

    if (!bestSerpData && serpResults.length > 0) {
        bestSerpData = serpResults[0];
    }
    return bestSerpData;
}

/**
 * Generates recommended keywords based on business class and brand name.
 */
export function generateRecommendedKeywords(bizClass: BusinessClass, brandName: string): string[] {
    const cleanBrand = brandName.split(/[|:-]/)[0].trim();
    if (bizClass === 'saas') {
        return [`${cleanBrand} pricing`, `${cleanBrand} reviews`, `${cleanBrand} software`];
    }
    if (bizClass === 'local') {
        return [`${cleanBrand} near me`, `best ${cleanBrand}`, `visit ${cleanBrand}`];
    }
    if (bizClass === 'professional_services') {
        return [`${cleanBrand} consulting`, `${cleanBrand} services`, `B2B consulting`];
    }
    return [`${cleanBrand} content`, `${cleanBrand} channel`, `${cleanBrand} official`];
}
