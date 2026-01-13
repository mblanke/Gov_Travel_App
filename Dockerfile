# Use Node.js LTS version (slim Debian-based image for better compatibility)
FROM node:18-slim

# Install SQLite
RUN apt-get update && apt-get install -y \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy application files
COPY . .

# Run complete database migration on container start
RUN mkdir -p database && \
    node scripts/migrateCompleteTravelRates.js || echo "Migration will run on first request"

# Expose port 5001
EXPOSE 5001

# Start the server
CMD ["node", "server.js"]
