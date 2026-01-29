# Use Node.js as base
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY server/package*.json ./server/

# Install all dependencies (root + server)
RUN npm install --legacy-peer-deps
RUN cd server && npm install

# Copy source code
COPY . .

# Build the frontend
RUN npm run build

# Expose the unified port (API + Frontend)
EXPOSE 3001

# Start the Node server
CMD ["node", "server/index.js"]
