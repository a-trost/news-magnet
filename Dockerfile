FROM oven/bun:1

WORKDIR /app

# Copy everything needed
COPY package.json bun.lock tsconfig.json sources.json ./
COPY packages/shared packages/shared
COPY server server
COPY client client

# Install deps after all source is in place (bun creates symlinks that break if COPY runs after install)
RUN bun install --frozen-lockfile

# Build the client
RUN cd client && bun run build

# Remove dev-only deps and source to slim the image
RUN rm -rf client/src client/node_modules

RUN mkdir -p /data
ENV DB_PATH=/data/news.db
ENV PORT=8080

EXPOSE 8080

CMD ["bun", "run", "server/src/index.ts"]
