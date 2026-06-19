# Productization & Branding Strategy: Alabrida Revenue Journey Diagnostic (RJD)

> **Authority:** Alabrida (alabrida.org) & Richard Norwood, PMP (richardnorwood.com) · **Date:** June 19, 2026 · **Status:** APPROVED

This document serves as the **Single Source of Truth (SSOT)** for productization, naming, branding, and verbiage standards across the scraper engine, browser extensions, gateways, and client interfaces.

---

## 1. Brand Hierarchy & Relationships

Our strategy integrates the personal brand of the founder, the enterprise parent organization, and the SaaS product into a unified commercial experience.

```mermaid
graph TD
    subgraph Personal Brand & Thought Leadership
        Founder[Richard Norwood, PMP - richardnorwood.com] -->|Thought Leadership & Content| Public[Public Audience]
    end

    subgraph Enterprise Parent
        Alabrida[Alabrida Revenue Architects LLC - alabrida.org] -->|Productizes| UCE[Unified Commercial Engine]
    end

    subgraph SaaS Campaign & Tooling
        MMM[MapMoreMoney.com - SaaS Campaign] -->|Sponsors| Founder
        Alabrida -->|Owns & Powers| MMM
        Actor[Apify Marketplace Actor: RJD Scanner] -->|Top of Funnel Discovery| MMM
    end

    subgraph Core Tool Belt (Current Scope)
        RJD[Revenue Journey Diagnostic - RJD] -->|High Access| Consult[Consulting Workflow / Audits]
        RJD -->|Standard Customization| DIY[SaaS DIY Dashboards]
    end
```

### 1.1 Brand Identity Directory
1.  **The Thought Leader & Founder**: **Richard Norwood, PMP** ([richardnorwood.com](file:///D:/products/richardnorwood.com)). Richard is the founder and primary Revenue Architect affiliate of Alabrida.
2.  **The Enterprise Institution**: **Alabrida Revenue Architects LLC** ([alabrida.org](file:///D:/products/alabrida.org)). Alabrida is responsible for the productization of the Unified Commercial Engine.
3.  **The SaaS campaign / Product**: **MapMoreMoney.com** (MMM). A subsidiary of Alabrida and official sponsor of Richard Norwood, PMP. It is the landing page for the SaaS actor.
4.  **The Public Discovery Point**: **Apify Marketplace Actor**. The top-of-funnel lead generator for MapMoreMoney.com, powered by Alabrida.
5.  **The Core Diagnostic Tool**: **Revenue Journey Diagnostic (RJD)**. The tool used in Richard's high-access consulting workflow, as well as the custom DIY dashboard.
6.  **The Credential Sync Utility**: **MapMoreMoney Sync** (MMM Sync). The browser extension that extracts session cookies securely without password sharing, branded directly under the SaaS product.

---

## 2. Page Designations & Funnel Strategy (apps/assessment-ui)

Within the current monorepo scraper project:

### 2.1 `index.html`: The Personal Brand / Consulting Portal
*   **Role**: Serves as the landing page for the **Consulting Workflow / Personal Brand (Richard Norwood, PMP)**.
*   **Sponsorship**: Explicitly branded as **sponsored by MapMoreMoney.com, powered by Alabrida**.
*   **Lead Magnets**: Features Richard's core lead magnets: **Health Check**, **Blueprint**, and **Audit**, all branded as sponsored by MapMoreMoney.com and powered by Alabrida.
*   **Access Control**: Acts as the gatekeeper. From this page, the user can launch the high-access Consulting Scan or transition to the SaaS dashboard.

### 2.2 `gateway.html`: Consulting Onboarding Gate
*   **Role**: Renders the connection gate for Richard's high-access consulting clients to link their active platforms (via MapMoreMoney Sync or Playwright Interactive Login).

### 2.3 `actor.html`: Simplified Actor Portal
*   **Role**: Renders the simplified view for users coming from the Apify Marketplace. Serves as the elevator pitch for MapMoreMoney.com, powered by Alabrida.

### 2.4 `dashboard.html`: Analytics Console
*   **Role**: Renders the **Revenue Architect Console** for Richard Norwood's consulting audits (highest access level) and acts as the target for SaaS dashboard creation.

---

## 3. UI Copy Overhaul Specifications

### 3.1 `index.html`
*   **Title**: Change to `Richard Norwood, PMP — Revenue Architect & Advisory`
*   **Hero**: Position Richard Norwood as the Thought Leader and Founder, sponsored by MapMoreMoney.com, powered by Alabrida. Headline focuses on deploying the Unified Commercial Engine.
*   **Lead Magnets**: Render three cards:
    1.  **Revenue Footprint Scan (Health Check)**: Instantly detect initial pipeline drop-offs.
    2.  **22-Point Diagnostic Blueprint**: Structured evaluation of B2B and B2C channels.
    3.  **Unified Commercial Engine Audit**: Deep advisory partnership to shorten sales cycles.
*   **Navbar & Branding**: Incorporate `richardnorwood.com` logo and style guidelines.

### 3.2 `gateway.html`
*   **Title**: `Consulting Connection Gateway — Richard Norwood, PMP`
*   **Branding**: Under the personal brand of Richard Norwood, PMP, sponsored by MapMoreMoney.com, powered by Alabrida.

### 3.3 `actor.html`
*   **Title**: `MapMoreMoney.com — Apify Console`
*   **Header**: Positioned as the top-of-funnel entry point for MapMoreMoney.com, powered by Alabrida.

### 3.4 `dashboard.html`
*   **Title**: `Revenue Architect Console — Richard Norwood, PMP`
*   **Branding**: `RICHARD NORWOOD, PMP | REVENUE ARCHITECT` header. Displays the RJD diagnostic results.
*   **Drawer**: Rebrand the Moat Sync drawer to "MapMoreMoney Sync".
