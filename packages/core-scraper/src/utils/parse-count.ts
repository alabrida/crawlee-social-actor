/**
 * @module utils/parse-count
 * @description Robust utility for parsing social media count strings (e.g. "1.2K", "3M", "500+") into integers.
 */

export function parseCount(raw: string | number | undefined | null): number | null {
    if (raw === undefined || raw === null) return null;
    if (typeof raw === 'number') return Math.floor(raw);

    let cleaned = raw.toString().trim().replace(/,/g, '');
    if (cleaned === '') return null;

    // Remove common suffixes like "followers", "subscribers", "likes", "+", etc.
    cleaned = cleaned.replace(/\+/g, '');
    cleaned = cleaned.replace(/subscribers?|videos?|views?|followers?|likes?|members?/gi, '').trim();

    // Check if it matches a pattern with K, M, B multipliers
    const match = cleaned.match(/^(\d+\.?\d*)([KMB]?)$/i);
    if (!match) {
        // Try searching for the first number-like pattern with optional K/M/B
        const deepMatch = cleaned.match(/(\d+\.?\d*)([KMB])/i);
        if (deepMatch) {
            const num = parseFloat(deepMatch[1]);
            const multiplier = deepMatch[2].toUpperCase();
            return applyMultiplier(num, multiplier);
        }
        const simpleMatch = cleaned.match(/(\d+)/);
        return simpleMatch ? parseInt(simpleMatch[1], 10) : null;
    }

    const num = parseFloat(match[1]);
    const multiplier = match[2].toUpperCase();
    return applyMultiplier(num, multiplier);
}

function applyMultiplier(num: number, multiplier: string): number {
    switch (multiplier) {
        case 'K': return Math.floor(num * 1_000);
        case 'M': return Math.floor(num * 1_000_000);
        case 'B': return Math.floor(num * 1_000_000_000);
        default: return Math.floor(num);
    }
}
