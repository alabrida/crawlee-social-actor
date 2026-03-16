import { describe, it, expect, vi, afterEach } from 'vitest';
import { getRandomUserAgent, getUserAgentList } from '../ua-rotation.js';

describe('ua-rotation', () => {
    describe('getUserAgentList', () => {
        it('should return a non-empty array of user agents', () => {
            const list = getUserAgentList();
            expect(Array.isArray(list)).toBe(true);
            expect(list.length).toBeGreaterThan(0);
            expect(typeof list[0]).toBe('string');
        });
    });

    describe('getRandomUserAgent', () => {
        afterEach(() => {
            vi.restoreAllMocks();
        });

        it('should return a string from the user agent list', () => {
            const list = getUserAgentList();
            const ua = getRandomUserAgent();
            expect(typeof ua).toBe('string');
            expect(list).toContain(ua);
        });

        it('should return the first user agent when Math.random returns 0', () => {
            vi.spyOn(Math, 'random').mockReturnValue(0);
            const list = getUserAgentList();
            const ua = getRandomUserAgent();
            expect(ua).toBe(list[0]);
        });

        it('should return the last user agent when Math.random returns close to 1', () => {
            vi.spyOn(Math, 'random').mockReturnValue(0.999999);
            const list = getUserAgentList();
            const ua = getRandomUserAgent();
            expect(ua).toBe(list[list.length - 1]);
        });
    });
});
