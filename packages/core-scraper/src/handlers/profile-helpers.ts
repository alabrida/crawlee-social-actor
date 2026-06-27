/**
 * @module handlers/profile-helpers
 * @description Pure, testable cleaners shared by the social profile handlers. Browser tab
 * titles and og:title leak two kinds of noise into the profile name: a leading notification
 * badge ("(21) Best Buy", "(20+) Facebook") and a trailing handle/site suffix ("(@bestbuy) / X",
 * "Best Buy - YouTube"). These produced the polluted fullName values seen in the BestBuy run.
 */

const BARE_SITE_NAMES = new Set([
    'facebook', 'instagram', 'youtube', 'x', 'twitter', 'tiktok', 'pinterest', 'linkedin',
]);

/**
 * Normalize a raw profile/page name. Strips a leading notification badge and a trailing
 * handle/site suffix, and returns null when nothing but a bare site name remains (e.g. a
 * title that was really just "(20+) Facebook" — the page name never rendered).
 */
export function cleanProfileName(raw: string | null | undefined): string | null {
    if (!raw) return null;
    let s = raw.trim();
    // Leading notification badge: "(21)", "(20+)", "(1.2K)".
    s = s.replace(/^\(\s*[\d.,]+\s*\+?\s*[KMB]?\s*\)\s*/i, '');
    // Trailing "(@handle) ... / X" style suffix.
    s = s.replace(/\s*\(@[^)]+\).*$/, '');
    // Trailing site-name suffix after a separator: "- YouTube", "| Facebook", "• Instagram", "/ X".
    s = s.replace(/\s*[-|·•/]\s*(youtube|facebook|instagram|x|twitter|tiktok|pinterest|linkedin)\s*$/i, '');
    s = s.trim();
    if (!s || BARE_SITE_NAMES.has(s.toLowerCase())) return null;
    return s;
}

/**
 * YouTube's verified badge is unreliable to detect from the rendered DOM (lazy-loaded icon
 * with a churn-prone aria-label). ytInitialData, already in the served HTML, carries a stable
 * marker — a passive read, no extra automation.
 */
export function detectYoutubeVerifiedFromHtml(html: string): boolean {
    return /BADGE_STYLE_TYPE_VERIFIED(?:_ARTIST)?/.test(html);
}
