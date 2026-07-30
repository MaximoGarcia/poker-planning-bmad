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

Commands below use a POSIX shell (bash/zsh). On Windows PowerShell, run `docker`
commands as-is and replace `curl` with `Invoke-WebRequest` (or use `curl.exe`,
bundled with recent Windows versions).

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

The image defaults `PORT=3000` and `ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000`.
If you override `PORT` (e.g. `-e PORT=4000 -p 4000:4000`), you must also override
`ALLOWED_ORIGINS` to match, or Socket.IO/CORS requests will be rejected:

```bash
docker run --rm -e PORT=4000 -e ALLOWED_ORIGINS=http://localhost:4000 -p 4000:4000 adr-buddy:local
```

## Docker Compose Quick Start

Start the single application service with one command:

```bash
docker compose up --build -d
```

The `-d` flag runs the service in the background so the terminal stays free for
the commands below. If host port `3000` is already in use, stop the conflicting
process or override the published port:

```bash
APP_PORT=3001 docker compose up --build -d
```

The Compose service uses the same Dockerfile and compiled single-instance Node server that serves HTTP, Socket.IO, and the built client on `http://localhost:3000`.

Use routine Compose commands to inspect and control the local runtime:

```bash
docker compose logs app
docker compose restart app
docker compose down
```

## Docker Workflow Verification

The fastest way to verify the containerized runtime is to build the image, start Compose, and run the automated smoke checks.

### Build the production image

```bash
docker build -t adr-buddy:local .
```

Expected outcome: Docker finishes the multi-stage build and tags the final image as `adr-buddy:local`. The image contains the compiled React client, compiled server, and production Node dependencies.

### Start the containerized app

```bash
docker compose up --build -d
```

Expected outcome: Compose builds the service (if needed), starts a single `app` container in the background, and the container reports `healthy` once the `/health` endpoint responds. The app is available at `http://localhost:3000`.

If host port `3000` is already in use, override the published port with `APP_PORT`:

```bash
APP_PORT=3001 docker compose up --build -d
```

Then access the app at `http://localhost:3001`.

### Run the automated smoke checks

```bash
npm run smoke:docker
```

Expected successful output:

```
[smoke] Starting containerized smoke check on host port 3000...
[smoke] Building and starting services with docker compose up --build -d --wait...
[smoke] Waiting for /health to report healthy at http://127.0.0.1:3000...
[smoke] Health check passed: status=healthy
[smoke] Verifying root path at http://127.0.0.1:3000...
[smoke] Root path returned a valid HTML document.
[smoke] Smoke check completed successfully.
[smoke] Tearing down Compose resources...
[smoke] Teardown complete.
```

To run the smoke checks against a non-default host port:

```bash
APP_PORT=3001 npm run smoke:docker
```

The smoke script always tears down the Compose resources it creates, even when a check fails, and exits with a non-zero status code on failure.

### Expected local runtime behavior

The containerized setup preserves the same single-instance behavior as the local Node process:

- One Node.js process serves HTTP requests, Socket.IO traffic, and the built React client.
- Session state is held in memory; no external database, Redis, or message broker is required.
- The Compose service wraps the existing Dockerfile and server entrypoint; it does not split the frontend and backend into separate services.
- Health checks target the `/health` endpoint inside the container.
