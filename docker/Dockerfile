FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source files
COPY tsconfig.json ./
COPY src ./src

# Build the application
RUN npm run build

# Expose the default port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production

# Run with HTTP transport by default
CMD ["node", "dist/index.js", "--http"]
