# Value Ledger

Records the accumulated shippable value increments delivered by the team.

## Sprint 1: TikTok Baseline Extraction

**Value Increment Definition:**
Provide a fully authenticated and anti-bot resilient Playwright extractor for TikTok profiles that can reliably bypass initial CAPTCHAs and return structured data about the user's revenue indicators (links, CTAs) and full profile HTML block for downstream parsing.

**Delivery Evidence (TikTok Shipped):**

- **Validation:** 100% success rate on 16 diverse influencer profiles (HARDEN Sweep).
- **Correctness:** Output dataset conforms to the expected `INPUT_SCHEMA.json` and internal validation schemas, verified via e2e `main.ts` run resulting in `errors: []`.
- **Infrastructure Integrations:** Successfully wired into the unified Apify Actor routing structure and logs properly to standard out datasets.
