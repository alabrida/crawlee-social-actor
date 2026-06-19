import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// Helper to ensure the results folder exists for screenshots
const resultsDir = path.resolve(process.cwd(), 'results');
if (!fs.existsSync(resultsDir)) {
  fs.mkdirSync(resultsDir, { recursive: true });
}

/**
 * Validates that a page has valid schema.org structured JSON-LD data
 * matching BreadcrumbList, WebPage, or Service objects.
 */
async function validateSchemaOrg(page: Page, pageName: string) {
  const jsonLdScripts = await page.locator('script[type="application/ld+json"]').all();
  expect(jsonLdScripts.length).toBeGreaterThan(0);

  console.log(`[Schema Validation] Found ${jsonLdScripts.length} schema block(s) on page: ${pageName}`);

  for (let i = 0; i < jsonLdScripts.length; i++) {
    const content = await jsonLdScripts[i].textContent();
    expect(content).not.toBeNull();
    
    let data;
    try {
      data = JSON.parse(content!.trim());
    } catch (e) {
      throw new Error(`Failed to parse JSON-LD schema on ${pageName} (index ${i}): ${e}`);
    }

    // Verify schema context
    expect(data['@context']).toBe('https://schema.org');
    
    // Check if type matches BreadcrumbList, WebPage, or Service
    const type = data['@type'];
    expect(type).toBeDefined();
    
    const validTypes = ['BreadcrumbList', 'WebPage', 'Service'];
    const typesToCheck = Array.isArray(type) ? type : [type];
    const hasValidType = typesToCheck.some(t => validTypes.includes(t));
    
    expect(hasValidType).toBe(true);
    console.log(`[Schema Validation] Verified schema object of type: ${typesToCheck.join(', ')}`);
  }
}

