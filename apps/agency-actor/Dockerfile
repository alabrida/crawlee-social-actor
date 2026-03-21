# Use the Apify version of Node.js 20 build image
FROM apify/actor-node:20 AS builder

# Copy only package.json and package-lock.json first to take advantage of layer caching
COPY package.json package-lock.json ./
COPY packages/core-scraper/package.json ./packages/core-scraper/
COPY apps/agency-actor/package.json ./apps/agency-actor/

# Install dependencies for the whole workspace
RUN npm install --include=dev

# Copy the rest of the source code
COPY . .

# Build the core package and the agency actor
RUN npm run build --workspace=@alabrida/core-scraper
RUN npm run build --workspace=agency-actor

# Final image
FROM apify/actor-node:20
COPY --from=builder /usr/src/app /usr/src/app
WORKDIR /usr/src/app/apps/agency-actor
CMD ["npm", "start"]
