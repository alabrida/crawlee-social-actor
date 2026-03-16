import { chromium } from 'playwright';

async function run() {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    // Block resources per G-COST-02
    await page.route('**/*', (route) => {
        const type = route.request().resourceType();
        if (['image', 'media', 'font', 'stylesheet'].includes(type)) {
            route.abort();
        } else {
            route.continue();
        }
    });

    console.log('Navigating to Google Maps place...');
    await page.goto('https://www.google.com/maps/place/Eiffel+Tower/');
    
    // Handle consent if present
    try {
        const consentButton = page.locator('button:has-text("Accept all"), button:has-text("Reject all"), button:has-text("I agree")').first();
        if (await consentButton.isVisible({ timeout: 5000 })) {
            console.log('Consent screen detected. Clicking...');
            await page.screenshot({ path: 'consent-screen.png' });
            await consentButton.click();
            await page.waitForLoadState('networkidle');
        }
    } catch (e) {
        // Ignore timeout
    }

    try {
        console.log('Waiting for h1...');
        await page.waitForTimeout(3000);
        await page.screenshot({ path: 'before-h1.png' });
        
        const h1Count = await page.locator('h1').count();
        console.log(`h1 count: ${h1Count}`);
        
        for (let i = 0; i < h1Count; i++) {
            const h1 = page.locator('h1').nth(i);
            const text = await h1.innerText();
            const visible = await h1.isVisible();
            const html = await h1.evaluate(el => el.outerHTML);
            console.log(`h1[${i}]: visible=${visible}, text="${text}", html=${html.substring(0, 100)}...`);
        }

        const bodyHtml = await page.evaluate(() => document.body.innerText.substring(0, 500));
        console.log(`Body text snippet: ${bodyHtml}`);
        
        // Check for specific strings that indicate a consent wall or captcha
        const fullHtml = await page.content();
        if (fullHtml.includes('consent.google.com')) console.log('Found link to consent.google.com');
        if (fullHtml.includes('Veuillez confirmer')) console.log('Found French confirmation text');

        // Extract category (usually a button right next to the rating)
        const categoryBtn = page.locator('button[jsaction="pane.rating.category"]').first();
        let category = null;
        if (await categoryBtn.isVisible()) {
            category = await categoryBtn.innerText();
        }
        console.log(`Category: ${category}`);

        // Extract website (aria-label starting with Website:)
        let website = null;
        const websiteLocator = page.locator('a[aria-label^="Website:"]');
        if (await websiteLocator.count() > 0) {
            website = await websiteLocator.first().getAttribute('href');
        }
        console.log(`Website: ${website}`);

        // Extract phone number (aria-label starting with Phone:)
        let phone = null;
        const phoneLocator = page.locator('button[aria-label^="Phone:"]');
        if (await phoneLocator.count() > 0) {
            phone = await phoneLocator.first().getAttribute('aria-label');
            phone = phone.replace('Phone: ', '').trim();
        }
        console.log(`Phone: ${phone}`);

        // Extract booking/order CTAs
        const ctas = [];
        const possibleCtas = ['Book', 'Order', 'Tickets', 'Reserve'];
        for (const cta of possibleCtas) {
            const btn = page.locator(`button:has-text("${cta}"), a:has-text("${cta}")`);
            if (await btn.count() > 0) {
                ctas.push(cta);
            }
        }
        console.log(`CTAs: ${ctas.join(', ')}`);

    } catch (e) {
        console.error('Extraction failed:', e);
    }

    await browser.close();
}

run();
