# Workflow — Apify Marketplace Preparation

> **Objective:** Ensure the Actor is ready for public release on the Apify Store.

---

## 1. Phase: 📖 DOCUMENT — Public Readme
**Role:** Marketplace-Optimizer Agent
1. Write a compelling summary of the "Revenue Journey" value proposition.
2. Document all 11+ supported platforms.
3. Provide clear JSON output examples for n8n users.

## 2. Phase: 🎮 UX — Input Schema Audit
**Role:** Marketplace-Optimizer Agent
1. Verify `input_schema.json` has clear `title` and `description` fields.
2. Group inputs logically (Platforms, Credentials, Proxy, Advanced).
3. Set sensible defaults for `maxConcurrency` and `maxRequestRetries`.

## 3. Phase: 🖼️ VISUAL — Screenshot Quality
**Role:** Integration Lead
1. Run a sample suite to generate 5 high-quality screenshots.
2. Ensure screenshots are stored in the default KVS for store preview.

## 4. Phase: ✅ APPROVE — Final Build
**Role:** Integration Lead + Architect
1. Perform one last full regression test.
2. Sign off on the `Value Ledger`.
3. Approve for open marketplace deployment.
