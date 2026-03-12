To build a resilient Apify Actor using Crawlee that scrapes this extensive list of platforms while staying within your Creator plan limits (especially the 10 GB residential proxy and $100/month compute caps), you need a hybrid architecture.

Modern platforms use multi-layered defense strategies, including TLS fingerprinting, behavioral analysis, and Web Application Firewalls (WAFs) like Cloudflare or DataDome.

Here is a comprehensive plan to architect your Crawlee actor and tackle the known blockers for each platform.

### **1\. Core Architecture: The Hybrid Crawler Approach**

Because you are billed $0.30 per compute unit and have limited residential proxy bandwidth, using a full browser (Playwright/Puppeteer) for everything will quickly drain your budget. You should use a hybrid approach:

* **CheerioCrawler (Low Cost/High Speed):** Use this for platforms where data can be intercepted via backend APIs or extracted from hidden JSON data embedded in the HTML.  
* **PlaywrightCrawler (High Cost/High Stealth):** Use this only for sites protected by heavy JavaScript challenges (like Cloudflare Turnstile) or platforms requiring complex human-like interactions.  
* **SessionPool Management:** This is your core defense. Crawlee’s `SessionPool` allows you to tie a specific IP address to a unique set of cookies and browser fingerprints. Use `session.retireOnBlockedStatusCodes(statusCode,)` to automatically discard burnt proxies and rotate to clean ones.  
* **Resource Blocking:** In Playwright, explicitly block images, media, and fonts from loading. This will drastically reduce your Residential Proxy bandwidth consumption to keep you under your 10 GB monthly limit.

### **2\. Platform-Specific Blocker Strategies**

**TikTok**

* **The Blocker:** TikTok uses complex cryptographic signatures like `X-Bogus`, `msToken`, and `_signature` for API requests. Generating these yourself is highly complex and brittle.  
* **The Solution:** Use **CheerioCrawler** to fetch the raw HTML. TikTok embeds the entire page's dataset in a JSON object within `<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__">` or `<script id="SIGI_STATE">`. You can parse this JSON directly to get user profiles, video metadata, and stats without executing JavaScript or solving cryptography.

**YouTube**

* **The Blocker:** YouTube actively blacklists datacenter IPs, throwing immediate `403 Forbidden` or `RequestBlocked` errors. It also uses an actively changing `n-parameter` signature for video formats.  
* **The Solution:** You *must* route requests through Residential Proxies. Like TikTok, use **CheerioCrawler** to fetch the HTML and use regex to parse the `ytInitialData` or `ytInitialPlayerResponse` JSON objects located in the `<script>` tags. This bypasses the need for API keys and JavaScript rendering.

**LinkedIn**

* **The Blocker:** LinkedIn is the most heavily fortified platform on your list. It uses aggressive browser fingerprinting, strict rate limits, and geo-inconsistency checks.  
* **The Solution:** Adopt a "small, slow, human-in-the-loop" philosophy. If you must use accounts, throttle extractions to fewer than 250 profiles per day. You must use a sticky **PlaywrightCrawler** session tied to a Residential IP that matches the geographic location of the profile you are scraping. Add randomized delays (e.g., 2–5 seconds) between clicks to avoid behavioral flags.

**Google Business Profile (Maps)**

* **The Blocker:** The official API limits results (capped at 60), and the visual DOM is complex and prone to structural changes.  
* **The Solution:** Use **PlaywrightCrawler** with a technique called "Geographic Orchestration". Split the target region into a grid of smaller coordinates and launch parallel extractions to bypass the 60-result limit. Rely on `aria-label` accessibility attributes to locate elements (like stars or review counts), as these break far less frequently than standard CSS classes.

**Pinterest**

* **The Blocker:** Pinterest is a Single-Page Application (SPA) with a complex, dynamic DOM and infinite scrolling.  
* **The Solution:** Traditional DOM parsing is highly inefficient here. Use **PlaywrightCrawler** to scroll the page, but monitor the network traffic using Playwright's route interception. Extract the image URLs and metadata directly from the raw XHR (XMLHttpRequest) JSON responses rather than parsing the messy HTML.

**Reddit**

* **The Blocker:** Infinite scrolling limits and recent API pricing changes/strict rate limits.  
* **The Solution:** Rely heavily on Crawlee's **SessionPool** for "Cookie Reuse". Authenticate a session once, save the cookies, and reuse them for subsequent requests to bypass repeated login bot-checks. You can also append `.json` to many Reddit URLs to get raw JSON data, which can often be scraped via **CheerioCrawler** if your proxy IP is clean.

**Facebook & Instagram**

* **The Blocker:** Aggressive IP tracking, forced logins, and dynamic GraphQL background calls.  
* **The Solution:** Scraping unauthenticated is very limited. Use **PlaywrightCrawler** with persistent sessions and Residential Proxies. For Instagram, you can occasionally extract the `window._sharedData` JSON from the HTML source (similar to TikTok). Add human-like typing and scrolling patterns to prevent your session from being quickly invalidated.

**General Business Websites**

* **The Blocker:** Cloudflare, DataDome, and PerimeterX present CAPTCHAs or infinite "Verifying you are human" spinners.  
* **The Solution:** Use **PlaywrightCrawler** with `headless: false` (or modern stealth headless). Inject launch arguments like `--disable-blink-features=AutomationControlled`. Ensure you randomize canvas fingerprints, WebGL settings, and user agents.

### **Summary of Execution**

By heavily relying on **CheerioCrawler \+ JSON parsing** for TikTok, YouTube, and Reddit, you will save massive amounts of compute time (CU) and proxy bandwidth. Reserve your **PlaywrightCrawler \+ Residential Proxies** strictly for the heavy fortresses: LinkedIn, Google Maps, Facebook/Instagram, and Cloudflare-protected business sites. This split strategy is the only reliable way to maintain operations under the Creator Plan's $100 monthly consumption and 10 GB proxy limits.

