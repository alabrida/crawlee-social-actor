# Crawlee Agent Team & Iterative Build Workflow

> **Purpose:** Define the agent team, their roles, and a guardrailed synchronous workflow for building the Crawlee social-media scraping Actor. The workflow is optimized to surface and overcome every known platform blocker.

---

## 1. Agent Team Composition

The team is organized into **five tiers** with **12 separate agent definitions** (each with its own system prompt in `.agent/agents/`). Each agent owns a clear slice of the codebase and a defined handoff protocol.

### 1.1 🏗️ Architect Agent — *"The Orchestrator"*

| Attribute | Detail |
|---|---|
| **Owns** | Project scaffolding, shared infrastructure, Crawlee router configuration, Apify Actor entry point (`main.ts`), input/output schemas, **and the workflow state machine** |
| **Responsibilities** | • Initialize the Actor project (`apify init`) and Crawlee dependencies · • Define the `RouterHandler` that dispatches URLs to the correct platform handler · • Build shared utilities: `SessionPool` factory, proxy rotation logic, resource-blocking middleware, structured logger · • Maintain the actor's `INPUT_SCHEMA.json` and normalized output envelope · • Enforce budget guardrails (CU estimator, bandwidth tracker) · • **Drive all phase transitions** — no agent begins work until the Architect unlocks the next phase · • **Assign work** to the correct agent at each phase gate · • **Resolve disputes** between agents · • **Orchestrate Phase 2 Multi-Stage Builds** (Scrape -> Enrich -> Finalize) |
| **Blocker Focus** | Cross-cutting concerns — session management, proxy rotation, and resource blocking that affect *every* platform |
| **Delivers to** | All Platform Agents (shared modules they import) |

---

### 1.2 ⚡ Extraction Tier — *"The Data Harvesters"*

This tier is responsible for the raw capture of HTML, Screenshots, and basic signals.

| Agent | Platform | Strategy |
|---|---|---|
| **Cheerio-TikTok** | TikTok | `<script>` JSON parsing (SSR) |
| **Cheerio-YouTube** | YouTube | `ytInitialData` regex parsing |
| **Cheerio-Reddit** | Reddit | `.json` endpoint + cookie reuse |
| **PW-LinkedIn** | LinkedIn | Sticky residential proxy, rate-capped |
| **PW-GoogleMaps** | Google Maps | `aria-label` selectors |
| **PW-Pinterest** | Pinterest | XHR route interception |
| **PW-Meta** | FB + IG | Persistent sessions + cookie injection |
| **PW-General** | Hub Website | Stealth headless + WAF bypass |
| **PW-Twitter (NEW)** | Twitter/X | `auth_token` injection + metric capture |
| **SEO-Analyst (NEW)** | Google SERP | Organic ranking position detection |

---

### 1.3 🟣 Enrichment Tier — *"The Insight Engine"*

This tier transforms raw signals into high-resolution, structured data.

| Agent | Responsibility | Key Output |
|---|---|---|
| **Math-Steward (NEW)** | Numeric integrity and temporal logic | Integers from strings ("1.2M" -> 1.2M), `post_frequency_days` |
| **Hub-Forensics (NEW)** | Technical signal detection on Hub site | SSL, Google Analytics, JSON-LD, Pixel detection |
| **Link-Strategist (NEW)** | Deep-link crawling and strategy audit | Redirection chains, UTM detection, Hub-to-Social reciprocity |

---

### 1.4 🧩 Governance & Quality Tier — *"The Refactorers"*

| Agent | Responsibility | Key Guardrail |
|---|---|---|
| **VDO Agent** | Modularization and Value Steward | **G-MOD-01** (250-line cap) and **G-VAL** (Value Increment) |
| **Marketplace-Optimizer (NEW)** | UX and Storefront quality | Readme clarity, Input Schema UX, Output aesthetics |
| **Anti-Bot & QA** | Blocker registry and validation | Blocker Registry (Supabase), Regression testing |
| **Integration Lead** | Final assembly and deployment | Full Actor E2E, CU/Bandwidth measurement |

---

### 1.5 🔐 Security & Scale Tier — *"The Vault Guardians"*

| Agent | Responsibility | Key Goal |
|---|---|---|
| **Auth-Steward (NEW)** | Session Vault management | 20-day proactive re-auth, Interactive Login flow |

---

## 2. Synchronous Iteration Workflow — *"Red → Green → Harden"*

Every platform handler goes through a four-phase loop. Agents work **synchronously** — no agent starts its next phase until the previous agent's handoff is accepted.

