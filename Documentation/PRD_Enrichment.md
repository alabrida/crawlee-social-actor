# PRD — Phase 2: Full Revenue Journey Enrichment (Marketplace Ready)

> **Version:** 2.3 · **Date:** March 14, 2026 · **Status:** Draft

---

## 1. Executive Summary
Phase 2 transforms the unified scraper into a **High-Resolution Revenue Journey Engine**. This iteration is designed for **maximum scalability** and **high Open Marketplace value** on Apify. By consolidating multi-platform scraping, deep link forensics, and structured data enrichment into a single serverless Actor, we provide a "One-Stop Shop" for digital presence auditing that outperforms fragmented single-platform scrapers.

---

## 2. Scalability Audit (Engine Architecture)

### 2.1 Serverless Enrichment
- **Internal Logic:** By moving parsing/logic *inside* the Actor, we eliminate bottlenecks in external middleware (like n8n or Supabase functions).
- **Concurrency:** Apify's `AutoscaledPool` automatically matches CPU/Memory to traffic, allowing the Actor to scale from 1 profile/min to 1,000+ profiles/min without code changes.

### 2.2 Session & Auth Scaling
- **Session Vault:** The 20-day re-auth logic ensures that even as user volume increases, the "trust reputation" of the scraper remains high, reducing per-request failure costs.

---

## 3. Apify Marketplace Value Proposition

This Actor is uniquely positioned to compete on the Apify Store against "Single Platform" scrapers:

| Marketplace Edge | Description | Why it Sells |
| :--- | :--- | :--- |
| **Unified Intelligence** | Scrapes 9 platforms + Hub + Google SERP in one run. | Users save money by not paying for 11 different Actors. |
| **Deep Link Forensics** | Bypasses the need for expensive SEO APIs by following bio-links and link-trees. | High value for marketing agencies and lead-gen firms. |
| **WAF Resilience** | Built-in handling for Cloudflare/DataDome on general business sites. | Robust "it just works" reputation compared to cheaper, brittle scrapers. |
| **Zero-API Dependency** | Delivers high-res data without requiring the user to manage platform API keys. | Lower barrier to entry for non-technical users. |

---

## 4. Crawler-First Optimization: Deep Link Forensics

### 4.1 Redirection & Strategy Audit
- Follow every bio link to identify tracking hygiene (UTMs) and link-tree optimization.
- **Marketplace Hook:** Provide a "Link Strategy Score" as a unique output field.

### 4.2 Hub-to-Social Reciprocity
- Deep crawl business hub footers to validate social link consistency.

---

## 5. Comprehensive Data Gap Mapping (100% Table Parity)
- **Mandatory Twitter/X:** 16 columns for full parity.
- **Advanced SEO:** Google Search integration for `serp_ranking_position`.
- **Structured Math:** Converters for numeric counts ("1.2M" -> Int).

---

## 6. New Specialized Agent Lineup

1.  **Link-Strategist Agent:** Owns ecosystem connectivity and redirection audits.
2.  **Marketplace-Optimizer Agent (NEW):** Audits output schema for Open Store compatibility (Readme, Input UX).
3.  **PW-Twitter Agent:** Owns Twitter/X extraction.
4.  **SEO-Analyst Agent:** Owns Google SERP logic.
5.  **Math Agent:** Owns numeric parsing and scoring.

---

## 7. Updated Workflow: The Marketplace Delivery Cycle

1.  **🔴 RED:** Identify platform gaps.
2.  **🟢 GREEN:** Extract raw signals.
3.  **🟣 ENRICH:** Structure data and perform Deep-Link audit.
4.  **🟡 MODULARIZE:** Standardize code quality.
5.  **🔵 HARDEN:** Verify accuracy and measure CU scaling.
6.  **✅ SHIP:** Update n8n payload and Open Marketplace documentation.
