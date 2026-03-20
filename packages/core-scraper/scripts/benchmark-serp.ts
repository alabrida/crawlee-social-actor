import { chromium } from 'playwright';

async function main() {
    console.log('Starting benchmark...');
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    // Create a mock DOM with 100 anchor links to simulate SERP results
    await page.setContent(`
        <html>
            <body>
                <div id="search">
                    ${Array.from({ length: 100 }).map((_, i) => `<a href="http://example${i}.com/page">Link ${i}</a>`).join('\n')}
                </div>
            </body>
        </html>
    `);

    const resultLocators = page.locator('#search a[href^="http"]:not([href*="google.com"])');

    // Scenario 1: Baseline (N+1 query)
    let startTime = performance.now();
    const count = await resultLocators.count();
    const seenDomains1 = new Set<string>();
    let position1 = 1;
    const links1: string[] = [];

    for (let i = 0; i < count; i++) {
        if (position1 > 10) break;
        const href = await resultLocators.nth(i).getAttribute('href');
        if (!href) continue;
        try {
            const hostname = new URL(href).hostname;
            if (!seenDomains1.has(hostname)) {
                seenDomains1.add(hostname);
                links1.push(href);
                position1++;
            }
        } catch (e) { continue; }
    }
    const baselineTime = performance.now() - startTime;
    console.log(`Baseline (N+1): ${baselineTime.toFixed(2)} ms`);

    // Scenario 2: Optimized (evaluateAll)
    startTime = performance.now();
    const allHrefs = await resultLocators.evaluateAll((elements) => elements.map(el => (el as HTMLAnchorElement).href));

    const seenDomains2 = new Set<string>();
    let position2 = 1;
    const links2: string[] = [];

    for (const href of allHrefs) {
        if (position2 > 10) break;
        if (!href) continue;
        try {
            const hostname = new URL(href).hostname;
            if (!seenDomains2.has(hostname)) {
                seenDomains2.add(hostname);
                links2.push(href);
                position2++;
            }
        } catch (e) { continue; }
    }
    const optimizedTime = performance.now() - startTime;
    console.log(`Optimized (evaluateAll): ${optimizedTime.toFixed(2)} ms`);

    console.log(`Improvement: ${(baselineTime / optimizedTime).toFixed(2)}x faster`);

    // Check correctness
    if (JSON.stringify(links1) !== JSON.stringify(links2)) {
        console.error('Mismatch between baseline and optimized links!');
        console.log('Baseline:', links1);
        console.log('Optimized:', links2);
    } else {
        console.log('Results match.');
    }

    await browser.close();
}

main().catch(console.error);
