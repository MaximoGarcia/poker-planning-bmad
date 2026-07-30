# ADR Buddy

ADR Buddy is a Planning Poker application scaffold built with Vite, React, TypeScript, Express, and Socket.IO.

## Scripts

- `npm run dev:client` starts the Vite client dev server.
- `npm run dev:server` starts the TypeScript server in watch mode.
- `npm run typecheck` runs all TypeScript project checks.
- `npm run test` runs Vitest unit and component tests.
- `npm run build` builds the Vite client to `dist` and the Node server to `server-dist`.
- `npm run start` starts the compiled production server.
- `npm run lint` runs ESLint.

## Local Production Smoke

```powershell
npm run build
$env:PORT = "3000"
npm run start
```

The production server exposes `/health`, hosts Socket.IO, serves `dist`, and falls back to the React app for deep SPA routes.

## Docker Quick Start

Build the production image:

```bash
docker build -t adr-buddy:local .
```

Run a single application instance and publish the app on port 3000:

```bash
docker run --rm -p 3000:3000 adr-buddy:local
```

Then verify the app is healthy:

```bash
curl http://localhost:3000/health
```

This container runs the compiled Node server (`server-dist/server/index.js`) that serves both the API/Socket.IO endpoints and the built client bundle (`dist`), matching the local single-instance architecture.
