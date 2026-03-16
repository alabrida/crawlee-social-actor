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

const newBlocker = {
    id: 'BLOCK-007',
    platform: 'google_maps',
    type: 'consent_wall',
    description: 'Playwright navigation to Google Maps URLs often triggers a "Before you continue to Google" consent wall or a "Sign in" overlay that obscures the main profile content. Bare HTTP requests may bypass this, but browser-based extraction requires explicit interaction with the consent dialog.',
    status: 'verified',
    mitigation: 'Implemented prioritized multi-language button locators for consent bypass and shifted to search-style URLs for more stable side-pane rendering.',
    verified_by: 'Architect + Anti-Bot Agent',
    verified_at: new Date().toISOString(),
    evidence: 'harden-results-gmaps.json showing 100% success rate on 10 diverse URLs',
    sprint: 5
};

updateBlocker(newBlocker);
