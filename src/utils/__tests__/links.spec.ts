import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { auditLink } from '../links.js';
// dns is mocked inline by vi.mock below, no need for explicit import

// Mock DNS resolution to return local/private IPs when needed, and public IPs otherwise.
vi.mock('node:dns', async () => {
    const actual = await vi.importActual<typeof import('node:dns')>('node:dns');
    return {
        ...actual,
        resolve4: vi.fn((hostname: string, callback: any) => {
            if (hostname === 'localhost' || hostname === 'localtest.me') {
                callback(null, ['127.0.0.1']);
            } else if (hostname === 'internal.example.com') {
                callback(null, ['10.0.0.5']);
            } else if (hostname === 'metadata.google.internal') {
                callback(null, ['169.254.169.254']);
            } else {
                callback(null, ['93.184.216.34']); // Example public IP (example.com)
            }
        }),
        resolve6: vi.fn((hostname: string, callback: any) => {
            if (hostname === 'localhost' || hostname === 'localtest.me') {
                callback(null, ['::1']);
            } else {
                callback(null, ['2606:2800:220:1:248:1893:25c8:1946']); // Example public IPv6
            }
        })
    };
});

// Mock fetch globally to control responses
const originalFetch = global.fetch;

describe('Links Utility - SSRF Protection', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Setup default fetch mock for external/safe URLs
        global.fetch = vi.fn().mockImplementation(async (url: string) => {
            return {
                status: 200,
                url,
                headers: new Map(),
            } as any;
        });
    });

    afterEach(() => {
        global.fetch = originalFetch;
    });

    it('should allow valid public URLs without tracking or linktree', async () => {
        const audit = await auditLink('https://example.com');

        expect(audit.originalUrl).toBe('https://example.com');
        expect(audit.finalUrl).toBe('https://example.com/'); // URL parsing normalizes path
        expect(audit.isOptimized).toBe(false);
        expect(audit.hasSsl).toBe(true);
        expect(audit.isLinkTree).toBe(false);
        expect(audit.redirectCount).toBe(0);

        // Check that fetch was called
        expect(global.fetch).toHaveBeenCalledWith('https://example.com/', expect.any(Object));
    });

    it('should block local/private IP addresses directly', async () => {
        const audit = await auditLink('http://127.0.0.1');

        // It catches the error and returns the initial object, but finalUrl remains original
        expect(audit.finalUrl).toBe('http://127.0.0.1');
        // Fetch should NEVER be called for internal IPs
        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should block IPv6 loopback and bracketed internal IPs directly', async () => {
        await auditLink('http://[::1]/');

        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should block metadata endpoint IP directly', async () => {
        await auditLink('http://169.254.169.254/latest/meta-data/');

        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should block localhost hostname (DNS rebinding protection)', async () => {
        await auditLink('http://localhost:8080');

        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should block hostnames resolving to internal IPs (DNS rebinding protection)', async () => {
        await auditLink('http://internal.example.com');

        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should manually follow safe redirects', async () => {
        // Mock a redirect chain: http://example.com/short -> https://example.com/long
        global.fetch = vi.fn()
            .mockImplementationOnce(async (url: string) => {
                return {
                    status: 301,
                    url,
                    headers: new Headers({ 'location': 'https://example.com/long' }),
                } as any;
            })
            .mockImplementationOnce(async (url: string) => {
                return {
                    status: 200,
                    url,
                    headers: new Headers(),
                } as any;
            });

        const audit = await auditLink('http://example.com/short');

        expect(audit.finalUrl).toBe('https://example.com/long');
        expect(audit.redirectCount).toBe(1);
        expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should block a redirect to an internal IP', async () => {
        // Mock a malicious redirect: http://example.com/safe -> http://169.254.169.254
        global.fetch = vi.fn()
            .mockImplementationOnce(async (url: string) => {
                return {
                    status: 302,
                    url,
                    headers: new Headers({ 'location': 'http://169.254.169.254/latest/meta-data/' }),
                } as any;
            });

        const audit = await auditLink('http://example.com/safe');

        // The process aborts, so it returns the last known safe state or default
        expect(audit.originalUrl).toBe('http://example.com/safe');
        // Since the second request failed validation, fetch should only be called once
        expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should block unsupported protocols', async () => {
        await auditLink('file:///etc/passwd');

        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should detect linktree and tracking params', async () => {
        global.fetch = vi.fn().mockImplementation(async (_url: string) => {
            return {
                status: 200,
                url: 'https://linktr.ee/someuser?utm_source=twitter',
                headers: new Headers(),
            } as any;
        });

        const audit = await auditLink('https://example.com'); // final URL is different

        expect(audit.finalUrl).toBe('https://linktr.ee/someuser?utm_source=twitter');
        expect(audit.isLinkTree).toBe(true);
        expect(audit.trackingParams).toContain('utm_source');
        expect(audit.isOptimized).toBe(true);
    });
});
