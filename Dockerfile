# Multi-stage build for React + Vite app
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Accept API key as build argument
ARG VITE_API_KEY
ENV API_KEY=${VITE_API_KEY}

# Build the app (API_KEY will be embedded in the bundle)
RUN npm run build

# Production stage - use nginx to serve static files
FROM nginx:alpine

# Install envsubst utility for environment variable substitution
RUN apk add --no-cache gettext

# Copy built files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration template
COPY nginx.conf /etc/nginx/conf.d/default.conf.template

# Copy startup script
COPY start.sh /start.sh
RUN chmod +x /start.sh

# Expose port 8080 (Google Cloud Run uses this by default)
EXPOSE 8080

# Use startup script that sets PORT dynamically
CMD ["/start.sh"]
