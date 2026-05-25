import { describe, it, expect } from 'vitest';
import { parseCount } from '../parse-count.js';
import { analyzeBio } from '../bio-analyzer.js';
import { classifyLink } from '../link-classifier.js';
import { SmartCrawlTracker, identifyKeyPages } from '../smart-stop.js';

describe('parseCount Utility', () => {
    it('should parse simple integers', () => {
        expect(parseCount('123')).toBe(123);
        expect(parseCount('1,234')).toBe(1234);
    });

    it('should parse K/M notations', () => {
        expect(parseCount('1.2K')).toBe(1200);
        expect(parseCount('1.5M')).toBe(1500000);
        expect(parseCount('10K')).toBe(10000);
    });

    it('should handle suffix characters gracefully', () => {
        expect(parseCount('500+')).toBe(500);
        expect(parseCount('12,345 followers')).toBe(12345);
    });

    it('should return null or zero for invalid counts', () => {
        expect(parseCount('no followers')).toBeNull();
        expect(parseCount('')).toBeNull();
    });
});

describe('bio-analyzer Utility', () => {
    it('should identify conversion/CTA keywords', () => {
        const result = analyzeBio('Shop our courses at our website! DM to book.');
        expect(result.hasConversionCta).toBe(true);
        expect(result.conversionSignals).toContain('Shop/Store');
        expect(result.conversionSignals).toContain('Booking');
    });

    it('should identify authority keywords', () => {
        const result = analyzeBio('PMP certified revenue consultant and award-winning speaker.');
        expect(result.hasAuthorityProof).toBe(true);
        expect(result.authoritySignals).toContain('Certification');
        expect(result.authoritySignals).toContain('Expert Role');
    });

    it('should identify revenue models', () => {
        const result = analyzeBio('Join our monthly SaaS membership program.');
        expect(result.hasClearRevenueModel).toBe(true);
        expect(result.revenueModelSignals).toContain('Subscription');
        expect(result.revenueModelSignals).toContain('SaaS/Software');
    });
});

describe('link-classifier Utility', () => {
    it('should classify link tree as aggregator', () => {
        expect(classifyLink('https://linktr.ee/example').type).toBe('link_aggregator');
        expect(classifyLink('https://stan.store/example').type).toBe('link_aggregator');
    });

    it('should classify scheduling tools as booking', () => {
        expect(classifyLink('https://calendly.com/example').type).toBe('booking');
        expect(classifyLink('https://acuityscheduling.com/example').type).toBe('booking');
    });

    it('should classify generic websites as direct website', () => {
        expect(classifyLink('https://mybusiness.com').type).toBe('direct_website');
    });
});

describe('Smart-Crawl Smart-Stop Utility', () => {
    it('should identify key pages from anchors list', () => {
        const anchors = [
            'https://example.com/about-us',
            'https://example.com/pricing',
            'https://example.com/blog/article1',
            'https://example.com/contact-us',
            'https://example.com/images/pic.png'
        ];
        const keyPages = identifyKeyPages(anchors, 'https://example.com');
        expect(keyPages.some(p => p.type === 'pricing')).toBe(true);
        expect(keyPages.some(p => p.type === 'about')).toBe(true);
        expect(keyPages.some(p => p.type === 'contact')).toBe(true);
    });

    it('should stop crawl when dry run limit reached', () => {
        const tracker = new SmartCrawlTracker();
        // Crawl homepage - yields new signals
        let check = tracker.recordPageCrawl('https://example.com', ['ssl', 'ga']);
        expect(check.shouldStop).toBe(false);

        // Crawl 5 pages with no new signals (dry run streak)
        for (let i = 0; i < 5; i++) {
            check = tracker.recordPageCrawl(`https://example.com/page${i}`, ['ssl']);
        }
        expect(check.shouldStop).toBe(true);
        expect(tracker.getSummary().stopReason).toBe('signal_saturation');
    });
});
