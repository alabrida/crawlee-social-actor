import fs from 'fs';

const SUPABASE_URL = 'https://vupbjbrviiilqvgqtqlw.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1cGJqYnJ2aWlpbHF2Z3F0cWx3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMjM5OTAsImV4cCI6MjA4MjY5OTk5MH0.k5q3YIU6EGV2X2biQmTySEXGaI9SefAFrR2GH5NmgQI';

async function updateBlocker(blocker) {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/blockers`, {
        method: 'POST',
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify(blocker)
    });

    if (!response.ok) {
        const error = await response.text();
        console.error('Failed to update blocker:', error);
        process.exit(1);
    }

    console.log(`Successfully documented blocker: ${blocker.id}`);
}

const blocks = [
    {
        id: 'BLOCK-008',
        platform: 'pinterest',
        type: 'spa_rendering',
        description: 'Pinterest is a heavy Single Page Application (SPA). While initial HTML contains some metadata, the actual revenue indicators (CTAs, bio links) and verified websites are often injected via client-side JavaScript after the initial load, requiring a browser-based crawler for reliable extraction.',
        status: 'open',
        sprint: 6
    },
    {
        id: 'BLOCK-009',
        platform: 'pinterest',
        type: 'bot_detection',
        description: 'Pinterest employs sophisticated bot detection that analyzes browser fingerprints and interaction patterns. Bare HTTP requests may trigger CAPTCHA or restricted views. High-stealth fingerprinting (Apify Fingerprint Suite) is required to ensure long-term stability.',
        status: 'open',
        sprint: 6
    }
];

async function run() {
    for (const b of blocks) {
        await updateBlocker(b);
    }
}

run();
