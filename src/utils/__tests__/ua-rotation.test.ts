import { describe, it, expect, vi, afterEach } from 'vitest';
import { getRandomUserAgent, getUserAgentList } from '../ua-rotation.js';

describe('ua-rotation utility', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('getUserAgentList', () => {
        it('should return a non-empty array of user agents', () => {
            const list = getUserAgentList();
            expect(Array.isArray(list)).toBe(true);
            expect(list.length).toBeGreaterThan(0);
            list.forEach(ua => {
                expect(typeof ua).toBe('string');
            });
        });

        it('should return the curated list of desktop user agents', () => {
            const list = getUserAgentList();
            // Checking if some known strings from the list are present
            expect(list).toContain('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36');
            expect(list).toContain('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36');
        });
    });

    describe('getRandomUserAgent', () => {
        it('should return a string that exists in the curated list', () => {
            const ua = getRandomUserAgent();
            const list = getUserAgentList();
            expect(list).toContain(ua);
        });

        it('should return the first agent when Math.random is 0', () => {
            vi.spyOn(Math, 'random').mockReturnValue(0);
            const list = getUserAgentList();
            const ua = getRandomUserAgent();
            expect(ua).toBe(list[0]);
        });

        it('should return the last agent when Math.random is close to 1', () => {
            vi.spyOn(Math, 'random').mockReturnValue(0.999999);
            const list = getUserAgentList();
            const ua = getRandomUserAgent();
            expect(ua).toBe(list[list.length - 1]);
        });

        it('should return a middle agent when Math.random is 0.5', () => {
            vi.spyOn(Math, 'random').mockReturnValue(0.5);
            const list = getUserAgentList();
            const index = Math.floor(0.5 * list.length);
            const ua = getRandomUserAgent();
            expect(ua).toBe(list[index]);
        });
    });
});