test.describe('Map More Money SaaS UI - End-to-End & Routing Gateway Verification', () => {

  test('R1 & R5: Default entry (SaaS Path) loads landing page correctly', async ({ page }) => {
    // 1. Visit root (default entry, no token)
    await page.goto('/');

    // 2. Verify URL stays on index.html (no redirect)
    await expect(page).toHaveURL(/.*\/$|.*\/index\.html$/);

    // 3. Verify 5-stage commercial framework indicators
    // (Check presence of sections/headers or descriptive text representing each stage)
    const pageText = await page.textContent('body');
    expect(pageText).toContain('Awareness');
    expect(pageText).toContain('Consideration');
    expect(pageText).toContain('Decision');
    expect(pageText).toContain('Conversion');
    expect(pageText).toContain('Retention');

    // 4. Verify Sponsorship / Alabrida Brand and Ad slot placeholders
    expect(pageText).toContain('Alabrida');
    // Verify advertisement placeholder is present
    const adsPlaceholder = page.locator('.ad-slot, [data-ad-slot], .sponsorship-ad');
    await expect(adsPlaceholder.first()).toBeVisible();

    // 5. Verify strict design constraints: no cheap dollar signs ($) in the conversion engine
    // (Ensure there are no raw '$' characters in the main content or headers)
    const mainContent = await page.locator('main, body').textContent();
    expect(mainContent).not.toContain('$');

    // 6. Validate schema.org structured data
    await validateSchemaOrg(page, 'SaaS Landing Page (index.html)');

    // 7. Capture verification screenshot
    await page.screenshot({ path: path.join(resultsDir, 'saas_landing.png'), fullPage: true });
  });

  test('R2 & R5: Access with MMM-CONSULT-xxx token bypasses landing to Gateway', async ({ page }) => {
    const token = 'MMM-CONSULT-TEST123';
    
    // 1. Visit with consulting token
    await page.goto(`/?token=${token}`);

    // 2. Verify redirect to gateway.html with token preserved
    await expect(page).toHaveURL(new RegExp(`.*gateway\\.html\\?token=${token}`));

    // 3. Verify gate page structure (Web vs Extension connect options)
    const pageText = await page.textContent('body');
    expect(pageText).toContain('MapMoreMoney Sync');
    expect(pageText).toContain('Playwright Interactive Login');

    // 4. Validate schema.org structured data on gateway
    await validateSchemaOrg(page, 'Gateway Page (gateway.html)');

    // 5. Capture verification screenshot
    await page.screenshot({ path: path.join(resultsDir, 'consulting_gateway.png'), fullPage: true });
  });

  test('R2 & R5: Access with MMM-ACTOR-xxx token loads simplified Actor Portal', async ({ page }) => {
    const token = 'MMM-ACTOR-TEST123';
    
    // 1. Visit with actor token
    await page.goto(`/?token=${token}`);

    // 2. Verify redirect to actor.html with token preserved
    await expect(page).toHaveURL(new RegExp(`.*actor\\.html\\?token=${token}`));

    // 3. Verify simplified interface with three output options
    const pageText = await page.textContent('body');
    expect(pageText).toContain('Footprint JSON Payload');
    expect(pageText).toContain('HTML Executive Summary');
    expect(pageText).toContain('RJD Analytics Console');

    // 4. Verify affiliate advertising element is rendered
    const affiliateAds = page.locator('.affiliate-ad, .affiliate-advertising, [data-affiliate-ad]');
    await expect(affiliateAds.first()).toBeVisible();

    // 5. Validate schema.org structured data on actor page
    await validateSchemaOrg(page, 'Actor Portal (actor.html)');

    // 6. Capture verification screenshot
    await page.screenshot({ path: path.join(resultsDir, 'actor_portal.png'), fullPage: true });
  });

  test('R4 & R5: Dashboard is gated; unauthorized access (no token) renders Lockscreen', async ({ page }) => {
    // 1. Visit dashboard without token
    await page.goto('/dashboard.html');

    // 2. Verify that Lockscreen is rendered
    const lockscreen = page.locator('.lockscreen-overlay, #lockscreen-gate, .obsidian-lockscreen');
    await expect(lockscreen).toBeVisible();

    // 3. Verify dashboard content is blocked/hidden/empty
    const appContainer = page.locator('.app-container');
    // The main dashboard content should be hidden or inactive
    await expect(appContainer).not.toBeVisible();

    // 4. Verify obsidian theme indicators (e.g. check background styles or specific dark classes)
    const bodyClass = await page.getAttribute('body', 'class');
    const lockscreenText = await page.textContent('body');
    expect(lockscreenText).toContain('Clearance'); // lockscreen message should mention clearance/clearance code
    
    // 5. Capture verification screenshot
    await page.screenshot({ path: path.join(resultsDir, 'dashboard_lockscreen.png'), fullPage: true });
  });

  test('R4: Dashboard is accessible when visited with a valid route token', async ({ page }) => {
    const token = 'MMM-CONSULT-AUTHORIZED';
    
    // 1. Visit dashboard with a valid token
    await page.goto(`/dashboard.html?token=${token}`);

    // 2. Verify dashboard content is visible and lockscreen is NOT rendered
    const appContainer = page.locator('.app-container');
    await expect(appContainer).toBeVisible();
    
    const lockscreen = page.locator('.lockscreen-overlay, #lockscreen-gate, .obsidian-lockscreen');
    await expect(lockscreen).not.toBeVisible();

    // 3. Verify dashboard loads mock-data and components (preflight, overall score, etc.)
    const scoreVal = page.locator('#overall-score-val');
    await expect(scoreVal).toBeVisible();

    // 4. Capture verification screenshot
    await page.screenshot({ path: path.join(resultsDir, 'dashboard_authorized.png'), fullPage: true });
  });

  test('Secure Client Auth: Registering a client via prequalifier form and loading the dashboard', async ({ page }) => {
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text(), 'type:', msg.type()));
    page.on('pageerror', err => console.error('BROWSER PAGE ERROR:', err.message));

    const randomEmail = `test-client-${Math.random().toString(36).substring(7)}@gmail.com`;
    const randomPassword = 'TestPassword123!';
    const randomBrand = 'Acme Test Brand';
    
    // 1. Visit SaaS landing page
    await page.goto('/');
    
    // 2. Fill out prequalifier form
    await page.fill('#intake-url', 'https://acmetest.com');
    await page.fill('#intake-brand', randomBrand);
    await page.fill('#intake-keyword', 'Test Keyword');
    await page.fill('#intake-email', randomEmail);
    await page.fill('#intake-password', randomPassword);
    
    // 3. Submit the form
    await page.click('#intake-submit-btn');
    
    // 4. Expect redirection to gateway.html with MMM-CLIENT- token in query
    await expect(page).toHaveURL(/.*gateway\.html\?token=MMM-CLIENT-.*/, { timeout: 15000 });
    
    // Extract token from URL
    const currentUrl = page.url();
    const tokenParam = new URL(currentUrl).searchParams.get('token') || '';
    expect(tokenParam.startsWith('MMM-CLIENT-')).toBe(true);
    
    // 5. Navigate to dashboard.html with this token
    await page.goto(`/dashboard.html?token=${tokenParam}`);
    
    // 6. Verify dashboard content is visible and lockscreen is NOT rendered
    const appContainer = page.locator('.app-container');
    await expect(appContainer).toBeVisible();
    
    const lockscreen = page.locator('#lockscreen-gate');
    await expect(lockscreen).not.toBeVisible();
    
    // Verify brand name is set on the dashboard
    await expect(page.locator('.logo-text .accent-text')).toContainText(randomBrand);
    
    // 7. Test Logout functionality
    await page.click('#logout-btn');
    await expect(page).toHaveURL(/.*index\.html/);
  });

});
