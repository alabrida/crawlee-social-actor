import { chromium } from 'playwright';

async function run() {
    console.log('Starting benchmark...');
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    await page.setContent(`
        <html>
            <body>
                <button aria-label="Book now">Book</button>
                <a style="display:none" href="#">Order</a>
                <button>Reserve</button>
                <div><a href="#">Tickets</a></div>
                <button>Menu</button>
                <a href="#" aria-label="Book Appointments">Appointments</a>
                <button aria-label="Reservations for dinner">Reservations</button>
                <a href="#" style="opacity: 0;">Book Hidden</a>
            </body>
        </html>
    `);

    const possibleCtas = ['Book', 'Order', 'Reserve', 'Tickets', 'Menu', 'Appointments', 'Reservations'];

    // Warmup
    for (let i = 0; i < 5; i++) {
        for (const cta of possibleCtas) {
            try {
                const btn = page.locator(`button[aria-label*="${cta}" i], a[aria-label*="${cta}" i], button:has-text("${cta}"), a:has-text("${cta}")`).first();
                await btn.isVisible();
            } catch (e) { }
        }
    }

    let ctas1: string[] = [];
    let ctas2: string[] = [];

    const ITERATIONS = 100;

    // Baseline approach
    let totalBaseline = 0;
    for (let i = 0; i < ITERATIONS; i++) {
        const start1 = Date.now();
        ctas1 = [];
        for (const cta of possibleCtas) {
            try {
                const btn = page.locator(`button[aria-label*="${cta}" i], a[aria-label*="${cta}" i], button:has-text("${cta}"), a:has-text("${cta}")`).first();
                if (await btn.isVisible()) {
                    ctas1.push(cta);
                }
            } catch (e) { /* ignore */ }
        }
        totalBaseline += (Date.now() - start1);
    }

    // Optimized approach
    let totalOptimized = 0;
    for (let i = 0; i < ITERATIONS; i++) {
        const start2 = Date.now();
        ctas2 = [];
        try {
            const visibleSelectors = possibleCtas.map(cta =>
                `button[aria-label*="${cta}" i]:visible, a[aria-label*="${cta}" i]:visible, button:has-text("${cta}"):visible, a:has-text("${cta}"):visible`
            ).join(', ');

            const matchedCtas = await page.locator(visibleSelectors).evaluateAll((els, ctas) => {
                const foundCtas = new Set<string>();
                for (const el of els) {
                    const text = (el.textContent || '').toLowerCase();
                    const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();
                    for (const cta of ctas) {
                        if (foundCtas.has(cta)) continue;
                        const ctaLower = cta.toLowerCase();
                        if (text.includes(ctaLower) || ariaLabel.includes(ctaLower)) {
                            foundCtas.add(cta);
                        }
                    }
                }
                // Maintain the exact ordering of possibleCtas
                return ctas.filter(c => foundCtas.has(c));
            }, possibleCtas);

            ctas2.push(...matchedCtas);
        } catch (e) { console.error(e) }
        totalOptimized += (Date.now() - start2);
    }

    const avgBaseline = totalBaseline / ITERATIONS;
    const avgOptimized = totalOptimized / ITERATIONS;

    console.log(`\n--- BENCHMARK RESULTS ---`);
    console.log(`Baseline Avg Time:  ${avgBaseline.toFixed(2)}ms`);
    console.log(`Optimized Avg Time: ${avgOptimized.toFixed(2)}ms`);
    console.log(`Speedup:            ${(avgBaseline / avgOptimized).toFixed(2)}x faster`);

    // Validate output match
    console.log(`\nOutput Match Check: ${JSON.stringify(ctas1) === JSON.stringify(ctas2) ? 'PASS ✅' : 'FAIL ❌'}`);
    console.log(`Result:`, ctas2);

    await browser.close();
}

run().catch(console.error);
