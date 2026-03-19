/**
 * @module utils/parsers
 * @description Mathematical and temporal parsing utilities for data enrichment.
 * Owned by the Math-Steward Agent.
 */

/**
 * Convert platform shorthand strings (e.g., "1.2M", "10.5K") into pure integers.
 * @param value - The string to parse.
 * @returns The parsed integer, or 0 if parsing fails.
 */
export function parseNumericCount(value: string | number | undefined | null): number | null {
    if (value === undefined || value === null) return null;
    if (typeof value === 'number') return Math.floor(value);

    const cleanValue = value.toString().trim().toUpperCase().replace(/,/g, '');
    if (cleanValue === '') return null;

    const match = cleanValue.match(/^(\d+\.?\d*)([KMB]?)$/);

    if (!match) {
        // Try to find the first number-like pattern in a longer string (e.g. "1.2M followers")
        const deepMatch = cleanValue.match(/(\d+\.?\d*)([KMB])/);
        if (deepMatch) {
            return multiplyMultiplier(parseFloat(deepMatch[1]), deepMatch[2]);
        }
        const simpleMatch = cleanValue.match(/(\d+)/);
        return simpleMatch ? parseInt(simpleMatch[1], 10) : null;
    }

    const num = parseFloat(match[1]);
    const multiplier = match[2];

    return multiplyMultiplier(num, multiplier);
}

function multiplyMultiplier(num: number, multiplier: string): number {
    switch (multiplier) {
        case 'K': return Math.floor(num * 1_000);
        case 'M': return Math.floor(num * 1_000_000);
        case 'B': return Math.floor(num * 1_000_000_000);
        default: return Math.floor(num);
    }
}

/**
 * Calculate the delta in days between today and a target date.
 * @param dateString - ISO date string or human-readable date.
 * @returns Number of days, or null if invalid date.
 */
export function calculateDaysAgo(dateString: string | undefined | null): number | null {
    if (!dateString) return null;
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;

    const today = new Date();
    const diffTime = Math.abs(today.getTime() - date.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}