```
  🔴 RED               🟢 GREEN            🟡 MODULARIZE          🔵 HARDEN
  Blocker Identified →  Handler Passes  →   Refactor & Verify  →   Edge-Case Sweep
       ↑                                                               |
       |                        New Blocker? ← ── ── ── ── ── ── ── ─ |
       └─── Yes ──────────────────┘                     No ── → ✅ SHIP
```

### Phase Details

| Phase | Who | What Happens | Exit Criteria |
|---|---|---|---|
| **🔴 RED** | Anti-Bot Agent | Runs the target URL through a bare request against the **live platform**. Documents the blocker in the Supabase `blockers` table. | Blocker is documented with reproduction steps. |
| **🟢 GREEN** | Platform Agent | Implements or updates the handler to overcome the documented blocker. Tests against **live URLs** (≥ 3 samples). | Handler returns valid structured data; `validate()` passes. |
| **🟡 MODULARIZE + VALUE CHECK** | VDO Agent | Reviews all new/changed files for line-count (≤ 250), naming compliance, and import correctness. Also validates the sprint's defined value increment — not just working code, but *shippable value*. | Every file ≤ 250 lines; naming compliant; import-map updated; value increment confirmed. |
| **🔵 HARDEN** | Anti-Bot Agent + Integration Lead | Anti-Bot Agent runs the handler against a broader URL set (10–20 URLs) with varied inputs. Integration Lead checks CU/bandwidth cost. | ≥ 90% success rate; cost is within per-platform budget allocation; no regressions on other platforms. |
| **✅ SHIP** | Integration Lead | Handler is merged into the main router. Full actor end-to-end test is run. | All platforms that have shipped still pass; output schema validates. |

---

## 3. Blocker-Driven Iteration Protocol

### 3.1 Blocker Registry (Supabase)

The blocker registry lives in a **Supabase table** (`blockers`) for richer querying, dashboarding, and multi-session durability. Schema:

| Column | Type | Description |
|---|---|---|
| `id` | text (PK) | Unique ID, e.g. `BLOCK-001` |
| `platform` | text | Target platform name |
| `type` | text | Blocker category (crypto_signature, rate_limit, captcha, etc.) |
| `description` | text | Full description with reproduction steps |
| `status` | text | `open` \| `mitigated` \| `verified` \| `wont_fix` |
| `mitigation` | text | How the blocker was overcome |
| `verified_by` | text | Agent name that verified the fix |
| `verified_at` | timestamptz | When verification occurred |
| `evidence` | text | Screenshot path or response snippet |
| `sprint` | integer | Sprint number when discovered |
| `created_at` | timestamptz | Auto-set on insert |

> [!NOTE]
> A local `blockers-snapshot.json` is exported at every session-end checkpoint for offline reference. The Supabase table is the source of truth.

### 3.2 Iteration Rules

1. **No handler ships with an `open` blocker.**
2. **Every mitigation must have evidence** (screenshot, response body, or test output).
3. **`wont_fix` requires Architect approval** and user acceptance.
4. **Regression = instant RED** — previously verified blockers that re-open restart the cycle.

---

## 4. Workflow Guardrails & Rules

### 4.1 Cost Guardrails

| Rule | Enforcement |
|---|---|
| **G-COST-01:** CheerioCrawler must be used unless JS rendering is provably required. | Architect reviews before GREEN. |
| **G-COST-02:** All Playwright sessions must call `blockResources(['image', 'media', 'font'])`. | Integration Lead checks during HARDEN. |
| **G-COST-03:** No single platform may consume > 30% of monthly CU budget in a test run. | Integration Lead measures during HARDEN. |
| **G-COST-04:** Any handler exceeding 500 MB proxy bandwidth in a single run triggers review. | Runtime bandwidth tracker. |

### 4.2 Code Quality Guardrails

| Rule | Enforcement |
|---|---|
| **G-CODE-01:** Every handler must export `handle()`, `validate()`, and `detectBlock()`. | TypeScript interface; compile-time check. |
| **G-CODE-02:** No handler may create its own `SessionPool`. | grep check during HARDEN. |
| **G-CODE-03:** All output must conform to the normalized envelope schema. | JSON schema validation on test output. |
| **G-CODE-04:** No `console.log` — use shared `log` utility. | grep check during HARDEN. |

### 4.3 Modularization Guardrails

