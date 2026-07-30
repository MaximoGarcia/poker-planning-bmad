---
baseline_commit: cafc79bc2d13cfb4652915e7a633876e5a6fcbd9
created_at: 2026-07-30T19:46:00Z
---

# Story 4.3: Document Docker Workflow And Smoke Checks

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer or reviewer,
I want clear Docker and Compose usage instructions,
so that I can validate the app quickly in a containerized setup.

## Acceptance Criteria

1. Given the containerized runtime exists, when a contributor reads the project documentation, then they can find the build, compose startup, and smoke-check commands, and the documentation explains the expected local runtime behavior.
2. Given the Docker workflow is used for verification, when smoke checks are run, then they confirm the health endpoint and core app startup path, and the verification steps are usable without external infrastructure.

## Tasks / Subtasks

- [x] Expand `README.md` with a Docker workflow verification section. (AC: 1)
  - [x] Document the `docker build -t adr-buddy:local .` command and expected outcome.
  - [x] Document the `docker compose up --build -d` command and how to override the published host port via `APP_PORT`.
  - [x] Document the smoke-check command(s) and the expected successful output.
  - [x] Explain expected local runtime behavior: one Node process serving HTTP, Socket.IO, and the built React client; in-memory session state; no external database, Redis, or broker.
- [x] Add a CI-friendly smoke-check script that exercises the containerized app. (AC: 2)
  - [x] Create `scripts/docker-smoke.mjs` that runs `docker compose up --build -d --wait`, verifies `/health` returns a healthy response, verifies `/` returns the React app, then runs `docker compose down`.
  - [x] Support `APP_PORT` environment override so the checks do not hardcode host port `3000`.
  - [x] Exit with a non-zero code on any failure and always tear down Compose resources.
  - [x] Keep the script self-contained so it does not require external infrastructure.
- [x] Wire the smoke check into the npm script surface. (AC: 2)
  - [x] Add `smoke:docker` to `package.json` scripts that invokes `node scripts/docker-smoke.mjs`.
  - [x] Keep the script optional so CI environments without Docker can still run the static test suite.
- [x] Add automated guardrails for the smoke-check artifact. (AC: 1, 2)
  - [x] Add a static Vitest test under `server/containerization/` that asserts `scripts/docker-smoke.mjs` references `/health`, `docker compose up`, and `docker compose down`, and supports the `APP_PORT` override.
  - [x] Keep the guardrail test runnable without a Docker daemon.
- [x] Validate the smoke-check path end-to-end when Docker is available. (AC: 2)
  - [x] Run `npm run smoke:docker` and confirm success.
  - [x] Run `npm run test`, `npm run lint`, and the containerization guardrail tests.

## Dev Notes

### Source Requirements

