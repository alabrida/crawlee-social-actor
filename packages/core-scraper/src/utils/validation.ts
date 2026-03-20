/**
 * @module utils/validation
 * @description Utilities for sanitizing and validating input data.
 */

/**
 * Sanitize a search query to prevent injection and log manipulation.
 * Trims whitespace, removes control characters, and limits length.
 * @param query - The raw search query string.
 * @param maxLength - Maximum allowed length (default 500).
 * @returns Sanitized query string.
 */
export function sanitizeQuery(query: string, maxLength: number = 500): string {
    if (!query) return '';

    // Remove control characters (ASCII 0-31 and 127)
    // This prevents log injection and some basic exploitation attempts
    let sanitized = query.replace(/[\x00-\x1F\x7F]/g, '');

    // Trim whitespace
    sanitized = sanitized.trim();

    // Enforce maximum length
    if (sanitized.length > maxLength) {
        sanitized = sanitized.substring(0, maxLength);
    }

    return sanitized;
}
