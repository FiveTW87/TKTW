# Single-service image: builds the client, then runs the Node/Socket.IO server
# which ALSO serves the built client (one URL, no CORS, no reverse proxy).
FROM node:20-slim

# pnpm via corepack (version pinned by root package.json "packageManager")
RUN corepack enable

WORKDIR /app

# Install deps first (better layer caching), then the rest of the repo.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/engine/package.json packages/engine/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/server/package.json packages/server/package.json
COPY packages/client/package.json packages/client/package.json
RUN pnpm install --frozen-lockfile

COPY . .

# Build the client SPA (outputs packages/client/dist).
RUN pnpm --filter @tktw/client build

# The server serves that dist on the same origin as Socket.IO.
ENV CLIENT_DIST=/app/packages/client/dist
ENV NODE_ENV=production
# Railway/Render inject their own PORT; the server reads process.env.PORT.
EXPOSE 3001

CMD ["pnpm", "--filter", "@tktw/server", "start"]
