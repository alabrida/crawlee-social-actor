import { describe, it, expect } from 'vitest';
import { sanitizeQuery } from '../validation.js';

describe('sanitizeQuery', () => {
    it('should return an empty string for empty input', () => {
        expect(sanitizeQuery('')).toBe('');
    });

    it('should return an empty string for null or undefined (as casted string)', () => {
        // @ts-ignore
        expect(sanitizeQuery(null)).toBe('');
        // @ts-ignore
        expect(sanitizeQuery(undefined)).toBe('');
    });

    it('should trim leading and trailing whitespace', () => {
        expect(sanitizeQuery('  search term  ')).toBe('search term');
    });

    it('should preserve internal whitespace', () => {
        expect(sanitizeQuery('search  term')).toBe('search  term');
    });

    it('should remove control characters (ASCII 0-31 and 127)', () => {
        const input = 'a\x00b\x07c\x1Fd\x7Fe';
        expect(sanitizeQuery(input)).toBe('abcde');
    });

    it('should handle strings with only whitespace and control characters', () => {
        const input = '  \x00 \x1F  ';
        expect(sanitizeQuery(input)).toBe('');
    });

    it('should enforce default maximum length of 500', () => {
        const longString = 'a'.repeat(600);
        const result = sanitizeQuery(longString);
        expect(result).toHaveLength(500);
        expect(result).toBe('a'.repeat(500));
    });

    it('should enforce custom maximum length', () => {
        const longString = 'abcde';
        const result = sanitizeQuery(longString, 3);
        expect(result).toHaveLength(3);
        expect(result).toBe('abc');
    });

    it('should not truncate if length is exactly maxLength', () => {
        const str = 'abc';
        expect(sanitizeQuery(str, 3)).toBe('abc');
    });

    it('should preserve non-control special characters and UTF-8', () => {
        const input = '🔥 search @ # $ % ^ & * () _ + !';
        expect(sanitizeQuery(input)).toBe(input);
    });

    it('should perform operations in order: remove control chars, then trim, then truncate', () => {
        // Control char at the end of a long string might affect length after removal
        const input = 'a'.repeat(10) + '\x00' + '  ';
        // 1. Remove \x00 -> 'aaaaaaaaaa  '
        // 2. Trim -> 'aaaaaaaaaa'
        // 3. Truncate (if maxLength was e.g. 5) -> 'aaaaa'
        expect(sanitizeQuery(input, 5)).toBe('aaaaa');
    });
});
