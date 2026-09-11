FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
COPY src/database/migrations ./dist/database/migrations

# Persistent data (SQLite DB, GeoIP mmdb) should live on a mounted volume
# in production — see README "Railway Deployment".
RUN mkdir -p /app/data

EXPOSE 3000
CMD ["node", "dist/index.js"]
