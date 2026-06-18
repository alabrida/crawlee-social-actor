# Product Requirements Document — Crawlee Social Media Scraping Actor & Diagnostic Engine

> **Version:** 2.0 · **Date:** June 9, 2026 · **Status:** Updated & Approved

---

## 1. Executive Summary

Build a unified **Apify Actor** powered by [Crawlee](https://crawlee.dev/) and a **Diagnostic Web Interface** that scrapes public profile, content, and search data from **8+ social media platforms, search engines, and general business websites**. 

The system operates in two core operational modes (SaaS/Marketplace Mode and Consultant/Internal Mode) to extract, grade, and catalog revenue journey indicators, CTAs, and profile forensics. It prioritizes authenticating via actual user accounts (through interactive logins), uses manual cookie injection as an administrative fallback, and upserts final reports directly into a **Supabase database** for internal review.

---

## 2. Business Context & Goals

| Goal | Description |
|---|---|
| **Multi-Platform Coverage** | Scrape TikTok, YouTube, LinkedIn, Google Business Profile (Maps), Pinterest, Reddit, Facebook, Instagram, SEO (SerpApi), and general business hubs from a single actor. |
| **Interactive Authentication** | Prioritize authenticating with actual user accounts using secure, interactive logins (Playwright Live View), capturing session state automatically. Use manual cookie injection strictly as an administrative fallback. |
| **Rubric Scoring Engine** | Evaluate social profiles and general websites across 9 distinct weighted diagnostic dimensions, computing a master score. |
| **Direct Database Integration** | In Consultant/Internal Mode, upsert scored profiles and diagnostic metrics directly to Supabase table structures. |
| **Discovery Form Integration** | Feed the actor input queue directly via discovery form payload variables mapping. |
| **Zero Installation Fallback** | Allow users without the Chrome Extension to authenticate using a direct web auth wall that hosts interactive logins and manual fallback fields. |

---

## 3. Constraints & Budget Parameters

| Constraint | Value |
|---|---|
| Monthly Compute Budget | $100 (≈ 333 CU @ $0.30/CU) |
| Residential Proxy Bandwidth | 10 GB/month |
| Hosting | Apify Cloud & Supabase |
| Runtime | Node.js (TypeScript, Crawlee, Playwright) |
| UI Stack | Vanilla HTML, CSS, JavaScript (served via Node.js static server) |

---

## 4. Core Architecture & Auth Flow

### 4.1 Hybrid Crawler Strategy
The actor selects the optimal crawler per target platform:
- **CheerioCrawler (Low Cost):** Reddit (uses public `.json` endpoints), Pinterest (public JSON), YouTube (if screenshots disabled), and general parsing.
- **PlaywrightCrawler (Stealth browser):** LinkedIn, Facebook, Instagram, Twitter/X, TikTok (stealth mode), Google Maps, and Cloudflare-protected business sites.

### 4.2 Auth Priority & Vaulting
To access profiles behind login walls (LinkedIn, Facebook, Instagram, Twitter/X), the system follows a strict auth priority order:
1. **Interactive Login (Primary):** Actor opens a real browser session via Apify Live View. The user completes the login and any 2FA/CAPTCHA challenges. Playwright automatically extracts the resulting cookies via `page.context().storageState()`.
2. **Stored Sessions (Auto):** Cookies are persisted in Apify Key-Value Store (`AUTH_SESSION_VAULT`). The vault enforces a **20-day hard refresh** rule; if older than 20 days, it alerts the user to re-authenticate.
3. **Manual Cookie Injection (Admin Fallback):** The admin user can manually copy cookie keys (like `li_at`, `c_user`, etc.) from browser DevTools and inject them directly via the Web Auth Wall.

---

## 5. UI & Authentication Gateway

The diagnostic system provides a landing interface with two clear connection paths:
- **Browser Extension Sync (Option 1):** Syncs active credentials directly from currently open browser tabs to Supabase/Apify.
- **Direct Web Authentication (Option 2):** A platform login wall containing cards for LinkedIn, Facebook, Instagram, and Twitter/X (the platforms requiring session auth). It houses two tabs:
  1. **Account Login (Primary):** Triggers interactive Playwright login steps in a secure connection terminal.
  2. **Manual Cookie Injection (Fallback):** Administrative fallback form with per-platform cookie fields (`li_at`, `JSESSIONID`, `c_user`, `xs`, `ds_user_id`, `sessionid`, `auth_token`).

---

## 6. Input Schema (Updated)

```jsonc
{
  "urls": [
    { "platform": "linkedin", "url": "https://www.linkedin.com/in/username" },
    { "platform": "facebook", "url": "https://www.facebook.com/username" }
  ],
  "interactiveSessionSetup": false, // True to trigger Playwright Live View connection setup
  "authTokens": {
    "linkedin": "li_at=xxxxxx; JSESSIONID=xxxxxx;", // Overrides vault if provided
    "facebook": "c_user=xxx; xs=xxx;",
    "instagram": "ds_user_id=xxx; sessionid=xxx;",
    "twitter": "auth_token=xxx;"
  },
  "businessUrl": "https://example.com", // General business hub website
  "serpApiKey": "xxx", // SerpApi key for SEO audits
  "targetKeywords": ["keyword1", "keyword2"],
  "actorMode": "INTERNAL", // INTERNAL (Consultant Mode with Supabase upsert) or SaaS/Marketplace
  "supabaseUrl": "https://xxx.supabase.co",
  "supabaseServiceRoleKey": "xxx",
  "maxConcurrency": 5,
  "takeScreenshots": true
}
```

---

## 7. Output Schema & Scoring Hand-off

Scraped profiles are aggregated and processed by the **Rubric Scoring Engine**, yielding a normalized diagnostic JSON output:

```jsonc
{
  "brandName": "Example Business",
  "businessUrl": "https://example.com",
  "overallScore": 84,
  "class": "Tier 1",
  "dimensions": {
    "linkedin": { "score": 88, "ctas": ["Book Consultation"], "followers": 15200 },
    "facebook": { "score": 75, "ctas": ["Shop Now"], "followers": 3200 },
    "instagram": { "score": 90, "ctas": ["Link in Bio"], "followers": 45000 },
    "seo": { "score": 80, "organicRank": 4, "siteSpeedScore": 88 }
  },
  "rawForensics": { ... },
  "scrapedAt": "2026-06-09T22:30:00Z"
}
```

In `INTERNAL` mode, this structured payload is directly upserted into the Supabase database.

---

## 8. Risk Register & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Account bans from scraping | Medium | High | Rely on user's actual authenticated sessions with residential proxy routing + stealth fingerprints. Avoid automated robotic typing; capture cookies instead. |
| Session cookie expiry | High | Medium | Implement the 20-day Session Vault hard refresh policy with proactive alerts on the dashboard. |
| CAPTCHA blocks during automated login | High | High | Shift authentication to **Interactive Login** (Playwright Live View), allowing users to solve challenges manually. Fall back to manual cookie injection if interactive flows fail. |
| Blank dashboards | Medium | Medium | Implement an Auth Gate that redirects unauthenticated sessions back to the landing gate page before showing a blank dashboard. |

---

## 9. References

- [Architecting High-Efficiency Crawlee Actors for Social Media Scraping](file:///D:/automation/apify_actor/Documentation/Architecting%20High-Efficiency%20Crawlee%20Actors%20for%20Social%20Media%20Scraping.md)
- [Discovery Form Payload Specification](file:///D:/automation/apify_actor/Documentation/Discovery_Form_Payload_Spec.md)
- [Value Ledger & Sprint History](file:///D:/automation/apify_actor/Documentation/value-ledger.md)
