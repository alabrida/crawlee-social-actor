# Product Requirements Document — Crawlee Social Media Scraping Actor

> **Version:** 1.0 · **Date:** March 12, 2026 · **Status:** Draft

---

## 1. Executive Summary

Build a single, unified **Apify Actor** powered by [Crawlee](https://crawlee.dev/) that scrapes public profile and content data from **8+ social media and business-listing platforms**. The actor must operate within the constraints of the **Apify Creator Plan** ($100/month compute, 10 GB residential proxy bandwidth) by using a **hybrid crawler architecture** that selects the lightest-weight extraction method available for each platform.

---

## 2. Business Context & Goals

| Goal | Description |
|---|---|
| **Multi-Platform Coverage** | Scrape TikTok, YouTube, LinkedIn, Google Business Profile (Maps), Pinterest, Reddit, Facebook, and Instagram from a single actor. |
| **Cost Efficiency** | Stay under the Creator Plan's $100/month compute-unit cap and 10 GB residential proxy limit. |
| **Resilience** | Gracefully handle anti-bot defenses (Cloudflare, DataDome, PerimeterX, TLS fingerprinting, behavioral analysis) without complete run failure. |
| **Data Quality** | Return structured, normalized JSON output regardless of source platform. |

---

## 3. Constraints & Budget Parameters

| Constraint | Value |
|---|---|
| Monthly Compute Budget | $100 (≈ 333 CU @ $0.30/CU) |
| Residential Proxy Bandwidth | 10 GB/month |
| Hosting | Apify Cloud (Creator Plan) |
| Runtime | Node.js (Crawlee SDK) |
| Reference Docs | [Apify Pricing](https://apify.com/pricing/creator-plan) · [Apify Docs](https://docs.apify.com/) · [Crawlee Docs](https://crawlee.dev/js/docs/quick-start) |

---

## 4. Core Architecture — Hybrid Crawler Strategy

The actor **must not** use a single crawler type for every platform. Instead, it selects the optimal crawler per-target:

### 4.1 CheerioCrawler (Low Cost / High Speed)

- **Use for:** Platforms where structured data can be extracted from embedded JSON in raw HTML (no JS rendering needed).
- **Benefit:** Minimal CPU and proxy bandwidth consumption.
- **Applicable Platforms:** TikTok, YouTube, Reddit.

### 4.2 PlaywrightCrawler (High Cost / High Stealth)

- **Use for:** Platforms protected by heavy JavaScript challenges, CAPTCHAs, infinite scroll, or complex SPAs.
- **Benefit:** Full browser context for stealth and interaction.
- **Applicable Platforms:** LinkedIn, Google Business Profile (Maps), Pinterest, Facebook, Instagram, Cloudflare-protected business sites.
- **Mandatory Optimizations:**
  - Block all images, media, and font requests to minimize proxy bandwidth.
  - Launch with `--disable-blink-features=AutomationControlled`.
  - Randomize canvas fingerprints, WebGL settings, and User-Agent strings.

### 4.3 SessionPool Management (All Platforms)

- Tie each session to a unique IP + cookie set + browser fingerprint.
- Use `session.retireOnBlockedStatusCodes()` to automatically discard burned proxies.
- Implement exponential back-off on repeated failures for a given session.

---

## 5. Platform-Specific Requirements

### 5.1 TikTok

| Item | Detail |
|---|---|
| **Crawler** | CheerioCrawler |
| **Anti-Bot Blocker** | Cryptographic API signatures (`X-Bogus`, `msToken`, `_signature`) |
| **Extraction Method** | Parse embedded JSON from `<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__">` or `<script id="SIGI_STATE">` |
| **Target Data** | User profiles, video metadata, engagement stats |

### 5.2 YouTube

| Item | Detail |
|---|---|
| **Crawler** | CheerioCrawler (via Residential Proxy) |
| **Anti-Bot Blocker** | Datacenter IP blacklisting (`403 Forbidden`), n-parameter video signatures |
| **Extraction Method** | Regex-parse `ytInitialData` / `ytInitialPlayerResponse` from `<script>` tags |
| **Target Data** | Channel info, video metadata, view/like/comment counts |
| **Note** | Residential proxy is **required** — datacenter IPs are blocked. |

### 5.3 LinkedIn

| Item | Detail |
|---|---|
| **Crawler** | PlaywrightCrawler (Sticky Residential IP) |
| **Anti-Bot Blocker** | Browser fingerprinting, strict rate limits, geo-inconsistency checks |
| **Extraction Method** | Authenticated DOM scraping with human-like interaction patterns |
| **Target Data** | Profile headlines, experience, education, skills |
| **Rate Limit** | ≤ 250 profiles/day |
| **Delays** | Randomized 2–5 s between interactions |
| **Proxy** | Sticky residential IP matching target profile's geo-location |

### 5.4 Google Business Profile (Maps)

| Item | Detail |
|---|---|
| **Crawler** | PlaywrightCrawler |
| **Anti-Bot Blocker** | Official API result cap (60 per query), fragile CSS selectors |
| **Extraction Method** | Geographic Orchestration — split target region into coordinate grid; query in parallel |
| **DOM Strategy** | Use `aria-label` accessibility attributes (more stable than CSS classes) |
| **Target Data** | Business name, address, phone, star rating, review count, review text |

### 5.5 Pinterest

| Item | Detail |
|---|---|
| **Crawler** | PlaywrightCrawler |
| **Anti-Bot Blocker** | Complex SPA DOM, infinite scroll |
| **Extraction Method** | Scroll page; intercept XHR JSON responses via `page.route()` for image URLs and metadata |
| **Target Data** | Pin images, descriptions, board names, engagement metrics |

### 5.6 Reddit

| Item | Detail |
|---|---|
| **Crawler** | CheerioCrawler (preferred) + SessionPool cookie reuse |
| **Anti-Bot Blocker** | Infinite scroll, strict API rate limits |
| **Extraction Method** | Append `.json` to URLs for raw JSON; authenticate session once and reuse cookies |
| **Target Data** | Subreddit posts, comments, user profiles, vote counts |

### 5.7 Facebook & Instagram

| Item | Detail |
|---|---|
| **Crawler** | PlaywrightCrawler (Persistent Sessions + Residential Proxies) |
| **Anti-Bot Blocker** | Aggressive IP tracking, forced login walls, dynamic GraphQL |
| **Extraction Method** | Parse `window._sharedData` JSON (Instagram); human-like typing and scrolling |
| **Target Data** | Profile info, post content, engagement metrics |
| **Note** | Un-authenticated scraping is severely limited; persistent sessions are critical. |

### 5.8 General Business Websites (Cloudflare / DataDome / PerimeterX)

| Item | Detail |
|---|---|
| **Crawler** | PlaywrightCrawler |
| **Anti-Bot Blocker** | CAPTCHAs, "Verifying you are human" spinners, WAF challenges |
| **Extraction Method** | Stealth headless browser with randomized fingerprints |
| **Target Data** | Variable per site (contact info, reviews, pricing, etc.) |

---

## 6. Non-Functional Requirements

| Requirement | Specification |
|---|---|
| **Output Format** | Normalized JSON per item; stored in Apify Dataset |
| **Error Handling** | Per-request retry with configurable max retries; failed URLs pushed to a separate dataset for manual review |
| **Logging** | Structured logs (platform, URL, status code, extraction method, CU cost estimate) |
| **Session Rotation** | Automatic proxy rotation on blocked status codes via SessionPool |
| **Resource Blocking** | Images, fonts, and media blocked by default in Playwright sessions |
| **Configurability** | Actor input schema allows user to enable/disable specific platforms, set concurrency, provide proxy credentials, and define rate-limit thresholds |
| **Observability** | Expose run statistics: total CU consumed, proxy bandwidth used, items scraped, error rate per platform |

---

## 7. Input Schema (Proposed)

```jsonc
{
  "platforms": ["tiktok", "youtube", "linkedin", "google_maps", "pinterest", "reddit", "facebook", "instagram", "general"],
  "urls": [
    { "platform": "tiktok", "url": "https://www.tiktok.com/@username" },
    { "platform": "youtube", "url": "https://www.youtube.com/@channelname" }
  ],
  "proxy": {
    "useApifyProxy": true,
    "apifyProxyGroups": ["RESIDENTIAL"]
  },
  "maxConcurrency": 5,
  "maxRequestRetries": 3,
  "linkedinDailyLimit": 250,
  "googleMapsGrid": {
    "enabled": true,
    "cellSizeKm": 5
  }
}
```

---

## 8. Output Schema (Proposed)

Each scraped item should conform to a normalized envelope:

```jsonc
{
  "platform": "tiktok",
  "url": "https://www.tiktok.com/@username",
  "scrapedAt": "2026-03-12T17:20:00Z",
  "crawlerUsed": "cheerio",
  "data": {
    // Platform-specific structured fields
  },
  "errors": []   // Any non-fatal warnings
}
```

---

## 9. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Residential proxy budget exhausted mid-month | Medium | High | Prioritize CheerioCrawler; block media in Playwright; dashboard alerts at 70% usage |
| Platform HTML structure changes break selectors | High | Medium | Use accessibility attributes (`aria-label`) where possible; add selector-health smoke tests |
| LinkedIn account bans from over-scraping | Medium | High | Hard 250-profile/day cap; randomized delays; geo-matched sticky proxies |
| TikTok/YouTube JSON key renames | Medium | Medium | Wrap extraction in try/catch; log schema drift; alert on > 10% extraction failures |
| Cloudflare challenge upgrades | Medium | Medium | Keep Playwright stealth plugins up to date; fingerprint randomization |

---

## 10. Success Criteria

1. The actor successfully extracts data from **all 8 listed platform categories** without manual intervention.
2. A full representative run (≥ 50 URLs across platforms) completes under **$15 in compute** and **< 1 GB proxy bandwidth**.
3. Blocked-request rate is **< 5%** across platforms using the hybrid strategy.
4. Output datasets pass JSON schema validation with **zero malformed records**.

---

## 11. Resolved Design Questions

> [!NOTE]
> These questions were resolved during the design phase. See [agent-team.md](file:///d:/Apify/Documentation/agent-team.md) Section 8 for the full decision log.

1. **Authentication:** LinkedIn, Facebook, and Instagram will use **authenticated persistent sessions** via PlaywrightCrawler with residential proxies. Credential management is handled through Apify Actor input (secure storage). TikTok, YouTube, and Reddit run **without authentication**.
2. **Priority Order:** **Incremental delivery** — 6 sprints building platform support progressively. Sprint 1: TikTok + YouTube (Cheerio) → Sprint 2: Reddit (Cheerio) → Sprint 3: Google Maps + Pinterest (Playwright) → Sprint 4: LinkedIn → Sprint 5: Facebook + Instagram → Sprint 6: General business sites.
3. **Data Freshness:** **On-demand only** for the initial release. The actor runs when triggered manually or via Apify schedule. Scheduled runs can be configured through Apify's built-in scheduling without additional actor logic.
4. **General Business Sites:** The actor will accept **any URL** and attempt best-effort extraction using the stealth PlaywrightCrawler with fingerprint randomization. No fixed target list required.
5. **Additional Platforms:** Yellow Pages, Yelp, TripAdvisor, Airbnb, Booking.com, Amazon, eBay, AliExpress, and Etsy are **deferred to post-initial release**. The 8 core platforms are the priority for the first version.

---

## 12. References

- [Architecting High-Efficiency Crawlee Actors for Social Media Scraping](file:///d:/Apify/Documentation/Architecting%20High-Efficiency%20Crawlee%20Actors%20for%20Social%20Media%20Scraping.md)
- [Actor Definition & Research Links](file:///d:/Apify/Documentation/actor_definition)
- [Apify Creator Plan Pricing](https://apify.com/pricing/creator-plan)
- [Apify Official Docs](https://docs.apify.com/)
- [Crawlee Quick Start](https://crawlee.dev/js/docs/quick-start)
