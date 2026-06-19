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
