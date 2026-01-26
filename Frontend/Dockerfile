FROM node:22-slim AS builder

WORKDIR /app

# Install build tools needed for native modules (e.g. better-sqlite3)
RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 make g++ && \
    rm -rf /var/lib/apt/lists/*

COPY . .

RUN npm install

# Install server dependencies (needs build tools for native modules)
WORKDIR /app/server
RUN npm install
WORKDIR /app

RUN npm run build

FROM node:22-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=80

COPY package.json package.json
COPY --from=builder /app/node_modules node_modules
RUN npm prune --production

COPY --from=builder /app/dist dist
COPY --from=builder /app/server server
COPY --from=builder /app/server/node_modules server/node_modules

EXPOSE 80 443

CMD ["node", "server/server.js"]
