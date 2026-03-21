# Use the Apify version of Node.js 20 build image
FROM apify/actor-node:20 AS builder

# Copy only package.json and package-lock.json first to take advantage of layer caching
COPY package.json package-lock.json ./
COPY packages/core-scraper/package.json ./packages/core-scraper/
COPY apps/marketplace-actor/package.json ./apps/marketplace-actor/

# Install dependencies for the whole workspace
RUN npm install --include=dev

# Copy the rest of the source code
COPY . .

# Build the core package and the marketplace actor
RUN npm run build --workspace=@alabrida/core-scraper
RUN npm run build --workspace=marketplace-actor

# Final image
FROM apify/actor-node:20
COPY --from=builder /usr/src/app /usr/src/app
WORKDIR /usr/src/app/apps/marketplace-actor
CMD ["npm", "start"]
