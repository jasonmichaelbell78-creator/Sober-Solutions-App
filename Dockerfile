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

# Copy built files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration (we'll create this)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 8080 (Google Cloud Run uses this by default)
EXPOSE 8080

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
