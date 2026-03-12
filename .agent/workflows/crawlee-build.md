---
description: Master workflow for building the Crawlee social media scraping Actor
---

# Crawlee Build Workflow

// turbo-all

This workflow governs all development on the Crawlee social media scraping Actor. Every agent session must follow this workflow. The workflow file at `.agent/rules/` contains the guardrail details referenced by rule ID. For architecture patterns and implementation guidance, see `Documentation/Architecting High-Efficiency Crawlee Actors for Social Media Scraping.md`.

---

## Session Start (Mandatory — Every New Session)

1. Read `Documentation/project-state.json` to determine current sprint, phase, platform, and assigned role.
2. Query the Supabase `blockers` table for entries with `status = 'open'` to check for open blockers.
3. Read `Documentation/value-ledger.md` to understand delivered value so far.
4. Read the latest file in `Documentation/session-briefings/` to understand what happened last session.
5. Read the last 10 entries of `Documentation/iteration_log.md` for orientation.
6. Read the relevant handler file(s) listed in `project-state.json → platformStatus → handlerFile`.
7. Announce to the human: "Resuming Sprint X, Phase Y, Platform Z. Next action: [from project-state.json]".
8. Wait for human confirmation before proceeding.

---

## Sprint Kickoff (When Starting a New Sprint)

1. VDO writes the **Value Increment Definition** to `Documentation/value-ledger.md`.
2. Architect updates `Documentation/project-state.json` with the new sprint number, platforms, and value increment.
3. Architect logs the sprint start in `Documentation/iteration_log.md`.
4. Proceed to RED phase for the first platform in the sprint.

---

## Phase: 🔴 RED — Blocker Identification

**Role:** Anti-Bot Agent

1. Probe the target platform URLs with a bare HTTP request (no browser).
2. Document every blocker found in the Supabase `blockers` table with:
   - Unique ID (BLOCK-NNN)
   - Platform name
   - Blocker type
   - Full description with reproduction steps
   - Status: `open`
3. Update `Documentation/project-state.json`: set platform phase to `RED`, update blockerIds.
4. Log the phase entry in `Documentation/iteration_log.md`.
5. Present blocker findings to human for review.

**Exit Gate (Architect validates):**
- [ ] All blockers documented with reproduction steps
- [ ] Blockers inserted into Supabase `blockers` table
- [ ] `project-state.json` updated
- [ ] Human acknowledges blockers

→ Proceed to GREEN

---

## Phase: 🟢 GREEN — Handler Implementation

**Role:** Platform Agent (Cheerio-* or PW-*)

1. Query the Supabase `blockers` table for this platform's open blockers.
2. Implement or update the handler in `src/handlers/[platform].ts`.
3. Handler must export: `handle()`, `validate()`, `detectBlock()`.
4. Run locally against ≥ 3 sample URLs and confirm structured data extraction.
5. Update blocker status to `mitigated` in the Supabase `blockers` table.
6. Update `Documentation/project-state.json`: set phase to `GREEN`.
7. Log in `Documentation/iteration_log.md`.

**Rules enforced during GREEN:**
- G-COST-01: Use CheerioCrawler unless JS rendering is provably required
- G-CODE-01 through G-CODE-04: Handler interface, no custom SessionPool, schema compliance, structured logging
- G-BOT-01 through G-BOT-04: Rate limits, delays, UA rotation, session retirement

**Exit Gate (Architect validates):**
- [ ] Handler returns valid structured data
- [ ] `validate()` passes on sample output
- [ ] Blockers updated to `mitigated`
- [ ] Code committed to feature branch

→ Proceed to MODULARIZE + VALUE CHECK

---

## Phase: 🟡 MODULARIZE + VALUE CHECK

**Role:** VDO Agent

1. Run `wc -l` on every new/changed `.ts` file — reject if any exceed 250 lines.
2. Audit file names (kebab-case), function names (camelCase), types (PascalCase), constants (UPPER_SNAKE_CASE).
3. Verify all imports resolve correctly — update `Documentation/import-map.json`.
4. Check for circular dependencies: `main → routes → handlers → utils → schemas`.
5. Verify every function has JSDoc with `@param` and `@returns`.
6. Validate that the handler delivers the sprint's defined value increment (not just working code, but shippable value).
7. Flag any scope drift.
8. Update `Documentation/project-state.json`: set phase to `MODULARIZE`.
9. Log in `Documentation/iteration_log.md`.

**If file must be split:**
- Propose decomposition plan (new file names, function moves)
- Create co-located subfolder with `index.ts` re-exports
- Verify all call-sites updated
- Re-run import-map cross-reference

**Exit Gate (VDO validates):**
- [ ] All files ≤ 250 lines
- [ ] Naming conventions compliant
- [ ] Import map updated and cross-referenced
- [ ] Zero broken references
- [ ] Value increment confirmed
- [ ] No scope drift

→ Proceed to HARDEN

---

## Phase: 🔵 HARDEN — Edge Case Sweep

**Role:** Anti-Bot Agent + Integration Lead

1. Anti-Bot Agent runs the handler against 10–20 diverse URLs.
2. Record pass/fail for each URL with evidence (status codes, response bodies).
3. Integration Lead measures CU consumption and proxy bandwidth.
4. Update blocker statuses to `verified` in the Supabase `blockers` table.
5. Update `Documentation/project-state.json`: set phase to `HARDEN`.
6. Log in `Documentation/iteration_log.md`.

**Rules enforced during HARDEN:**
- G-COST-02 through G-COST-04: Resource blocking, CU limits, bandwidth limits
- G-BOT-02: Verify randomized delays in test logs
- G-BOT-04: Verify session retirement on blocked status codes

**Exit Gate (Integration Lead validates):**
- [ ] ≥ 90% success rate
- [ ] Cost within per-platform budget
- [ ] No regressions on previously shipped platforms
- [ ] All blockers status = `verified`

**If new blocker found:** Architect resets to RED → log regression in iteration_log.md

→ Proceed to SHIP

---

## Phase: ✅ SHIP — Handler Approved

**Role:** Integration Lead + VDO

1. Wire handler into the Architect's router in `src/routes.ts`.
2. Run full-actor end-to-end test with all shipped handlers.
3. Validate output dataset against JSON schema.
4. VDO confirms value increment is delivered.
5. Update `Documentation/value-ledger.md` with delivery evidence.
6. Update `Documentation/project-state.json`: set phase to `shipped`.
7. Log in `Documentation/iteration_log.md`.

**Exit Gate (Integration Lead + VDO co-sign):**
- [ ] All shipped platforms still pass
- [ ] Output schema validates
- [ ] Value Ledger updated with evidence
- [ ] `project-state.json` reflects shipped status

→ **SESSION BOUNDARY DECISION** — see below

---

## Session Boundary Decision

After SHIP (or at any trigger point), evaluate whether to continue or end the session:

**End the session if:**
- Sprint is complete (all platforms shipped)
- Context window is ~60% consumed
- HARDEN failure requires a RED restart
- Human requests it

**If ending session, execute the Session-End Checkpoint:**

1. Update `Documentation/project-state.json` with current state and next action.
2. Export `Documentation/blockers-snapshot.json` from the Supabase `blockers` table for offline reference.
3. Verify `Documentation/iteration_log.md` has entries for all phase transitions this session.
4. Update `Documentation/value-ledger.md` if any value was delivered.
5. Update `Documentation/import-map.json` to reflect current module structure.
6. Commit all code changes to feature branch.
7. Write session briefing to `Documentation/session-briefings/session-YYYY-MM-DD.md`.
8. Present the session briefing to the human.

**If continuing,** proceed to the next platform or next sprint.
