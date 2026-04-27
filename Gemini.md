# Gemini.md: Apify

> **Strategic Governance**: This project is governed by the core principles in **`PILLARS.md`** and must pass the validation gates in **`WORKBOOK.md`**.

## 1. Role Rules
### Scraper Architect
- Design actors to bypass bot-detection using residential proxies.
- Ensure all data outputs map to the Revenue Journey Rubric stages.

## 2. Execution Model (Data Pipeline)
```
[Target Source] 
      ↓
(Apify Actor) -> Automated Extraction
      ↓
(Data Transformation) -> Schema Mapping (IF Standards)
      ↓
[Librarian KB] -> Update KB Shards for Agent 3
```

## 3. Production Readiness & Security
> **Mandatory**: All production readiness, security compliance, and workbook validation is managed in the dedicated **`WORKBOOK.md`** file.

## 4. VDO Hygiene & Validation
- [x] **250-Line Mandate**: Strictly enforced for all custom actor logic.
- [x] **Structure**: `agents/`, `skills/`, `workflows/` directories present.

---

## VDO Audit Log
*   **2026-04-10:** Initialized project structure and modular VDO documentation.
