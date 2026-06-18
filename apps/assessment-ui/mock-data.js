(function() {
    const mockLogs = [
        { text: "[System] Initializing assessment crawl sequence...", delay: 0, type: 'info' },
        { text: "[System] Parsing input configuration...", delay: 400, type: 'info' },
        { text: "[Preflight] Inspecting metadata for website...", delay: 800, type: 'info' },
        { text: "[Preflight] Extracted Hero Headings successfully.", delay: 1200, type: 'success' },
        { text: "[Preflight] Parsed JSON-LD Schema (Type: Restaurant).", delay: 1500, type: 'success' },
        { text: "[Scraper] Spawning Cheerio scraper instance...", delay: 2000, type: 'info' },
        { text: "[Scraper] Got-Scraping TLS signature injected successfully.", delay: 2300, type: 'success' },
        { text: "[Scraper] Crawling social platform: Facebook...", delay: 2800, type: 'info' },
        { text: "[Scraper] Facebook Graph API: Extracted 48,290 likes and public CTAs.", delay: 3400, type: 'success' },
        { text: "[Scraper] Facebook Profile Classification: isPersonalProfile = false (Company).", delay: 3800, type: 'success' },
        { text: "[Scraper] Crawling social platform: Instagram...", delay: 4400, type: 'info' },
        { text: "[Scraper] Instagram Page: Extracted 12.5K followers & Linktree.", delay: 5000, type: 'success' },
        { text: "[Scraper] Crawling social platform: LinkedIn...", delay: 5600, type: 'info' },
        { text: "[Scraper] LinkedIn Page: Extracted 830 followers (Company page).", delay: 6200, type: 'success' },
        { text: "[Scraper] Crawling social platform: YouTube...", delay: 6800, type: 'info' },
        { text: "[Scraper] YouTube API: Channels list matching successful.", delay: 7200, type: 'success' },
        { text: "[Classifier] Evaluating accumulated platform signals...", delay: 7800, type: 'info' },
        { text: "[Classifier] Auto-detected Business Class: Local Business (Confidence: 94%).", delay: 8400, type: 'success' },
        { text: "[Scoring] Executing 22-Point Structural Diagnostic...", delay: 9000, type: 'info' },
        { text: "[Scoring] Calibrating Stage Weights: Local Business model applied.", delay: 9400, type: 'info' },
        { text: "[Supabase] Ingesting assessment f28cfc64-d58a... into revenue_journey_assessments.", delay: 10000, type: 'info' },
        { text: "[Supabase] JSONB assessment_detail and screenshots synchronized.", delay: 10500, type: 'success' },
        { text: "[System] Assessment complete! Exiting actor code 0.", delay: 11000, type: 'success' }
    ];

    const defaultKeywords = [
        "Milo's Original Burger Shop",
        "Birmingham Burgers",
        "Hamburgers in Alabama"
    ];

    window.MockData = {
        mockLogs,
        defaultKeywords
    };
})();
