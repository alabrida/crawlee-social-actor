# walkthrough.md: apify_actor

## Component Dashboard (Crawlee social media scraping actor)

### 1. Packages & Core Scraper
- [x] Core Scraper Library (`packages/core-scraper`)
  - [x] Entrypoint & Router (`packages/core-scraper/src/index.ts`, `packages/core-scraper/src/routes.ts`)
  - [x] Scraper runner (`packages/core-scraper/src/runner.ts`)
  - [x] Scoring engine (`packages/core-scraper/src/scoring/engine.ts`)
  - [x] Mode Gate / Feature flagging (`packages/core-scraper/src/utils/mode-gate.ts`)

### 2. Actor Wrappers (Deployment Tiers)
- [x] Agency Actor (`apps/agency-actor`) - INTERNAL Mode
- [x] Marketplace Actor (`apps/marketplace-actor`) - PUBLIC Mode
- [x] SaaS Actor (`apps/saas-actor`) - SAAS Mode

### 3. Web UI & Gateway Portal
- [x] Assessment UI (`apps/assessment-ui`)
  - [x] Token Router (`apps/assessment-ui/index.html`)
  - [x] SaaS landing page (`apps/assessment-ui/index.html`)
  - [x] Consulting Gateway (`apps/assessment-ui/gateway.html`)
  - [x] Apify Actor Portal (`apps/assessment-ui/actor.html`)
  - [x] Secure Dashboard Guard (`apps/assessment-ui/dashboard.html` / `dashboard.js`)

## Service Health
- **Hygiene Score:** 100% (VDO Mandate active)
- **Deployment Status:** Monorepo with worktrees set up under `D:/products`
- **Worktree mapping:**
  - `D:/products/apify_actor` -> Branch `apify_actor` (PUBLIC mode / open marketplace)
  - `D:/products/consult_intake` -> Branch `consult_intake` (INTERNAL mode / consultant gateway)
  - `D:/products/saas_offering` -> Branch `saas_offering` (SAAS mode / subscription funnel)

## Visual Verification
- [x] Git worktrees verified: `git worktree list` shows all three subfolders under `D:/products/` correctly configured.
