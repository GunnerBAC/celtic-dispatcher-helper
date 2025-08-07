# Use Node.js 20 as the base image for Cloud Run compatibility
FROM node:20-slim

# Set working directory
WORKDIR /app

# Install dependencies for Puppeteer (if needed) and other native modules
RUN apt-get update && apt-get install -y \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy the built application
COPY dist ./dist

# Create a non-root user
RUN useradd -m -u 1001 nodeuser && chown -R nodeuser:nodeuser /app
USER nodeuser

# Expose the port (Cloud Run will set PORT environment variable)
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:${PORT:-8080}/health || exit 1

# Start the application
CMD ["node", "dist/index.js"]