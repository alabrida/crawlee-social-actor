import { describe, it, expect } from 'vitest';
import { detectChatProvider, detectEcommercePlatform, sectionCount, BLOG_LINK_RE, CASE_STUDY_LINK_RE } from '../general-forensics.js';

describe('detectChatProvider', () => {
    it('names the real provider, not always intercom', () => {
        expect(detectChatProvider('<script src="https://static.zdassets.com/zendesk.js"></script>')).toBe('Zendesk');
        expect(detectChatProvider('<script src="https://widget.intercom.io/x"></script>')).toBe('Intercom');
    });
    it('returns null when no chat widget present', () => {
        expect(detectChatProvider('<html><body>Hello world</body></html>')).toBeNull();
    });
    it('does not false-positive on the word "drift" in copy', () => {
        expect(detectChatProvider('<p>Our strategy avoids scope drift and stays focused.</p>')).toBeNull();
    });
});

describe('detectEcommercePlatform', () => {
    it('detects Shopify from a scoped script src', () => {
        expect(detectEcommercePlatform('<script src="https://cdn.shopify.com/s/files/app.js"></script>')).toBe('Shopify');
    });
    it('detects WooCommerce from its plugin path', () => {
        expect(detectEcommercePlatform('<link href="/wp-content/plugins/woocommerce/assets/css/woocommerce.css">')).toBe('WooCommerce');
    });
    // Regression: the word "magento" appearing somewhere in page copy must NOT identify the
    // platform (the Best Buy false-positive). Only scoped meta/script markers count.
    it('does NOT mis-ID Magento from a bare word in copy', () => {
        expect(detectEcommercePlatform('<p>We migrated off Magento years ago.</p>')).toBeNull();
    });
    it('detects Magento only from a generator meta or scoped asset path', () => {
        expect(detectEcommercePlatform('<meta name="generator" content="Magento 2.4">')).toBe('Magento');
    });
    it('returns null for a custom stack with no platform markers', () => {
        expect(detectEcommercePlatform('<html><body><a href="/cart">Cart</a></body></html>')).toBeNull();
    });
});

describe('sectionCount (no fabricated counts)', () => {
    const blogLinks = ['https://x.com/blog/post-one', 'https://x.com/blog/post-two', 'https://x.com/about'];
    it('not detected -> 0', () => {
        expect(sectionCount(false, blogLinks, BLOG_LINK_RE)).toBe(0);
    });
    it('detected with real links -> true count (not a hardcoded 5)', () => {
        expect(sectionCount(true, blogLinks, BLOG_LINK_RE)).toBe(2);
    });
    it('detected but no countable entries -> null (never a fabricated value)', () => {
        expect(sectionCount(true, ['https://x.com/about'], BLOG_LINK_RE)).toBeNull();
    });
    it('case-study links are counted from real portfolio/case-study paths', () => {
        expect(sectionCount(true, ['https://x.com/case-studies/acme', 'https://x.com/portfolio/widget'], CASE_STUDY_LINK_RE)).toBe(2);
    });
});
