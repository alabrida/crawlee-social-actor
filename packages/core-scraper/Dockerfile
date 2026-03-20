# See https://docs.docker.com/engine/reference/builder/
FROM apify/actor-node-playwright-chrome:20 AS builder

WORKDIR /app

# Copy dependency files first for layer caching
COPY package*.json ./
RUN npm install --include=dev --audit=false

# Copy source and build
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# --- Production stage ---
FROM apify/actor-node-playwright-chrome:20

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev --audit=false

# Copy compiled output from builder stage
COPY --from=builder /app/dist ./dist

# Copy actor configuration
COPY .actor/ ./.actor/

CMD ["node", "dist/main.js"]
