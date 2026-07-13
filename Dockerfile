FROM mcr.microsoft.com/playwright:v1.61.1-noble

WORKDIR /app

# Install dependencies (cached layer unless package*.json changes)
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
