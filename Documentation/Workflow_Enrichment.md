# Workflow Extension — Revenue Journey Enrichment

> **Objective:** Extend the base `crawlee-build.md` workflow to handle the specific complexities of structured data enrichment and automated authentication.

---

## 1. Phase: 🟣 ENRICH — Structured Data Transformation

**Role:** Data-Parser Agent / Signal-Analyst Agent

1.  **Metric Mapping:** Cross-reference the `revenue_journey_assessments` table columns for the current platform.
2.  **Regex Implementation:** Create robust regex utilities in `src/utils/parsers.ts` to convert string counts (e.g., "1.2M", "10k") into integers.
3.  **Signal Logic:** (For `General` platform) Implement HTML-based checks for:
    - SSL (response protocol)
    - Google Analytics (script patterns)
    - JSON-LD (application/ld+json presence)
    - Privacy/Cookie banners (keyword/selector checks)
4.  **Schema Update:** Ensure the `ScrapedItem` data object includes the newly structured fields.
5.  **Local Validation:** Run the enrichment logic against the HTML snippets saved in previous HARDEN sweeps.

**Exit Gate:**
- [ ] Every platform-specific column in the Supabase table has a corresponding field in the JSON output.
- [ ] Numeric parsing passes unit tests for "K", "M", and "B" suffixes.
- [ ] Boolean signals are verified for accuracy.

---

## 2. Phase: 🔐 AUTH-VAULT — Session Lifecycle Management

**Role:** Auth-Steward Agent

1.  **Vault Scaffold:** Implement `src/utils/session-vault.ts` to interface with Apify Key-Value Store.
2.  **Refresh Logic:** Implement the 20-day "Hard Refresh" logic in `main.ts`.
3.  **Interactive Trigger:** Update the input schema to support an `interactiveSessionSetup: boolean` flag.
4.  **Health Dashboard:** Output a `sessionHealth` object in every run to notify the user of upcoming expiry.

**Exit Gate:**
- [ ] Session age is correctly calculated and logged.
- [ ] 20-day refresh prompt triggers in the UI/Logs.
- [ ] Cookies are successfully retrieved and saved to named KVS records.

---

## 3. Integration with Architect's Router

The Architect will now enforce a **Multi-Stage Build**:
- **Stage 1 (Scrape):** Handler fetches raw HTML + Screenshots.
- **Stage 2 (Enrich):** Parser/Analyst agents process the Stage 1 output into table-ready fields.
- **Stage 3 (Finalize):** Integration Lead merges data and screenshot URLs for final push.
