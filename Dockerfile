#   Dependencies stage
FROM node:22-bookworm-slim AS deps

WORKDIR /build

COPY package*.json ./

RUN npm ci --ignore-scripts

#   Build tpeScript project
FROM node:22-bookworm-slim AS builder

WORKDIR /build

COPY --from=deps /build/node_modules ./node_modules

COPY package*.json ./
COPY tsconfig.json ./
COPY tsconfig.build.json ./
COPY src/ ./src/

RUN npm run build

#   Playwright image, Chromium + all system dependencies
FROM mcr.microsoft.com/playwright:v1.61.1-noble AS runtime

WORKDIR /app

# Production node_modules
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts

COPY --from=builder /build/dist ./dist

ENV NODE_ENV=production \
    BROWSER_HEADLESS=true \
    LOG_PRETTY=false

EXPOSE 3006

USER pwuser

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "--enable-source-maps", "dist/app/config/server.js"]
