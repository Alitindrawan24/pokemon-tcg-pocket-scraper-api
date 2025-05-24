# Stage 1: Builder stage
FROM node:24-alpine AS builder

WORKDIR /usr/src/app

# Copy package files first for better layer caching
COPY package*.json ./

# Install all dependencies including devDependencies (needed for Nest CLI)
RUN npm install --include=dev

# Copy all source files (excluding public directory which will be mounted)
COPY . .

# Build the application
RUN npm run build

# Stage 2: Production stage
FROM node:24-alpine AS production

WORKDIR /usr/src/app

# Install only production dependencies
COPY --from=builder /usr/src/app/package*.json ./
RUN npm install --omit=dev

# Copy built files from builder stage
COPY --from=builder /usr/src/app/dist ./dist

# Create public dir (will be overridden by the volume mount)
RUN mkdir -p /usr/src/app/public && chown -R node:node /usr/src/app/public

# Run as non-root user (recommended for security)
USER node

# Expose the application port
EXPOSE 3000

# Command to run the application
CMD ["npm", "run", "start:prod"]