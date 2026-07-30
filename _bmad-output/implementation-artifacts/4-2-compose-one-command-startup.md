---
baseline_commit: a79a546336dec66af6b7b9a5c659783fe7f19bf4
created_at: 2026-07-30T19:16:00Z
---

# Story 4.2: Compose One-Command Startup

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want Docker Compose to start the application with one command,
so that setup and verification are simpler for contributors.

## Acceptance Criteria

1. Given the compose configuration is present, when a contributor runs the standard compose startup command, then the required application service starts successfully, and the exposed port and healthcheck are wired correctly.
2. Given the compose startup sequence runs, when the application is ready, then the compose setup preserves the same single-instance authority model as the non-container runtime, and Socket.IO and HTTP requests work through the mapped port.
3. Given the compose workflow is used for local verification, when a contributor follows the documented path, then they can stop, restart, and inspect logs using compose commands, and the workflow remains simple enough for routine development use.

## Tasks / Subtasks

- [x] Add a baseline Docker Compose configuration for the single app runtime. (AC: 1, 2)
  - [x] Create `compose.yaml` at the repository root with one application service only.
  - [x] Build from the existing root `Dockerfile` instead of introducing a second image definition.
  - [x] Publish host port `3000` to container port `3000` for the standard local path.
  - [x] Set runtime environment consistently with the image defaults: `NODE_ENV=production`, `PORT=3000`, and localhost `ALLOWED_ORIGINS` for the mapped port.
- [x] Wire Compose health and dependency behavior without adding unnecessary infrastructure. (AC: 1, 2)
  - [x] Add a Compose healthcheck that targets `http://127.0.0.1:3000/health` inside the app container.
  - [x] Do not add Redis, databases, brokers, reverse proxies, or additional app replicas.
  - [x] Preserve the single authoritative Node process for in-memory session state and Socket.IO connections.
- [x] Add automated guardrail tests for the Compose contract. (AC: 1, 2, 3)
  - [x] Add a Vitest containerization test that reads `compose.yaml` and asserts the app service, build context/dockerfile, port mapping, environment, and healthcheck command.
  - [x] Assert that the Compose file does not introduce non-MVP services such as Redis, databases, external brokers, or multiple app replicas.
  - [x] Keep static tests near the existing containerization tests under `server/containerization/`.
- [x] Add concise Compose usage guidance for routine local verification. (AC: 3)
  - [x] Update `README.md` with the standard compose start command, stop command, restart command, and logs command.
  - [x] Keep Story 4.2 docs concise; leave deeper smoke-check/documentation expansion to Story 4.3.
  - [x] Mention that Compose runs the same compiled single-instance Node server that serves HTTP, Socket.IO, and the built client.

### Review Findings

- [x] [Review][Decision] Resolve incomplete live Compose validation evidence — Accepted: `docker compose config` plus static contract tests are sufficient for Story 4.2; live smoke-check coverage deferred to Story 4.3.
- [x] [Review][Patch] Add port-conflict and detached-mode recovery to Compose workflow [`compose.yaml:7`, `README.md:61`]
- [x] [Review][Patch] Make the Compose healthcheck follow the configured container `PORT` [`compose.yaml:13`]
- [x] [Review][Patch] Strengthen Compose guardrail tests by parsing YAML and asserting the exact single-service structure [`server/containerization/compose.test.ts:11`]
- [x] [Review][Patch] Resolve `compose.yaml` relative to the test file instead of `process.cwd()` [`server/containerization/compose.test.ts:5`]
- [x] [Review][Patch] Remove unrelated completion-note noise from the story record [`_bmad-output/implementation-artifacts/4-2-compose-one-command-startup.md:145`]

## Dev Notes

### Source Requirements

