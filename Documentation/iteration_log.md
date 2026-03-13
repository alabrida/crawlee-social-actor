# Iteration Log

### Iteration 1 (Project Setup & Cheerio Baseline)
- **Goal:** Initialize project, set up configuration, and implement basic CheerioCrawler.
- **Changes:**
  - Scaffolding project.
  - Adding type definitions.
  - Creating `tiktok.ts` Cheerio base handler.
- **Validation:** 
  - Ran against a basic static HTML file (GREEN). 
  - Encountered CAPTCHAs and SSR blocking on live URLs.
- **Status:** FAIL (Blocked on TikTok anti-bot).

### Iteration 2 (TikTok Migration to Playwright & Harden)
- **Goal:** Resolve TikTok blocking issues and validate Playwright extractor against CAPTCHA and anti-bot measures.
- **Changes:**
  - Migrated `tiktok.ts` handler to use Playwright instead of Cheerio.
  - Mitigated Blockers BLOCK-001 (TikTok DOM structural changes) and BLOCK-002 (TikTok Bot Detection & CAPTCHA).
  - Updated validator to skip requiring revenue links array to be non-empty (as users like Bella Poarch have valid bios with no links).
- **Validation:**
  - Successfully passed GREEN validation for a single URL using `PlaywrightCrawler`.
  - Processed 16 diverse URLs locally during HARDEN validation phase.
  - Success Rate: 16/16 (100%), 0 fails.
  - Extractor Runtime: 16 requests processed over ~293 seconds. Average request duration ~40s.
  - Proxy Type: `RESIDENTIAL`.
- **Status:** PASS (SHIPPED). Integrated into the master router and validated.
