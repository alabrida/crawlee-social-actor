/**
 * @module utils/security
 * @description Utilities for preventing SSRF and DNS rebinding attacks.
 */

import * as dns from 'node:dns';
import { promisify } from 'node:util';

const resolve4 = promisify(dns.resolve4);
const resolve6 = promisify(dns.resolve6);

/**
 * Parses an IPv4 string into an array of 4 octets.
 */
function parseIPv4(ip: string): number[] | null {
    const parts = ip.split('.');
    if (parts.length !== 4) return null;
    const octets = parts.map(Number);
    if (octets.some(n => isNaN(n) || n < 0 || n > 255)) return null;
    return octets;
}

/**
 * Checks if an IPv4 address is in a private/internal range.
 */
function isPrivateIPv4(ip: string): boolean {
    const octets = parseIPv4(ip);
    if (!octets) return false;

    const [a, b] = octets;

    // 0.0.0.0/8 (Current network)
    if (a === 0) return true;
    // 10.0.0.0/8 (Private)
    if (a === 10) return true;
    // 127.0.0.0/8 (Loopback)
    if (a === 127) return true;
    // 169.254.0.0/16 (Link-local)
    if (a === 169 && b === 254) return true;
    // 172.16.0.0/12 (Private)
    if (a === 172 && b >= 16 && b <= 31) return true;
    // 192.168.0.0/16 (Private)
    if (a === 192 && b === 168) return true;
    // 224.0.0.0/4 (Multicast)
    if (a >= 224 && a <= 239) return true;
    // 255.255.255.255/32 (Broadcast)
    if (a === 255 && b === 255 && octets[2] === 255 && octets[3] === 255) return true;

    return false;
}

/**
 * Checks if an IPv6 address is in a private/internal range.
 * This is a simplified check that catches loopback (::1),
 * unique local addresses (fc00::/7), and link-local (fe80::/10).
 * It also blocks IPv4-mapped IPv6 addresses that map to private IPv4s.
 */
function isPrivateIPv6(ip: string): boolean {
    // IPv6 hostnames in URLs can be enclosed in brackets
    const cleanIp = ip.replace(/^\[/, '').replace(/\]$/, '');
    const lower = cleanIp.toLowerCase();

    if (lower === '::1' || lower === '::' || lower === '0:0:0:0:0:0:0:1' || lower === '0:0:0:0:0:0:0:0') {
        return true;
    }
    if (lower.startsWith('fc') || lower.startsWith('fd')) { // Unique Local
        return true;
    }
    if (lower.startsWith('fe8') || lower.startsWith('fe9') || lower.startsWith('fea') || lower.startsWith('feb')) { // Link-local
        return true;
    }
    if (lower.startsWith('::ffff:')) { // IPv4-mapped
        const ipv4Part = lower.substring(7);
        return isPrivateIPv4(ipv4Part);
    }

    return false;
}

/**
 * Checks if any IP string is internal/private.
 */
export function isPrivateIP(ip: string): boolean {
    if (ip.includes(':')) {
        return isPrivateIPv6(ip);
    }
    return isPrivateIPv4(ip);
}

/**
 * Validates a URL to ensure it is safe to fetch (HTTP/HTTPS only, standard ports).
 * Then, resolves the hostname to its IP addresses to verify it does not map to an internal network.
 * Throws an error if the URL is unsafe.
 *
 * @param urlString - The URL to validate.
 */
export async function validateSafeUrl(urlString: string): Promise<URL> {
    let url: URL;
    try {
        url = new URL(urlString);
    } catch {
        throw new Error(`Invalid URL: ${urlString}`);
    }

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new Error(`Unsupported protocol: ${url.protocol}`);
    }

    // Default ports or explicitly allowed
    const port = url.port ? parseInt(url.port, 10) : (url.protocol === 'https:' ? 443 : 80);
    if (port !== 80 && port !== 443) {
        throw new Error(`Unsupported port: ${port}`);
    }

    const hostname = url.hostname;

    // If the hostname is already an IP, check it directly
    if (/^[\d.]+$/.test(hostname) || hostname.includes(':')) {
        // Simple regex check, actual IP validation will happen
        if (isPrivateIP(hostname)) {
            throw new Error(`SSRF Attempt: Blocked access to private IP ${hostname}`);
        }
        return url;
    }

    // DNS Resolution to prevent DNS rebinding
    let ips: string[] = [];
    try {
        const [ipv4s, ipv6s] = await Promise.allSettled([
            resolve4(hostname),
            resolve6(hostname)
        ]);

        if (ipv4s.status === 'fulfilled') ips.push(...ipv4s.value);
        if (ipv6s.status === 'fulfilled') ips.push(...ipv6s.value);
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new Error(`DNS resolution failed for ${hostname}: ${msg}`);
    }

    if (ips.length === 0) {
        throw new Error(`DNS resolution returned no IPs for ${hostname}`);
    }

    // Verify none of the resolved IPs are private
    for (const ip of ips) {
        if (isPrivateIP(ip)) {
            throw new Error(`SSRF Attempt: Hostname ${hostname} resolves to private IP ${ip}`);
        }
    }

    return url;
}
