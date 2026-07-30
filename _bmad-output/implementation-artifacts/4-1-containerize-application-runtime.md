---
baseline_commit: 193a54bb297ae00bf3f5363e9bb38dbb58046960
created_at: 2026-07-30T00:00:00Z
---

# Story 4.1: Containerize Application Runtime

Status: review

## Story

As a developer,
I want the application to build and run in a Docker container,
so that the local runtime is reproducible across environments.

## Acceptance Criteria

1. Given the project dependencies are installed, when the container image is built, then the build completes successfully for the application runtime, and the image contains the compiled client and server runtime path needed for local execution.
2. Given the container is started, when the app boots inside the container, then the server listens on the configured application port, and the /health endpoint responds successfully.
3. Given the container runtime is documented, when a contributor follows the build and run instructions, then they can start the app without manual environment reconstruction, and the runtime behavior matches the single-instance local Node architecture.

## Tasks / Subtasks

- [x] Add a production-focused Dockerfile for the single-instance Node runtime. (AC: 1, 2)
  - [x] Build client and server artifacts as part of image creation.
  - [x] Ensure runtime stage includes only what is needed to run the app.
  - [x] Expose and use the configured application port in the container.
- [x] Add/update a .dockerignore tuned for this repository. (AC: 1)
  - [x] Exclude local artifacts, caches, and output folders not required for image build context.
- [x] Validate container runtime behavior. (AC: 2)
  - [x] Build image locally.
  - [x] Run container and verify /health response.
  - [x] Confirm app serves expected routes through the mapped port.
- [x] Document container build and run commands in README. (AC: 3)
  - [x] Add a concise quick-start section for Docker runtime.
  - [x] Keep documentation aligned with current local single-instance architecture.

## Dev Notes

- Source scope comes from Epic 4 in planning artifacts and approved sprint change proposal.
- Keep scope additive: do not alter product behavior from Epics 1-3.
- Preserve the existing runtime contract: one Node server process serving HTTP and Socket.IO.
- Do not introduce durable infrastructure (database, Redis, external brokers) for this story.

## References

- _bmad-output/planning-artifacts/epics.md (Epic 4, Story 4.1)
- _bmad-output/planning-artifacts/sprint-change-proposal-2026-07-30.md

## Dev Agent Record

### Implementation Plan

- Add a multi-stage Dockerfile to build client/server artifacts and run the compiled Node server.
- Add a repository-specific .dockerignore to reduce build context and avoid local artifact leakage.
- Validate runtime behavior by building and running the container, then checking health and routed pages.
- Document a concise Docker quick-start in README while preserving the single-instance runtime contract.

### Debug Log

- `npm run test -- server/containerization/dockerfile.test.ts` (failed first: Dockerfile missing)
- `npm ci` (installed dependencies to enable test tooling)
- `npm run test -- server/containerization/dockerfile.test.ts` (failed first: .dockerignore missing)
- `docker build -t adr-buddy:story-4-1 .` (successful)
- `docker run --name adr-buddy-4-1-test -d -p 3300:3000 adr-buddy:story-4-1` (initial run failed due to missing `ALLOWED_ORIGINS`)
- `docker build -t adr-buddy:story-4-1 .` + container smoke checks for `/health`, `/`, `/rooms/demo` (successful)
- `npm run test` (pass: 23 files, 231 tests)
- `npm run lint` (pass)

### Completion Notes

- Added a production-focused multi-stage Dockerfile with separate build/runtime stages and compiled artifact handoff.
- Configured runtime env defaults for local container usage (`PORT=3000`, `ALLOWED_ORIGINS` localhost values) to satisfy production env validation.
- Added `.dockerignore` entries for local outputs, caches, VCS metadata, and BMAD artifacts.
- Added containerization contract tests in `server/containerization/dockerfile.test.ts` for Dockerfile and `.dockerignore` expectations.
- Verified runtime behavior by building and running the image and validating: `/health` = 200, `/` = 200, `/rooms/demo` = 200.
- Updated README with Docker quick-start commands and architecture-aligned runtime explanation.

## File List

- Dockerfile
- .dockerignore
- server/containerization/dockerfile.test.ts
- README.md

## Change Log

- 2026-07-30: Implemented Story 4.1 containerization runtime support, validation tests, smoke-verified container behavior, and Docker quick-start documentation.