- Epic 4 objective: the project must start and verify consistently with Docker and Docker Compose while preserving the same local single-instance app behavior. [Source: _bmad-output/planning-artifacts/epics.md#Epic-4-Containerized-Runtime-And-Compose-Orchestration]
- Story 4.3 requires clear Docker/Compose usage instructions and smoke checks that confirm the health endpoint and core app startup path without external infrastructure. [Source: _bmad-output/planning-artifacts/epics.md#Story-43-Document-Docker-Workflow-And-Smoke-Checks]
- PRD NFR-7 requires Docker and Docker Compose assets so contributors can start the system with minimal commands and consistent dependencies. [Source: _bmad-output/planning-artifacts/prds/prd-adr-buddy-2026-06-16/prd.md#Non-Functional-Requirements]
- Sprint change proposal frames Story 4.3 as the developer and QA container workflow: clear commands for build, start, stop, logs; smoke verification steps; and a CI-ready compose smoke command. [Source: _bmad-output/planning-artifacts/sprint-change-proposal-2026-07-30.md]

### Architecture Compliance

- The runtime must remain one Node.js application instance for MVP while session state is in memory. Do not add multi-instance scaling, Redis, databases, brokers, or deployment pipelines. [Source: _bmad-output/planning-artifacts/architecture.md#Runtime-Assumptions]
- The Node server owns Express HTTP endpoints, Socket.IO, and serving the built React client. Compose must wrap this existing runtime rather than split it into separate frontend/backend services. [Source: _bmad-output/planning-artifacts/architecture.md#Runtime-Assumptions]
- Healthchecks must target the existing `/health` endpoint. [Source: _bmad-output/planning-artifacts/architecture.md#Runtime-Assumptions]
- The containerized runtime must preserve the same single-instance authority model as the local Node process. [Source: _bmad-output/planning-artifacts/architecture.md#Cross-Component-Dependencies]

### Existing Runtime State To Preserve

- `Dockerfile` is a multi-stage Node 20.19.0-alpine build that compiles the client and server, installs production dependencies in the runtime stage, runs as `node`, exposes `3000`, declares a Docker `HEALTHCHECK` against `/health`, and starts `server-dist/server/index.js`.
- `.dockerignore` excludes local artifacts such as `node_modules`, `dist`, `server-dist`, coverage reports, Playwright output, `_bmad-output`, `_bmad`, VCS metadata, and local env files.
- `compose.yaml` defines a single `app` service built from the root `Dockerfile`, maps host port `${APP_PORT:-3000}` to container port `3000`, sets `NODE_ENV=production`, `PORT=3000`, and localhost `ALLOWED_ORIGINS`, and declares a Compose healthcheck against `http://127.0.0.1:3000/health`.
- `server/http/health.ts` responds on `/health` with a 200 JSON payload containing `service: 'adr-buddy'` and `status: 'healthy'`.
- `server/config/env.ts` requires `ALLOWED_ORIGINS` in production when not provided by defaults. If the externally used host port changes, `ALLOWED_ORIGINS` must include that origin or Socket.IO/CORS requests may fail. The Compose service already couples `PORT=3000` with the default origins.
- `README.md` already contains concise Docker and Compose quick-start sections added by Stories 4.1 and 4.2. Story 4.3 should extend it with smoke-check instructions and expected runtime behavior, not duplicate the existing quick-start content.

### File Structure Requirements

- Add the smoke-check script under a new repository root `scripts/` directory.
- Add guardrail tests under `server/containerization/`, alongside `dockerfile.test.ts` and `compose.test.ts`.
- Update `README.md` only with verification and expected-behavior documentation; keep existing local-development and quick-start sections intact.
- Update `package.json` scripts to expose the smoke-check command.
- Do not create new runtime source directories or alternate server entrypoints.

### Testing Requirements

- Follow the existing Vitest static containerization test style: read the smoke script or root files with `readFileSync` and assert required content.
- Required new/updated validation commands for dev-story completion:
  - `npm run test -- server/containerization`
  - `npm run test`
  - `npm run lint`
- If Docker is available locally, also validate manually with:
  - `npm run smoke:docker`
- Do not make successful manual Docker execution the only proof; keep automated static tests so CI can validate the artifact without requiring Docker daemon access.

### Previous Story Intelligence

- Story 4.1 established the production image and `.dockerignore`; build from that image path instead of duplicating container build logic.
- Story 4.1 review fixed root user, patch-pinned Node image, Dockerfile healthcheck, and README port/origin coupling docs. Do not regress those fixes.
- Story 4.1 deferred automated docker build/run validation as CI-infrastructure dependent. Story 4.2 added static Compose contract tests and left broader container smoke orchestration to Story 4.3.
- Story 4.2 added `compose.yaml`, static Compose guardrail tests, and concise Compose usage docs. Do not change the single-service shape, the healthcheck target, or the port/env defaults.
- Story 4.2 review accepted that `docker compose config` plus static contract tests are sufficient for 4.2; live smoke-check coverage was explicitly deferred to Story 4.3.

### Anti-Patterns To Avoid

- Do not add a database, Redis, message broker, reverse proxy, load balancer, or multi-container frontend/backend split.
- Do not require external services, cloud accounts, or managed infrastructure for smoke checks.
- Do not replace the existing npm-script local development path; Docker remains additive.
- Do not make smoke checks the only way to validate the project; they must remain optional for CI nodes without Docker.
- Do not hardcode host port `3000` without an environment override; this caused a port-conflict failure during Story 4.2 manual validation.
- Do not add brittle UI assertions to the smoke script; verifying the health endpoint and a successful root response is sufficient for "core app startup path."

### References

- _bmad-output/planning-artifacts/epics.md (Epic 4, Story 4.3)
- _bmad-output/planning-artifacts/prds/prd-adr-buddy-2026-06-16/prd.md (NFR-7)
- _bmad-output/planning-artifacts/architecture.md (Runtime Assumptions, Cross-Component Dependencies)
- _bmad-output/planning-artifacts/sprint-change-proposal-2026-07-30.md
- _bmad-output/implementation-artifacts/4-1-containerize-application-runtime.md (previous story learnings)
- _bmad-output/implementation-artifacts/4-2-compose-one-command-startup.md (previous story learnings)
- Dockerfile
- .dockerignore
- compose.yaml
- README.md
- package.json
- server/config/env.ts
- server/http/health.ts
- server/http/health.test.ts
- server/containerization/dockerfile.test.ts
- server/containerization/compose.test.ts
- playwright.config.ts

## Dev Agent Record

### Agent Model Used

Cascade

### Implementation Plan

- Add a cross-platform Node smoke-check script at `scripts/docker-smoke.mjs` that orchestrates `docker compose up --build -d --wait`, polls `/health`, checks `/`, and tears down with `docker compose down`.
- Expose the script via `npm run smoke:docker` in `package.json`.
- Add static guardrail tests under `server/containerization/` that assert the smoke script contains the required orchestration commands and supports `APP_PORT` override.
- Update `README.md` with a Docker workflow verification section: build, compose startup, smoke-check command, expected output, and expected local runtime behavior.
- Run the automated regression suite and, if Docker is available, run the smoke-check script end-to-end.

### Debug Log References

- Smoke-script health check initially expected a flat `{status: 'healthy'}` body, but the server returns `{ok: true, data: {status: 'healthy'}}`. Updated the check to match the actual response shape.
- First smoke run on the default host port `3000` failed because the port was already allocated; reran with `APP_PORT=3001` to validate the environment override path.
- `AbortSignal.timeout(2000)` was too aggressive during container startup; increased per-request timeout to 5000ms and added health-poll error logging.
- Lint emitted an unused `eslint-disable-next-line no-console` warning because `.mjs` files are not in the project's lint target; removed the unnecessary directive.

### Completion Notes List

- Added `scripts/docker-smoke.mjs`: self-contained Node script that runs `docker compose up --build -d --wait`, polls `/health`, verifies the root path returns HTML, and always tears down with `docker compose down`.
- Added `server/containerization/docker-smoke.test.ts`: static guardrail tests asserting the smoke script references `/health`, `docker compose up`, `docker compose down`, and `APP_PORT`.
- Updated `package.json` with the `smoke:docker` npm script so the smoke check is discoverable but optional for CI nodes without Docker.
- Expanded `README.md` with a Docker Workflow Verification section covering image build, Compose startup, `APP_PORT` override, `npm run smoke:docker`, expected output, and expected single-instance runtime behavior.
- Validation run: `npm run test -- server/containerization` (14 tests passed), `npm run test` (243 tests passed), `npm run lint` (clean), and `APP_PORT=3001 npm run smoke:docker` (successful end-to-end container smoke).

### File List

- `scripts/docker-smoke.mjs`
- `server/containerization/docker-smoke.test.ts`
- `package.json`
- `README.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Change Log

- 2026-07-30: Created Story 4.3 context for documenting the Docker workflow and adding containerized smoke checks.
- 2026-07-30: Implemented Docker workflow documentation, smoke-check script, npm wiring, static guardrail tests, and end-to-end validation.
