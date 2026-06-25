# Apify builds this with the repo root as context (.actor/actor.json lives at the root
# and references ../Dockerfile). It builds and runs the shared @alabrida/core-scraper
# package — the hardened core that every wrapper invokes. The consultant deployment runs
# this directly (no input UI).
#
# The build goes through the npm WORKSPACE (root package-lock.json) on purpose: a
# standalone `npm install` of core-scraper duplicates @crawlee/core (one copy under
# crawlee/node_modules), which breaks type identity at compile time. The workspace lock
# dedupes it to a single copy, matching local builds.
#
# See https://docs.docker.com/engine/reference/builder/

# --- Build stage ---
FROM apify/actor-node-playwright-chrome:20 AS builder

# Run the (throwaway) build stage as root: the multi-level COPYs create root-owned
# workspace dirs, and tsc must be able to mkdir packages/core-scraper/dist inside them.
# Only the compiled dist/ is carried into the non-root production stage below.
USER root

WORKDIR /app

# Workspace manifests + lockfile first, for cached + reproducible (deduped) installs.
COPY package.json package-lock.json ./
COPY packages/core-scraper/package.json ./packages/core-scraper/
COPY apps/agency-actor/package.json ./apps/agency-actor/
COPY apps/saas-actor/package.json ./apps/saas-actor/
COPY apps/marketplace-actor/package.json ./apps/marketplace-actor/
COPY apps/assessment-ui/package.json ./apps/assessment-ui/
RUN npm ci --include=dev --audit=false

# Compile only the core package (tests are excluded by its tsconfig).
COPY packages/core-scraper/tsconfig.json ./packages/core-scraper/
COPY packages/core-scraper/src/ ./packages/core-scraper/src/
RUN npm run build --workspace @alabrida/core-scraper

# --- Production stage ---
FROM apify/actor-node-playwright-chrome:20

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/core-scraper/package.json ./packages/core-scraper/
COPY apps/agency-actor/package.json ./apps/agency-actor/
COPY apps/saas-actor/package.json ./apps/saas-actor/
COPY apps/marketplace-actor/package.json ./apps/marketplace-actor/
COPY apps/assessment-ui/package.json ./apps/assessment-ui/
RUN npm ci --omit=dev --audit=false

# Compiled output from the build stage
COPY --from=builder /app/packages/core-scraper/dist ./packages/core-scraper/dist

# Consultant-tier build (this branch). Mode + detail are baked in so the image deploys
# as the consultant audit with no extra Apify config — and remain overridable by actor
# env vars at runtime. Sibling wrapper branches (saas/marketplace) override just these
# two ENVs (and the .actor input schema), reusing the identical hardened core.
ENV ACTOR_MODE=INTERNAL
ENV DETAIL_LEVEL=HIGH

# Entry point: main.ts compiles to dist/main.js, which self-invokes runActor() when run
# as the process entry. Input is supplied by the Apify platform at runtime.
CMD ["node", "packages/core-scraper/dist/main.js"]
