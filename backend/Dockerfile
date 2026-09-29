# Production Dockerfile for Node.js Express Backend
FROM node:20-alpine AS base

# Install curl/wget for healthcheck
RUN apk add --no-cache wget

WORKDIR /usr/src/app

# Copy dependency definitions
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy application source
COPY . .

# Run as non-root user 'node'
USER node

# Expose internal port
EXPOSE 5000

CMD ["node", "src/app.js"]
