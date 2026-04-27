FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source
COPY . .

# Create uploads directory
RUN mkdir -p uploads

# Expose API port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=10s --timeout=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:4000/health || exit 1

# Start server
CMD ["node", "index.js"]
