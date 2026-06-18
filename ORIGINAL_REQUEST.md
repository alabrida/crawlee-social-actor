# Original User Request

## Initial Request — 2026-06-11T15:36:29Z

The objective of this project is to develop and refine the frontend user interface for the Map More Money SaaS application (located in `apps/assessment-ui`). The UI must serve as a high-end, conversion-focused B2B portal that coordinates three access pathways (SaaS, Consulting, and Apify Actor) using a unified tokenized routing system.

Working directory: D:\automation\apify_actor\apps\assessment-ui
Integrity mode: benchmark

---

## Requirements

### R1. 5-Stage Journey SaaS Landing Page (`index.html`)
- Redesign `index.html` as a premium B2B conversion engine structured around the **5-stage commercial framework**:
  1.  **Awareness**: Explain the "Revenue Footprint Scan" and address visibility symptoms.
  2.  **Consideration**: Explain the 22-point diagnostic scoring rubric.
  3.  **Decision**: Highlight trust indicators (read-only architecture, password-less session vaults, compliance with privacy rules).
  4.  **Conversion**: Feature prominent CTAs to start the scan.
  5.  **Retention**: Showcase ongoing monitoring, alerts, and dashboard features.
- **Sponsorship & Ad Slots**: Integrate dedicated layout modules highlighting **Alabrida** (the parent brand) at the sponsorship level, and placeholder slots demonstrating future advertising opportunities.
- **Visuals**: Maintain visual continuity with the signature starfield canvas background and Outfit/Inter typography. Incorporate smooth CSS micro-animations. Enforce a strict constraint: no dollar signs ($) or cheap currency badges.

### R2. Three-Path Tokenized Router & Gateway
Implement a tokenized router in the frontend scripts that detects the query parameter (`?token=...`) and directs traffic down one of three access pathways:
1.  **SaaS Path (Default / No Token)**: User lands on the conversion-focused landing page and proceeds through the standard funnel and prequalifier.
2.  **Consulting Path (`?token=MMM-CONSULT-xxx`)**: Bypasses the landing page/funnel and goes straight to the connection gateway page (account selection: Web vs Extension sync) to allow clients to run the scraper immediately.
3.  **Apify Actor Path (`?token=MMM-ACTOR-xxx`)**: Renders a simplified, lean layout with affiliate advertising that delivers on actor expectations without the full SaaS funnel bloat. It provides clear user output options:
    - Simple JSON payload download (bypassing the platform entirely).
    - Email report option.
    - Dashboard creation option (upsells to the SaaS).

### R3. Supabase Ingestion Boundary & SEO/GEO Priority
- **Execution Boundary**: The automated workflow must complete the data capture and upsert the payload to the Supabase database, stopping *just before* triggering the n8n orchestration webhook.
- Include well-defined endpoints/stubs for future automation logging.
- **High Priority**: Optimize all pages for SEO/GEO rendering and ensure strict alignment with `schema.org` structured data schemas (using BreadcrumbList, WebPage, and Service objects).

### R4. Security Gatekeeper Lockscreen
- Configure the dashboard scripts to verify the presence of a valid route token.
- If a user attempts to access `/dashboard.html` without a token, block access and render an obsidian-themed lockscreen directing them to get clearance.

### R5. Verification Script
- Implement a Playwright verification script in the workspace that validates:
  1. Default entry renders the landing page correctly.
  2. Visiting with `?token=MMM-CONSULT-xxx` bypasses the landing page to the connection gateway.
  3. Visiting with `?token=MMM-ACTOR-xxx` renders the simplified actor page with the three output options.
  4. Visiting the dashboard without a token renders the lockscreen.
  5. Captures verification screenshots of each path and logs all schema.org validations.

---

## Acceptance Criteria

### Domain Routing & Access
- [ ] Direct access (no token) loads the 5-stage SaaS landing page featuring Alabrida sponsorship branding and ad slots.
- [ ] Access with `?token=MMM-CONSULT-` bypasses the landing page, rendering the gateway page (Web vs Extension connect) directly.
- [ ] Access with `?token=MMM-ACTOR-` loads the simplified interface showing JSON payload, Email, and Dashboard setup options.

### Security & Gates
- [ ] `/dashboard.html` visited without a token successfully displays the lockscreen page.
- [ ] `/dashboard.html` visited with a valid token successfully loads the preflight and connection views.

### Technical & Schema Standards
- [ ] Every page includes valid `schema.org` JSON-LD structures for SEO.
- [ ] Form submissions package the payload in accordance with `Discovery_Form_Payload_Spec.md`.
- [ ] Data ingestion completes the upsert to the Supabase database.

### Programmatic Verification
- [ ] The Playwright verification script executes successfully, taking screenshots of all 3 paths and confirming zero console errors.

## Follow-up — 2026-06-11T15:44:52Z

The user has directly updated `index.html` and `dashboard.html` inside `apps/assessment-ui` with:
- The 5-stage conversion journey framework layout, Alabrida sponsorship banner, and ad slots in `index.html`.
- The client-side routing script in `index.html` which redirects `MMM-CONSULT-` tokens to `gateway.html` and `MMM-ACTOR-` tokens to `actor.html`.
- The lockscreen HTML/CSS layout in `dashboard.html`.

Please ensure your team does NOT overwrite these file changes, and instead works on implementing:
- The routing logic and redirection handling.
- Creating the `gateway.html` and `actor.html` files.
- The Javascript logic in `dashboard.js` or `preflight-controller.js` to control the display/visibility toggles of `#lockscreen-gate` and `.app-container` based on token parameters.
- Validating everything against the preview server running on http://localhost:3001.

## Follow-up — 2026-06-11T15:46:26Z

CORRECTION: You do NOT need to preserve the user's manual HTML edits. Use their changes purely as functional references for the routing targets (Consulting -> gateway.html, Actor -> actor.html, lockscreen parameters) and copy layouts. You should overwrite/re-implement the pages using the high-quality, fully branded design standards (obsidian-dark palette, Outfit/Inter typography, premium glassmorphism, and micro-animations) requested in the project prompt.

## Follow-up — 2026-06-11T15:53:08Z

CRITICAL QUALITY FAILURE: The user has flagged the current UI files as looking like generic AI slop with poor visual design, placeholders, and no authentic website mechanics (such as a hero image or rich CSS layouts).

You must immediately execute a design overhaul:
1. Integrate the custom hero graphic `saas_hero_flow.png` (which has been saved in `apps/assessment-ui/saas_hero_flow.png`) into the hero section of `index.html`.
2. Redesign the hero section to look premium: arrange the text and CTA alongside the glowing flow illustration.
3. Remove all generic text placeholders. Replace them with realistic SaaS content, structural layouts, and high-fidelity component designs (e.g. realistic B2B features, client testimonial blocks, interactive gateway cards, and concrete product screenshots).
4. Apply the dark-theme brand assets (obsidian, golds, mints) with advanced CSS (glow filters, hover transforms, glassmorphic card layouts, responsive layouts, and typography offsets) to make the page look like an authentic, high-converting product.

Re-run your verification tests and capture fresh screenshots once complete.
