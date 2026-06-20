# @alabrida/core-scraper

Core crawling, routing, scraping, and scoring engine for the social media scraper Actor monorepo.

## Overview

This package encapsulates the Crawlee-based web crawler logic and business assessment engines. It is imported by the silo wrapper applications (`apps/agency-actor`, `apps/marketplace-actor`, `apps/saas-actor`) to run different diagnostic audits.

## Directory Structure

```text
packages/core-scraper/
├── src/
│   ├── handlers/         # Platform-specific scraper handlers (youtube, tiktok, reddit, etc.)
│   ├── scoring/          # Revenue Journey Scoring Engine (rubric checks, NAICS mapping)
│   ├── utils/            # Authentication, logging, mode gates, and health checkers
│   ├── main.ts           # Main Actor initialization and lifecycle control
│   ├── runner.ts         # Cheerio and Playwright crawler runners
│   └── types.ts          # Core Types & Platform-to-Crawler mappings
├── scripts/              # Local testing, utility, and maintenance scripts
└── package.json          # Package configuration and dependencies
```

## Features

- **Hybrid Crawler Approach**: Routes CheerioCrawler (low CPU/high speed) for lightweight platforms (like Reddit) and PlaywrightCrawler (stealth browser) for heavy-stealth walls (like LinkedIn, FB/IG, TikTok, YouTube).
- **Session Vault & Stealth Auth**: Dynamic token rotation, cookie injection, and pre-flight session health checking.
- **Scoring Engine**: Evaluates commercial maturity tiers, NAICS classifications, and maps primary revenue bottlenecks.
- **Security Gates**: Direct Supabase ingestion boundaries gated strictly based on the operational silo mode.

## Silo Modes

The scraper gates features based on `process.env.ACTOR_MODE`:
1. **INTERNAL (Consultant Audit)**: Performs high-resolution scoring, forensic checks, and runs direct Supabase upserts for consultant dashboard intake.
2. **PUBLIC (Marketplace Scraper)**: Restricts direct database writes and focuses on raw, private exports (JSON/CSV downloads).
3. **SAAS (SaaS Diagnostics)**: Enables full tier-gating features for subscription-based client accounts.

## Local Development & Testing

Run unit tests via vitest:
```bash
npm run test
```
