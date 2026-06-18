# Alabrida Actors: Crawlee Social Media Scraper

Monorepo containing the Crawlee-based social media scraper actor used in Alabrida workflows.

## Directory Structure

- `packages/core-scraper`: Core crawling, routing, scraping, and scoring logic.
- `apps/agency-actor`: Wrapper for internal consultant audits.
- `apps/marketplace-actor`: Wrapper for the open marketplace actor.
- `apps/saas-actor`: Wrapper for subscription SaaS diagnostics.
- `apps/assessment-ui`: Web portal and diagnostic gateway UI.

## Workflows and Routes

The actor feeds 3 workflows in the `D:/products` directory:
1. `D:/products/apify_actor` (branch `apify_actor`): Public Marketplace actor route.
2. `D:/products/consult_intake` (branch `consult_intake`): Internal Consultant route.
3. `D:/products/saas_offering` (branch `saas_offering`): Subscription SaaS route.

Worktrees are mapped to these directories to allow parallel development on each route.
