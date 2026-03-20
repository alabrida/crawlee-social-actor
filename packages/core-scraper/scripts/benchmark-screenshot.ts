import { chromium } from 'playwright';

async function runBenchmark() {
  console.log('Starting screenshot performance benchmark...');
  const browser = await chromium.launch({ headless: true });

  // We'll test against a few fast, medium, and somewhat dynamic sites
  const urls = [
    'https://example.com',
    'https://developer.mozilla.org/en-US/',
    'https://playwright.dev/'
  ];

  const results = [];

  for (const url of urls) {
    console.log(`\nTesting URL: ${url}`);
    const context = await browser.newContext();
    const page = await context.newPage();

    const start = performance.now();

    try {
      // Replicate the logic in src/main.ts
      await page.goto(url, { waitUntil: 'commit', timeout: 60000 });
      await page.waitForLoadState('domcontentloaded', { timeout: 30000 }).catch(() => {});

      // THIS IS THE TARGET LINE:
      await page.waitForLoadState('networkidle', { timeout: 3000 }).catch(() => {});

      // We don't need to actually screenshot, we're measuring the time to get to the screenshot phase
      // let screenshotBuffer = await page.screenshot({ fullPage: true, timeout: 15000 });
    } catch (e: unknown) {
      console.error(`Error loading ${url}:`, e instanceof Error ? e.message : String(e));
    }

    const end = performance.now();
    const durationMs = end - start;

    console.log(`Duration: ${durationMs.toFixed(2)}ms`);
    results.push({ url, durationMs });

    await context.close();
  }

  await browser.close();

  const total = results.reduce((acc, curr) => acc + curr.durationMs, 0);
  console.log(`\nTotal Benchmark Time: ${total.toFixed(2)}ms`);
}

runBenchmark().catch(console.error);