- Epic 4 objective: the project must start and verify consistently with Docker and Docker Compose while preserving the same local single-instance app behavior. [Source: _bmad-output/planning-artifacts/epics.md#Epic-4-Containerized-Runtime-And-Compose-Orchestration]
- Story 4.2 requires a one-command Compose startup path with wired port exposure, healthcheck behavior, Socket.IO/HTTP through the mapped port, and simple stop/restart/log workflows. [Source: _bmad-output/planning-artifacts/epics.md#Story-42-Compose-One-Command-Startup]
- PRD NFR-7 requires Docker and Docker Compose assets so contributors can start the system with minimal commands and consistent dependencies. [Source: _bmad-output/planning-artifacts/prds/prd-poker-planning-bmad-2026-06-16/prd.md#Non-Functional-Requirements]

### Architecture Compliance

- The runtime must remain one Node.js application instance for MVP while session state is in memory. Do not add multi-instance scaling, Redis, databases, brokers, or deployment pipelines. [Source: _bmad-output/planning-artifacts/architecture.md#Runtime-Assumptions]
- The Node server owns Express HTTP endpoints, Socket.IO, and serving the built React client. Compose must wrap this existing runtime rather than split it into separate frontend/backend services. [Source: _bmad-output/planning-artifacts/architecture.md#Runtime-Assumptions]
- Compose should prefer a single app service for the standard startup path. Optional dev profile work is explicitly not needed for this story unless later scope changes. [Source: _bmad-output/planning-artifacts/architecture.md#Runtime-Assumptions]
- Healthchecks must target the existing `/health` endpoint. [Source: _bmad-output/planning-artifacts/architecture.md#Runtime-Assumptions]
- The containerized runtime must preserve the same single-instance authority model as the local Node process. [Source: _bmad-output/planning-artifacts/architecture.md#Cross-Component-Dependencies]

### Existing Runtime State To Preserve

- `Dockerfile` already builds client and server artifacts, installs production dependencies in the runtime stage, exposes port `3000`, runs as `node`, defines a `/health` Docker healthcheck, and starts `server-dist/server/index.js`.
- The image defaults `NODE_ENV=production`, `PORT=3000`, and `ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000`. Compose can repeat these values for readability, but must not conflict with them.
- `server/config/env.ts` requires `ALLOWED_ORIGINS` in production when not provided by defaults. If port mapping changes, `ALLOWED_ORIGINS` must match the externally used origin or Socket.IO/CORS requests may fail.
- `server/http/health.ts` responds on `/health` with a successful ACK payload containing service `poker-planning-bmad` and status `healthy`.
- `server/index.ts` creates one HTTP server, attaches Socket.IO to it, registers session handlers once, and listens on the configured port. Compose must not add extra replicas for this in-memory architecture.

### File Structure Requirements

- Add new Compose config at root as `compose.yaml`.
- Add Compose guardrail tests under `server/containerization/`, alongside `server/containerization/dockerfile.test.ts`.
- Update `README.md` only with concise Compose commands needed for AC3. Keep full smoke-check workflow for Story 4.3.
- Do not create new runtime source directories or alternate server entrypoints.

### Testing Requirements

- Follow the existing Vitest static containerization test style: read root-level runtime files with `readFileSync` and assert required content.
- Required new/updated validation commands for dev-story completion:
  - `npm run test -- server/containerization`
  - `npm run test`
  - `npm run lint`
- If Docker Compose is available locally, also validate manually with:
  - `docker compose up --build`
  - `curl http://localhost:3000/health`
  - `docker compose logs app`
  - `docker compose restart app`
  - `docker compose down`
- Do not make successful manual Docker Compose execution the only proof; keep automated static tests so CI can validate the contract without requiring Docker daemon access.

### Previous Story Intelligence

- Story 4.1 established the production image and `.dockerignore`; build from that image path instead of duplicating container build logic.
- Story 4.1 review fixed root user, patch-pinned Node image, Dockerfile healthcheck, and README port/origin coupling docs. Do not regress those fixes.
- Story 4.1 deferred full automated Docker build/run validation as CI-infrastructure dependent. Story 4.2 should add static Compose contract tests and leave broader container smoke orchestration to Story 4.3.
- Recent git history for Story 4.1 touched `Dockerfile`, `README.md`, `server/containerization/dockerfile.test.ts`, `deferred-work.md`, and sprint tracking; reuse these patterns and avoid unrelated product code changes.

### Anti-Patterns To Avoid

- Do not add a database, Redis, message broker, reverse proxy, load balancer, or multi-container frontend/backend split.
- Do not add multiple app replicas because current session authority and Socket.IO state are in-memory.
- Do not change existing Socket.IO event contracts, room behavior, session store behavior, UI routes, or product flows.
- Do not introduce a second Dockerfile or compose-only runtime entrypoint.
- Do not make README documentation broad enough to consume Story 4.3 scope; include only commands needed for start/stop/restart/log inspection.

### References

- _bmad-output/planning-artifacts/epics.md (Epic 4, Story 4.2)
- _bmad-output/planning-artifacts/prds/prd-poker-planning-bmad-2026-06-16/prd.md (NFR-7)
- _bmad-output/planning-artifacts/architecture.md (Runtime Assumptions, Cross-Component Dependencies)
- _bmad-output/planning-artifacts/sprint-change-proposal-2026-07-30.md (Epic 4 handoff)
- _bmad-output/implementation-artifacts/4-1-containerize-application-runtime.md (previous story learnings)
- Dockerfile
- README.md
- server/config/env.ts
- server/http/health.ts
- server/index.ts
- server/containerization/dockerfile.test.ts

## Dev Agent Record

### Agent Model Used

Cascade

### Implementation Plan

- Add a root Compose configuration for a single `app` service that builds the existing Dockerfile, exposes port `3000`, configures runtime env, and targets `/health` for healthchecks.
- Add static Vitest guardrails for the Compose contract under `server/containerization/`.
- Document concise Compose start, logs, restart, and stop commands in `README.md`.

### Debug Log References

- `npm run test -- server/containerization/compose.test.ts` (failed first: `compose.yaml` missing)
- `npm run test -- server/containerization/compose.test.ts` (pass: 5 tests)
- `npm run test -- server/containerization` (pass: 2 files, 10 tests)
- `npm run test` (pass: 24 files, 239 tests)
- `npm run lint` (pass)
- `docker compose version` (pass: Docker Compose v5.3.1 available)
- `docker compose up --build -d && curl -fsS http://localhost:3000/health && docker compose logs --no-color --tail=50 app && docker compose restart app && docker compose down` (failed: host port `3000` already allocated)
- `docker compose down` (pass: removed partial Compose resources)
- `docker compose config` (pass: service, build, env, port, and healthcheck resolved)

### Completion Notes List

- Added root `compose.yaml` with one `app` service that builds the existing `Dockerfile`, maps `3000:3000`, configures production runtime env, and healthchecks `/health`.
- Added static Compose guardrail tests under `server/containerization/` covering app service shape, build config, port mapping, runtime env, healthcheck, and non-MVP service exclusions.
- Updated README with concise Compose start, logs, restart, and stop commands.
- Full automated regression suite and lint pass. Manual live Compose startup was blocked by an existing host process on port `3000`; Compose config validation passed and partial resources were cleaned up.

### File List

- README.md
- _bmad-output/implementation-artifacts/4-2-compose-one-command-startup.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- compose.yaml
- server/containerization/compose.test.ts

## Change Log

- 2026-07-30: Created Story 4.2 context for Docker Compose one-command startup.
- 2026-07-30: Implemented Story 4.2 Compose one-command startup, automated Compose contract tests, README Compose quick start, and validation tracking.
