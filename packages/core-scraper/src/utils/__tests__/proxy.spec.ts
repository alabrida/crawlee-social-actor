import { describe, it, expect } from 'vitest';
import { resolveOriginCountry } from '../proxy.js';

describe('resolveOriginCountry (account-sensitive residential lock)', () => {
    it('prefers explicit originCountry', () => {
        expect(resolveOriginCountry({ useApifyProxy: true, apifyProxyGroups: [], originCountry: 'gb', apifyProxyCountry: 'DE' })).toBe('GB');
    });
    it('falls back to apifyProxyCountry', () => {
        expect(resolveOriginCountry({ useApifyProxy: true, apifyProxyGroups: [], apifyProxyCountry: 'ca' })).toBe('CA');
    });
    it('defaults to US when neither is set (never a random global exit)', () => {
        expect(resolveOriginCountry({ useApifyProxy: true, apifyProxyGroups: [] })).toBe('US');
    });
});
