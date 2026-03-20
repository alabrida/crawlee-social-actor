import fs from 'fs';

async function probeUrl(url) {
    console.log(`\n--- Probing: ${url} ---`);
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Connection': 'keep-alive'
            }
        });

        console.log(`Status: ${response.status} ${response.statusText}`);
        
        const headers = {};
        for (const [key, value] of response.headers.entries()) {
            headers[key] = value;
        }
        console.log('Headers:', JSON.stringify(headers, null, 2));

        const body = await response.text();
        console.log(`Body Length: ${body.length} characters`);
        
        // Check for common blockers
        if (body.includes('Our systems have detected unusual traffic')) {
            console.log('BLOCKER DETECTED: Google "Unusual traffic" CAPTCHA block');
        } else if (body.includes('consent.google.com') || body.includes('Before you continue to Google')) {
            console.log('BLOCKER DETECTED: Google Consent screen (EU/Cookie wall)');
        } else if (body.includes('id="captcha-form"')) {
            console.log('BLOCKER DETECTED: CAPTCHA Form snippet present');
        } else if (response.status === 200 && body.length > 50000) {
            console.log('SUCCESS: Likely a full maps page returned');
        } else {
            console.log('UNKNOWN STATE: Please review body snippet');
            console.log('Snippet:', body.substring(0, 500));
        }

    } catch (e) {
        console.error(`Probe failed:`, e);
    }
}

async function run() {
    const urls = [
        'https://www.google.com/maps/place/Eiffel+Tower/',
        'https://www.google.com/maps/place/Empire+State+Building/',
        'https://www.google.com/maps/place/Sydney+Opera+House/'
    ];
    
    for (const url of urls) {
        await probeUrl(url);
    }
}

run();
