# Project: Map More Money SaaS UI and Routing Gateway

## Architecture
- **Web App Directory**: `apps/assessment-ui`
- **Routing Engine**: Client-side query string router parsing `?token=...` at entry point (`index.html`).
- **SaaS Conversion Funnel**: Interactive landing page (`index.html`) using standard prequalifier.
- **Consulting Pathway**: Gateway portal (`gateway.html`) for Web sync and Extension sync.
- **Apify Actor Pathway**: Specialized layout (`actor.html`) with affiliate ads and JSON download/Email report/Dashboard creation actions.
- **Security Gatekeeper**: Client-side route-token check on `/dashboard.html`, falling back to Obsidian-themed lockscreen view.
- **Data Ingestion**: Direct-to-Supabase upsert client workflow (bypassing n8n orchestration trigger boundary).
- **SEO/GEO Metadata**: JSON-LD structured schemas (`schema.org`) defining BreadcrumbList, WebPage, and Service objects on every page.

## Code Layout
- `apps/assessment-ui/index.html` - Primary entry and SaaS landing page (token router script handles redirects)
- `apps/assessment-ui/gateway.html` - Connection gateway (formerly index.html)
- `apps/assessment-ui/actor.html` - Apify Actor simplified portal
- `apps/assessment-ui/dashboard.html` - Analytics dashboard with embedded lockscreen overlay/views
- `apps/assessment-ui/dashboard.js` - Dashboard logic and token gating
- `apps/assessment-ui/auth-gate.html` - Account authentication page
- `apps/assessment-ui/server.js` - Local testing server (port 3001)

## Milestones
| # | Name | Scope | Dependencies | Status | Conversation ID |
|---|---|---|---|---|---|
| M1 | E2E Playwright Test Suite | Set up Playwright runner, test cases for all paths, stubs validation | None | DONE | 6e1c203f-3966-495a-8236-1b32abcc2052 |
| M2 | Token Router & Gateway Extraction | Extract gateway, implement index.html router, handle query parameters | M1 | DONE | 278cb988-2b59-4366-80a7-8204d8ff47bc |
| M3 | 5-Stage SaaS Landing Page | Redesign index.html as 5-stage funnel, Alabrida branding, ad placeholders | M2 | DONE | 278cb988-2b59-4366-80a7-8204d8ff47bc |
| M4 | Apify Actor Portal | Implement actor.html with output options (JSON, Email, Dashboard) | M2 | DONE | 278cb988-2b59-4366-80a7-8204d8ff47bc |
| M5 | Dashboard Lockscreen Guard | Gated dashboard access via route token validation, Obsidian lockscreen | M2 | DONE | 278cb988-2b59-4366-80a7-8204d8ff47bc |
| M6 | Supabase & SEO Integration | Supabase data capture boundary, Schema.org JSON-LD objects on all pages | M3, M4, M5 | DONE | 244039f9-8a64-4b24-a33a-d06523fa9b40 |
| M7 | E2E Hardening & Auditing | Pass all Playwright tests, generate screenshots, Forensic Auditor sweep | M6 | DONE | 5a181bed-79b9-4d19-9d7e-9262005749ff |

## Interface Contracts
### Client Router ↔ Gateway / Actor / SaaS Landing
- Entry parameter: `?token=MMM-CONSULT-xxx` or `?token=MMM-ACTOR-xxx`
- Redirect: Preserves the query parameters in the URL so subsequent pages (like dashboard.html) can read them.
- Target Pages:
  - SaaS Path: Remains on `index.html` (without redirect)
  - Consulting Path: Redirects to `gateway.html?token=MMM-CONSULT-xxx`
  - Apify Actor Path: Redirects to `actor.html?token=MMM-ACTOR-xxx`

### Dashboard Route Guard
- Session state or query token: Checks `token` parameter in URL or sessionStorage.
- Valid tokens format: Starts with `MMM-CONSULT-` or `MMM-ACTOR-`.
- Action if invalid: Blocks UI loading, clears active page content, overlays Obsidian-themed Lockscreen.

## Phased Deployment Roadmap (Resource-Constrained Flow)
To optimize resource usage and align development timelines, the rollout is structured sequentially:

1. **Phase 1: Consult Intake Workflow (Active)**
   - **Branch**: `consult_intake` ([consult_intake](file:///D:/products/consult_intake))
   - **Actor Silo**: `INTERNAL` (Private Consultant Audit Tool via `apps/agency-actor`)
   - **Data Pathway**: Direct-to-Supabase upsert.
   - **Status**: Ready for E2E validation and Apify push.

2. **Phase 2: Public Apify Actor (Pending)**
   - **Branch**: `apify_actor` ([apify_actor](file:///D:/products/apify_actor))
   - **Actor Silo**: `PUBLIC` (Unified Social Media Scraper via `apps/marketplace-actor`)
   - **Data Pathway**: Clean JSON download / CSV exports (no Supabase write).
   - **Status**: Scheduled.

3. **Phase 3: SaaS Offering (Pending)**
   - **Branch**: `saas_offering` ([saas_offering](file:///D:/products/saas_offering))
   - **Actor Silo**: `SAAS` (Subscription Engine via `apps/saas-actor`)
   - **Data Pathway**: Full Schema Parity, Tier Gating enabled.
   - **Status**: Scheduled.

