# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 — deps
#   Install production + dev dependencies on a lightweight node image.
#   Kept separate so the layer cache is only busted by package*.json changes.
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS deps

WORKDIR /build

COPY package*.json ./
# Install all deps (dev included) — needed for tsc in the next stage
RUN npm ci --ignore-scripts

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 — builder
#   Compile TypeScript. Only source files and the two tsconfig files are needed.
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS builder

WORKDIR /build

# Reuse the full node_modules from the deps stage
COPY --from=deps /build/node_modules ./node_modules

COPY package*.json ./
COPY tsconfig.json ./
COPY tsconfig.build.json ./
COPY src/ ./src/

RUN npm run build

# ─────────────────────────────────────────────────────────────────────────────
# Stage 3 — runtime
#   Uses the official Playwright image so Chromium + all system dependencies
#   (fonts, codecs, sandbox helpers) are pre-installed and version-matched.
#
#   Only the compiled JS and production node_modules are copied in — no source,
#   no TypeScript compiler, no devDependencies.
# ─────────────────────────────────────────────────────────────────────────────
FROM mcr.microsoft.com/playwright:v1.61.1-noble AS runtime

WORKDIR /app

# ── Production node_modules ───────────────────────────────────────────────────
# Re-install with --omit=dev so devDependencies never reach the final image.
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts

# ── Compiled application ──────────────────────────────────────────────────────
COPY --from=builder /build/dist ./dist

# ── Runtime hardening ─────────────────────────────────────────────────────────
ENV NODE_ENV=production \
    # Ensure Playwright runs Chromium in headless mode
    BROWSER_HEADLESS=true \
    # Disable pino-pretty in production (plain JSON is cheaper and pipe-friendly)
    LOG_PRETTY=false

# Chromium needs a larger /dev/shm than Docker's default 64 MB.
# Set --shm-size=2g (or larger) when running this image:
#   docker run --shm-size=2g ...
#   compose.yml: shm_size: "2gb"

EXPOSE 3000

# ── Non-root user ─────────────────────────────────────────────────────────────
# pwuser is created by the Playwright base image; switch before CMD so the
# process never runs as root.
USER pwuser

# ── Health check ──────────────────────────────────────────────────────────────
# /health is the lightweight endpoint defined in health.routes.ts.
# Start-period covers the Chromium browser launch on first request.
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

# ── Entry point ───────────────────────────────────────────────────────────────
# Use the JSON array form (exec form) so signals (SIGTERM/SIGINT) are delivered
# directly to the node process instead of a shell wrapper — enables graceful
# shutdown via the handlers registered in server.ts.
CMD ["node", "--enable-source-maps", "dist/app/config/server.js"]
