# E2E Test Infra: Map More Money UI

## Test Philosophy
- Opaque-box, requirement-driven. No dependency on implementation design.
- Methodology: Category-Partition + BVA + Pairwise + Workload Testing.

## Feature Inventory
| # | Feature | Source (requirement) | Tier 1 (Coverage) | Tier 2 (Boundary/Edge) | Tier 3 (Cross-feature) | Tier 4 (Real-world) |
|---|---------|---------------------|:------:|:------:|:------:|:------:|
| 1 | SaaS Landing Page (Default) | R1 | 5 tests | 5 tests | Yes | Yes |
| 2 | Tokenized Routing & Gateway | R2 | 5 tests | 5 tests | Yes | Yes |
| 3 | Supabase Ingestion Boundary | R3 | 5 tests | 5 tests | Yes | Yes |
| 4 | Security Gatekeeper Lockscreen | R4 | 5 tests | 5 tests | Yes | Yes |

## Test Architecture
- Test runner: Playwright (installed via devDependencies in package.json at root)
- Test command: `npx playwright test`
- Folder structure:
  - `tests/` directory at the root of the workspace.
  - Tests will run against local server at `http://localhost:3001`.

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | SaaS Journey | Land on index.html (no token), fill prequalifier, submit, check Supabase upsert | High |
| 2 | Consultant Run | Visit with consultant token, bypass landing to gateway, go to dashboard, view preflight | High |
| 3 | Apify Actor Run | Visit with actor token, render lean layout, click JSON payload download | Medium |
| 4 | Unauthorized Access | Attempt dashboard access without token, check lockscreen overlay | Low |

## Coverage Thresholds
- Tier 1: ≥5 per feature
- Tier 2: ≥5 per feature (where boundaries exist)
- Tier 3: pairwise coverage of major feature interactions
- Tier 4: ≥5 realistic application scenarios
