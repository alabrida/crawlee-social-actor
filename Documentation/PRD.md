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
| **Cost Efficiency** | Stay under the Creator Plan's $100/month compute-unit cap and 10 GB residential proxy limit by avoiding useless content scraping. |
| **Target Data Focus** | Extract *only* revenue journey indicators, CTAs, full-page screenshots, and profile HTML. Content (posts/videos) is explicitly ignored unless it's a CTA. |
| **Data Quality & Pipeline** | Return a single, structured JSON output containing conversion markers paired with a screenshot, optimized for direct ingestion by an n8n workflow. |
| **Resilience** | Gracefully handle anti-bot defenses and fully utilize `RequestQueue` for resumable state across interrupted runs. |

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

> **Note on Screenshots:** Since full-page screenshots are mandatory for the n8n output object, the architecture heavily favors `PlaywrightCrawler` to render visual states. Cheerio is strictly used if screenshots are toggled off.

### 5.1 TikTok

| Item | Detail |
|---|---|
| **Crawler** | PlaywrightCrawler (or Cheerio if screenshots disabled) |
| **Anti-Bot Blocker** | Cryptographic API signatures (`X-Bogus`, `msToken`, `_signature`) |
| **Extraction Method** | DOM parsing or embedded JSON intercept |
| **Target Data** | Revenue journey indicators, CTAs, bio links, profile HTML snippet, screenshot |

### 5.2 YouTube

| Item | Detail |
|---|---|
| **Crawler** | PlaywrightCrawler (or Cheerio if screenshots disabled) |
| **Anti-Bot Blocker** | Datacenter IP blacklisting (`403 Forbidden`) |
| **Extraction Method** | DOM parsing for channel info |
| **Target Data** | Revenue journey indicators, channel CTAs, about page links, profile HTML snippet, screenshot |
| **Note** | Residential proxy is **required**. |

### 5.3 LinkedIn

| Item | Detail |
|---|---|
| **Crawler** | PlaywrightCrawler (Sticky Residential IP) |
| **Anti-Bot Blocker** | Browser fingerprinting, strict rate limits, geo-inconsistency checks |
| **Extraction Method** | Authenticated DOM scraping using injected session tokens (no fresh logins) |
| **Target Data** | Revenue journey indicators, profile CTAs, featured links, profile HTML snippet, screenshot |
| **Geotargeting** | Profile-specific geo-targeting matching GBP logic. |

### 5.4 Google Business Profile (Maps)

| Item | Detail |
|---|---|
| **Crawler** | PlaywrightCrawler |
| **Anti-Bot Blocker** | Official API result cap, fragile CSS selectors |
| **Extraction Method** | Direct profile extraction (Grid orchestration disabled until competitor info scaling is needed) |
| **Target Data** | Revenue journey indicators, booking/website CTAs, profile HTML snippet, screenshot |

### 5.5 Pinterest

| Item | Detail |
|---|---|
| **Crawler** | PlaywrightCrawler |
| **Anti-Bot Blocker** | Complex SPA DOM, infinite scroll |
| **Extraction Method** | Direct profile extraction |
| **Target Data** | Revenue journey indicators, profile CTAs, linked websites, profile HTML snippet, screenshot |

### 5.6 Reddit

| Item | Detail |
|---|---|
| **Crawler** | PlaywrightCrawler (or Cheerio if screenshots disabled) |
| **Anti-Bot Blocker** | Infinite scroll, strict API rate limits |
| **Extraction Method** | Direct profile extraction |
| **Target Data** | Revenue journey indicators, subreddit/user CTAs, pinned links, profile HTML snippet, screenshot |

### 5.7 Facebook & Instagram

| Item | Detail |
|---|---|
| **Crawler** | PlaywrightCrawler (Persistent Sessions + Residential Proxies) |
| **Anti-Bot Blocker** | Aggressive IP tracking, forced login walls, dynamic GraphQL |
| **Extraction Method** | Load authentications via tokens/session cookies to maintain persistent sessions |
| **Target Data** | Revenue journey indicators, bio CTAs, custom links, profile HTML snippet, screenshot |

