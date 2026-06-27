import { describe, it, expect } from 'vitest';
import { cleanProfileName, detectYoutubeVerifiedFromHtml } from '../profile-helpers.js';

describe('cleanProfileName', () => {
    it('strips a leading notification badge (the X "(21) Best Buy" pollution)', () => {
        expect(cleanProfileName('(21) Best Buy (@BestBuy) / X')).toBe('Best Buy');
        expect(cleanProfileName('(1.2K) Acme Co')).toBe('Acme Co');
    });
    it('returns null when only a bare site name remains (the FB "(20+) Facebook" pollution)', () => {
        expect(cleanProfileName('(20+) Facebook')).toBeNull();
        expect(cleanProfileName('Instagram')).toBeNull();
    });
    it('strips a trailing site suffix', () => {
        expect(cleanProfileName('Best Buy - YouTube')).toBe('Best Buy');
        expect(cleanProfileName('Best Buy • Instagram')).toBe('Best Buy');
    });
    it('keeps a clean name and a real multi-word title untouched', () => {
        expect(cleanProfileName('Best Buy')).toBe('Best Buy');
        expect(cleanProfileName('Best Buy | Official Online Store')).toBe('Best Buy | Official Online Store');
    });
    it('handles empty / null input', () => {
        expect(cleanProfileName(null)).toBeNull();
        expect(cleanProfileName('   ')).toBeNull();
    });
});

describe('detectYoutubeVerifiedFromHtml', () => {
    it('detects the ytInitialData verified marker', () => {
        expect(detectYoutubeVerifiedFromHtml('...,"style":"BADGE_STYLE_TYPE_VERIFIED"},...')).toBe(true);
        expect(detectYoutubeVerifiedFromHtml('"BADGE_STYLE_TYPE_VERIFIED_ARTIST"')).toBe(true);
    });
    it('returns false when absent', () => {
        expect(detectYoutubeVerifiedFromHtml('<html>no badge here</html>')).toBe(false);
    });
});