| Rule | Enforcement |
|---|---|
| **G-MOD-01:** No `.ts` file may exceed **250 lines**. | VDO runs `wc -l` at GREEN → HARDEN gate. |
| **G-MOD-02:** File names: **kebab-case**; functions: **camelCase**; types: **PascalCase**; constants: **UPPER_SNAKE_CASE**. | VDO audits against `naming-conventions.md`. |
| **G-MOD-03:** Every module's public API must be listed in `import-map.json`. | VDO cross-references after every refactor. |
| **G-MOD-04:** Split files use **co-located subfolders** with `index.ts` re-exports. | VDO proposes split; Architect approves. |
| **G-MOD-05:** No circular dependencies. Flow: `main → routes → handlers → utils → schemas`. | VDO verifies acyclic graph. |
| **G-MOD-06:** Every function must have JSDoc with `@param` and `@returns`. | VDO checks at GREEN → HARDEN gate. |

### 4.4 Value Delivery Guardrails

| Rule | Enforcement |
|---|---|
| **G-VAL-01:** Every sprint begins with a **Value Increment Definition** in `value-ledger.md`. | VDO writes before Architect opens RED gate. |
| **G-VAL-02:** No handler may SHIP without VDO confirming the value increment is met. | VDO validates at HARDEN → SHIP gate. |
| **G-VAL-03:** Scope drift is a **blocking issue**. | VDO flags; Architect pauses work. |
| **G-VAL-04:** Value Ledger updated after every SHIP with delivery evidence. | VDO maintains; Integration Lead co-signs. |
| **G-VAL-05:** Smallest shippable slice wins. | VDO proposes decomposition at sprint kickoff. |

### 4.5 Anti-Bot Guardrails

| Rule | Enforcement |
|---|---|
| **G-BOT-01:** LinkedIn hard-cap at 250 requests/day. | Rate limiter in handler. |
| **G-BOT-02:** All Playwright handlers must randomize delays (1–5 s). | Anti-Bot Agent verifies in test logs. |
| **G-BOT-03:** User-Agent strings must rotate from curated list. | Handlers must use shared UA utility. |
| **G-BOT-04:** Failed requests must retire the session. | Anti-Bot Agent verifies in test logs. |

### 4.6 Synchronization Guardrails

| Rule | Enforcement |
|---|---|
| **G-SYNC-01:** No agent begins the next phase until prior exit criteria are met. | Handoff checklist. |
| **G-SYNC-02:** Blocker Registry is the single source of truth. | Committed after every status change. |
| **G-SYNC-03:** Each iteration cycle must be logged in `iteration_log.md`. | Architect maintains the log. |

### 4.7 Session Continuity Guardrails

| Rule | Enforcement |
|---|---|
| **G-SESSION-01:** `project-state.json` must be updated at every phase transition and every session end. | Architect validates before approving any gate. |
| **G-SESSION-02:** No session may end without the Session-End Checkpoint being completed. | Human verifies checklist before closing. |
| **G-SESSION-03:** Every new session must begin with the 8-step Session-Resume Workflow. | First action in any session; agent confirms state before proceeding. |
| **G-SESSION-04:** Session briefings must follow the standardized format. | VDO audits briefing structure at session end. |
| **G-SESSION-05:** Agent must proactively recommend a session boundary when context is ~60% consumed. | Agent self-monitors; alerts human. |

---

## 5. Build Sequence — Platform Priority

| Sprint | Platforms | Crawler | Rationale |
|---|---|---|---|
| **1** | TikTok, YouTube | Cheerio | Lowest cost; validates JSON-from-HTML pattern + shared infra |
| **2** | Reddit | Cheerio | Validates SessionPool cookie reuse |
| **3** | Google Maps, Pinterest | Playwright | Validates Playwright infra, resource blocking, route interception |
| **4** | LinkedIn | Playwright | Highest-risk; benefits from stable infra |
| **5** | Facebook + Instagram | Playwright | Persistent sessions; most complex anti-bot |
| **6** | General Business Sites | Playwright | Catch-all WAF handling |

---

## 6. Proposed File Structure

```
d:\Apify\
├── .agent/
│   ├── workflows/
│   │   └── crawlee-build.md          # Master workflow (executable)
│   └── rules/
│       ├── cost-guardrails.md
│       ├── code-quality.md
│       ├── modularization.md
│       ├── value-delivery.md
│       ├── anti-bot.md
│       └── sync-protocol.md          # Includes G-SESSION rules
├── Documentation/
│   ├── PRD.md
│   ├── agent-team.md              ← THIS DOCUMENT
│   ├── project-state.json        # Machine-readable project state
│   ├── blockers.json
│   ├── naming-conventions.md
│   ├── import-map.json
│   ├── value-ledger.md
│   ├── iteration_log.md
│   └── session-briefings/        # One file per completed session
│       ├── README.md
│       └── session-YYYY-MM-DD.md
└── src/
    ├── main.ts
    ├── routes.ts
    ├── handlers/
    │   ├── tiktok.ts
    │   ├── youtube.ts
    │   ├── reddit.ts
    │   ├── linkedin.ts
    │   ├── google-maps.ts
    │   ├── pinterest.ts
    │   ├── meta.ts
    │   └── general.ts
    ├── utils/
    │   ├── session.ts
    │   ├── proxy.ts
    │   ├── resources.ts
    │   ├── logger.ts
    │   └── ua-rotation.ts
    └── schemas/
        ├── input.json
        └── output.json
```

