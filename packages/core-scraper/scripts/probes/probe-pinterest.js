import fs from 'fs';

async function probeUrl(url) {
    console.log(`\n--- Probing: ${url} ---`);
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
            }
        });

        const text = await response.text();
        const lowerText = text.toLowerCase();
        
        const isCaptcha = lowerText.includes('captcha') || lowerText.includes('unusual traffic');
        const hasContent = lowerText.includes('fullname') || lowerText.includes('followers');
        const isAuthWall = lowerText.includes('login') && text.length < 50000;

        console.log(`Status: ${response.status}`);
        console.log(`Body Length: ${text.length}`);
        console.log(`Captcha: ${isCaptcha}`);
        console.log(`AuthWall: ${isAuthWall}`);
        console.log(`Has Content: ${hasContent}`);

        if (hasContent && !isCaptcha) {
            console.log('SUCCESS: Page content found via bare HTTP');
        }

    } catch (e) {
        console.error(`Probe failed: ${e.message}`);
    }
}

async function run() {
    const urls = [
        'https://www.pinterest.com/nike/',
        'https://www.pinterest.com/joyfoodsunshine/',
        'https://www.pinterest.com/ohjoy/'
    ];
    for (const url of urls) {
        await probeUrl(url);
    }
}

run();
