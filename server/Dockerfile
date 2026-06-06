FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install dependencies first (better layer caching)
# Copy only package files so this layer is rebuilt only when deps change
COPY package.json package-lock.json ./

# --omit=dev is the correct flag for npm 8+ (replaces --only=production)
RUN npm ci --omit=dev

# Copy source code (node_modules excluded via .dockerignore)
COPY src ./src

# Set production environment
ENV NODE_ENV=production

# Expose the app port
EXPOSE 5000

# Use node directly — no shell wrapper needed
CMD ["node", "src/index.js"]