---

## 7. Session Continuity Protocol

The workflow spans multiple chat sessions. To prevent quality degradation as context windows fill, every session follows a strict start/end protocol.

### 7.1 Session-Boundary Triggers

| Trigger | Rationale |
|---|---|
| After SHIP gate clears for a platform | Clean stopping point; all state committed. |
| After completing all platforms in a sprint | Sprint is a natural unit of work. |
| When context window is ~60% full | Proactive quality preservation. |
| After any HARDEN failure requiring RED restart | Fresh session avoids stale debug context. |
| When the human explicitly requests it | Always honored immediately. |

### 7.2 Session-End Checkpoint

```markdown
- [ ] `project-state.json` updated with current phase, platform status, and next action
- [ ] `blockers-snapshot.json` exported from Supabase `blockers` table
- [ ] `iteration_log.md` has entries for all phase transitions this session
- [ ] `value-ledger.md` updated if value was delivered
- [ ] `import-map.json` reflects current module structure
- [ ] All code changes committed to feature branch
- [ ] Session briefing written to `session-briefings/session-YYYY-MM-DD.md`
```

### 7.3 Session-Resume Workflow (New Session)

1. Read `project-state.json` → sprint, phase, platform, role
2. Query Supabase `blockers` table → open blockers
3. Read `value-ledger.md` → delivered value
4. Read latest `session-briefings/session-*.md` → last session context
5. Read `iteration_log.md` (last 10 entries) → orientation
6. Read relevant handler file(s) → code context
7. Announce: "Resuming Sprint X, Phase Y, Platform Z. Next action: ..."
8. Wait for human confirmation

---

## 8. Resolved Design Decisions

| Decision | Resolution | Rationale |
|---|---|---|
| **Agent granularity** | **Separate agent definitions** — each agent has its own system prompt in `.agent/agents/` | Isolation, clear ownership, independent context. 12 agent files created. |
| **Blocker Registry** | **Supabase table** (`blockers`) | Richer querying, dashboarding, multi-session durability. Local snapshot exported at session-end. |
| **Sprint cadence** | **Multi-session** with handoff artifacts | Session Continuity Protocol (Section 7) handles state persistence. |
| **Live testing** | **Live platform URLs at all phases** | No cached fixtures. Use Creator Plan CU budget ($500/mo for $1/mo). |
| **Dev environment** | **Isolated virtual environment** | All development runs in an isolated Node.js environment. No global installs. Docker for live test runs. |

---

## 9. Development Environment Isolation

All development **must** run in an isolated environment to protect the local machine.

### Node.js Isolation

- Project uses a **local `node_modules`** — no global npm installs
- `package.json` pins all dependency versions with exact semver
- `.npmrc` configured with `save-exact=true`
- `npx` used for all one-off tool executions (never `npm install -g`)

### Testing: Never Expose Your IP

> [!CAUTION]
> **Never run scraping tests without proxy protection.** All live platform requests must route through proxies — either via **Apify Cloud** or **third-party proxies** configured locally.

**Option A: Apify Cloud** (recommended for HARDEN / SHIP)
- Run via `apify call` or Apify Console
- Apify’s Creator Plan provides datacenter proxies; residential available for LinkedIn/Meta
- CU tracking is automatic

**Option B: Local with Third-Party Proxies** (viable for RED / GREEN iteration)
- Configure third-party proxy in the handler's proxy settings
- Faster iteration loop — no deploy-wait-check cycle
- Must still use the shared `proxy.ts` utility so proxy config is centralized

### Guardrail

| Rule | Enforcement |
|---|---|
| **G-ENV-01:** No global npm packages. All deps local to `node_modules`. | Architect verifies `package.json`. |
| **G-ENV-02:** **All live platform requests must route through proxies** — Apify Cloud or third-party. Direct local IP requests to target platforms are forbidden. | Architect verifies proxy config; Anti-Bot Agent checks test logs for unproxied requests. |
| **G-ENV-03:** Proxy configuration must use the shared `proxy.ts` utility — no hardcoded proxy URLs in handlers. | VDO verifies during MODULARIZE phase. |