### 5.8 General Business Websites (Cloudflare / DataDome / PerimeterX)

| Item | Detail |
|---|---|
| **Crawler** | PlaywrightCrawler |
| **Anti-Bot Blocker** | CAPTCHAs, "Verifying you are human" spinners, WAF challenges |
| **Extraction Method** | Stealth headless browser with randomized fingerprints |
| **Target Data** | Revenue journey/conversion data, prominent CTAs, profile source HTML snippet, screenshot |

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
    { "platform": "linkedin", "url": "https://www.linkedin.com/in/username" }
  ],
  "proxy": {
    "useApifyProxy": true,
    "apifyProxyGroups": ["RESIDENTIAL"]
  },
  "authTokens": {
    "linkedin": "li_at=xxxxxx; JSESSIONID=xxxxxx;",
    "facebook": "c_user=xxx; xs=xxx;",
    "instagram": "sessionid=xxxxxx;"
  },
  "maxConcurrency": 5,
  "maxRequestRetries": 3,
  "takeScreenshots": true
}
```

---

## 8. Output Schema (Proposed)

Each scraped item conforms to a normalized envelope optimized for direct parsing by an downstream **n8n workflow**:

```jsonc
{
  "platform": "tiktok",
  "url": "https://www.tiktok.com/@username",
  "scrapedAt": "2026-03-12T17:20:00Z",
  "data": {
    "revenueIndicators": {
      "ctas": ["Book Now", "Link in Bio"],
      "links": ["https://example.com/booking"],
      "conversionMarkers": ["Promoted", "Shop"]
    },
    "profileHtml": "<div class=\"user-profile-section\">...</div>",
    "screenshotUrl": "https://api.apify.com/v2/key-value-stores/STORE_ID/records/screenshot_tiktok_user.png"
  },
  "errors": []
}
```

---

## 9. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Residential proxy budget exhausted | Medium | High | Prune useless data extraction; stop page execution once CTA/revenue markers load. |
| Run interruption due to timeouts | High | Medium | Fully utilize `RequestQueue`. The actor can resume exactly where it left off on the next run. |
| Platform HTML changes break selectors | High | Medium | Use accessibility attributes (`aria-label`) where possible. |
| Account bans from full logins | Medium | High | Use session cookies/authentication tokens instead of standard log-in flows. |

---

## 10. Success Criteria

1. The actor extracts **only** revenue journey indicators, source HTML snippets, and screenshots from the **8 listed platform categories**.
2. Avoids fetching post/video content unless identified as a CTA, keeping the payload lean for the n8n webhook.
3. Blocked-request rate is **< 5%** across platforms.
4. Uses `RequestQueue` effectively for state resumption if interrupted.

---

## 11. Resolved Design Questions

> [!NOTE]
> These questions were resolved during the design phase. See [agent-team.md](file:///d:/Apify/Documentation/agent-team.md) Section 8 for the full decision log.

1. **Information Scope:** The goal is strictly revenue journey indicators and conversion markers. Post/video content is explicitly ignored.
2. **Screenshots:** A screenshot of each platform scraped is paired in the output object to be ingested by n8n.
3. **Google Maps / LinkedIn Geotargeting:** Grid iteration is disabled for now. Geotargeting focuses strictly on the individual profile URLs provided.
4. **Authentication:** Authenticated sessions are created using authentication tokens/cookies passed securely, bypassing the risk of on-the-fly login orchestration.
5. **n8n Hand-off:** Data output structure is explicitly shaped to act as a seamless event trigger/payload for downstream n8n parsing.

---

## 12. References

- [Architecting High-Efficiency Crawlee Actors for Social Media Scraping](file:///d:/Apify/Documentation/Architecting%20High-Efficiency%20Crawlee%20Actors%20for%20Social%20Media%20Scraping.md)
- [Actor Definition & Research Links](file:///d:/Apify/Documentation/actor_definition)
- [Apify Creator Plan Pricing](https://apify.com/pricing/creator-plan)
- [Apify Official Docs](https://docs.apify.com/)
- [Crawlee Quick Start](https://crawlee.dev/js/docs/quick-start)
