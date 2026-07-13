FROM mcr.microsoft.com/playwright:v1.61.1-noble

WORKDIR /app

# Install dependencies (cached layer unless package*.json changes)
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY tsconfig.json ./
COPY jest.config.js ./
COPY src/ ./src/
COPY tests/ ./tests/
RUN npm run build

EXPOSE 3000

# Run as non-root user for security
USER pwuser

CMD ["npm", "start"]