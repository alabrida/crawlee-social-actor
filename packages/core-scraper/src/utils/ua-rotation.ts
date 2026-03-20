/**
 * @module ua-rotation
 * @description User-Agent string rotation utility.
 * @see G-BOT-03 — UA strings must rotate from a curated list.
 */

/** Curated list of recent desktop browser User-Agent strings. */
const USER_AGENTS: readonly string[] = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:134.0) Gecko/20100101 Firefox/134.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:134.0) Gecko/20100101 Firefox/134.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
] as const;

/**
 * Get a random User-Agent string from the curated list.
 * @returns A randomly selected User-Agent string.
 */
export function getRandomUserAgent(): string {
    const index = Math.floor(Math.random() * USER_AGENTS.length);
    return USER_AGENTS[index];
}

/**
 * Get the full list of curated User-Agent strings.
 * @returns The complete UA list.
 */
export function getUserAgentList(): readonly string[] {
    return USER_AGENTS;
}
