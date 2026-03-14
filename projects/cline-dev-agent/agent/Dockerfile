FROM node:20-alpine

WORKDIR /app

# Lesson D01: npm ci → build → prune (tsc가 devDependencies에 있으므로 build 먼저)
COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src/ ./src/

RUN npm run build
RUN npm prune --omit=dev

# Cline CLI 전역 설치
RUN npm install -g cline

EXPOSE 3002

CMD ["node", "dist/index.js"]
