# Apify builds this with the repo root as context (.actor/actor.json lives at the root
# and references ../Dockerfile). It builds and runs the shared @alabrida/core-scraper
# package — the hardened core that every wrapper invokes. The consultant deployment runs
# this directly (no input UI); set ACTOR_MODE=INTERNAL and DETAIL_LEVEL=HIGH on the
# Apify actor's environment to select the consultant tier.
#
# See https://docs.docker.com/engine/reference/builder/

# --- Build stage ---
FROM apify/actor-node-playwright-chrome:20 AS builder

WORKDIR /app

# Install deps first for layer caching. core-scraper is self-contained (no internal
# workspace deps), so only its package.json is needed here.
COPY packages/core-scraper/package*.json ./
RUN npm install --include=dev --audit=false

# Compile TypeScript -> dist
COPY packages/core-scraper/tsconfig.json ./
COPY packages/core-scraper/src/ ./src/
RUN npm run build

# --- Production stage ---
FROM apify/actor-node-playwright-chrome:20

WORKDIR /app

# Production dependencies only
COPY packages/core-scraper/package*.json ./
RUN npm install --omit=dev --audit=false

# Compiled output from the build stage
COPY --from=builder /app/dist ./dist

# Consultant-tier build (this branch). Mode + detail are baked in so the image deploys
# as the consultant audit with no extra Apify config — and remain overridable by actor
# env vars at runtime. Sibling wrapper branches (saas/marketplace) override just these
# two ENVs (and the .actor input schema), reusing the identical hardened core.
ENV ACTOR_MODE=INTERNAL
ENV DETAIL_LEVEL=HIGH

# Entry point: main.ts compiles to dist/main.js, which self-invokes runActor() when run
# as the process entry. Input is supplied by the Apify platform at runtime.
CMD ["node", "dist/main.js"]
