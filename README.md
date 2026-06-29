# Alabrida Core Scraper

The shared Crawlee-based scraping + revenue-journey scoring engine. This repo is the **core
scraper** — it is **not** an Apify actor and is not deployed to Apify directly. It lives as a
versioned library/engine that each wrapper actor invokes.

`main` is the trunk: the hardened engine, version-controlled on the remote.

## Architecture

```
core scraper (this repo, trunk = main)  ──consumed by──►  wrapper actors (pushed to Apify individually)
packages/core-scraper                                     D:/products/consult_intake  (branch consult_intake)
                                                          D:/products/saas_offering   (branch saas_offering)
                                                          D:/products/apify_actor     (branch apify_actor)
```

The wrappers are git worktrees on their own branches. Each adds its own UI, input schema, and
`.actor`/Dockerfile, and is the unit that gets pushed to Apify. UI/dashboard code lives with the
wrapper (e.g. the consultant dashboard under `D:/products/consult_intake`), **not** here.

## Directory Structure

- `packages/core-scraper` — crawling, routing, handlers, scraping, and the scoring engine.

## Local development

The core runs locally without Docker/Apify deployment:

```bash
cd packages/core-scraper
npm test                       # vitest unit + scoring suites
node scripts/run-regression.js # gentle end-to-end regression run (uses local storage)
```

## Versioning

`@alabrida/core-scraper` follows semver. The trunk is tagged at each baseline (`vMAJOR.MINOR.PATCH`).
It stays **pre-1.0 while hardening**; `1.0.0` marks the finalized engine.

Today the wrappers carry a **synced copy** of `packages/core-scraper` on their branches — so a core
change must be re-synced into each wrapper. When the first wrapper is ready to deploy, this switches
to **versioned-package consumption**: each wrapper depends on `@alabrida/core-scraper` at a pinned
version and adopts new versions deliberately, replacing the manual sync.

To cut a baseline:

```bash
# bump packages/core-scraper/package.json "version", commit on main, then:
git tag -a vX.Y.Z -m "core-scraper vX.Y.Z" && git push origin vX.Y.Z
```

## Status

Hardening in progress; trunk live on `origin/main`. Wrappers consume the core by manual sync until
the first deploy, when versioned-package consumption is wired in.
