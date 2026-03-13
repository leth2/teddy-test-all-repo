FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY tsconfig.json ./
COPY src/ ./src/

# Install tsx for running TypeScript directly
RUN npm install tsx typescript

EXPOSE 3001

ENV NODE_ENV=production
ENV PORT=3001

CMD ["node", "node_modules/.bin/tsx", "src/server.ts"]
