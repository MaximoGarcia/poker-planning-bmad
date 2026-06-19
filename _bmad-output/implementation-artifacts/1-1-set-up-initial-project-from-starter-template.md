# Story 1.1: Set Up Initial Project From Starter Template

Status: ready-for-dev

Completion Note: Ultimate context engine analysis completed - comprehensive developer guide created.

## Story

As a Moderator,
I want a runnable Planning Poker application foundation,
so that live session creation and joining can be built on a consistent client, server, and shared contract structure.

## Acceptance Criteria

1. Given a fresh project workspace, when the developer initializes the application foundation, then the project uses Vite React TypeScript for the client and a TypeScript Node/Express/Socket.IO server scaffold, and shared TypeScript contract folders exist for acknowledgements, errors, socket events, snapshots, decks, session types, and command schemas.
2. Given the server is running locally, when a request is made to the health endpoint, then the server returns a successful health response, and the server is configured to listen on `process.env.PORT` for Azure App Service compatibility.
3. Given the project is prepared for future live-session stories, when tests are run, then Vitest is configured for unit tests, React Testing Library is available for component tests, and Playwright configuration exists for future e2e flows.
4. Given the application is built for production, when the Node server starts, then it can serve the Vite build output, and it provides an SPA fallback for React Router.
5. Given shared contracts are used by both client and server code, when TypeScript build, test, and runtime entry points import shared modules, then the project configuration resolves shared contract imports without duplicate contract definitions, and the chosen path aliases, package settings, or build settings work for both Vite client code and the Node server build.
6. Given the app is prepared for Azure App Service deployment, when production scripts and startup configuration are inspected, then package scripts build the React client and TypeScript server, and the production start script launches the compiled Node server that serves `dist`, exposes `/health`, hosts Socket.IO, and listens on `process.env.PORT`.

## Tasks / Subtasks

- [ ] Initialize the Vite React TypeScript app at the repository root without deleting existing BMad artifacts. (AC: 1)
  - [ ] Run `npm create vite@latest . -- --template react-ts` or the equivalent non-interactive flow from the Vite docs.
  - [ ] If the scaffold prompts because the directory is not empty, preserve `_bmad/`, `_bmad-output/`, `.agents/`, and `.git/`; do not choose an option that removes existing files.
  - [ ] Keep the generated Vite root files aligned with the architecture: `package.json`, `package-lock.json`, `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `index.html`, `public/`, and `src/`.
- [ ] Add the TypeScript Node server scaffold. (AC: 1, 2, 4, 6)
  - [ ] Create `server/index.ts`, `server/app.ts`, `server/http/health.ts`, `server/http/static-client.ts`, `server/socket/register-session-handlers.ts`, `server/config/env.ts`, `server/domain/`, and `server/security/`.
  - [ ] Use Express 5.x for HTTP concerns and Socket.IO 4.x on the same HTTP server.
  - [ ] Expose `/health` with a successful JSON response suitable for local and App Service health checks.
  - [ ] Read the listen port from `process.env.PORT`, falling back only for local development.
  - [ ] Serve the Vite production build from `dist` and provide a React Router SPA fallback for non-API, non-socket routes.
- [ ] Create shared contracts and schemas that compile for both client and server. (AC: 1, 5)
  - [ ] Create `src/shared/contracts/ack.ts`, `errors.ts`, `socket-events.ts`, and `snapshots.ts`.
  - [ ] Create `src/shared/domain/decks.ts` and `session-types.ts`.
  - [ ] Create `src/shared/schemas/command-schemas.ts` and `session-schemas.ts` with Zod 4 schemas.
  - [ ] Define a single shared acknowledgement shape: `{ ok: true, data }` or `{ ok: false, error: { code, message, details? } }`.
  - [ ] Define stable event constants or typed event maps for the architecture events, even if later stories fill in command behavior.
  - [ ] Configure imports so client and server consume these shared modules from one source of truth.
- [ ] Configure build, type-check, and runtime scripts for one deployable Node app. (AC: 4, 5, 6)
  - [ ] Add scripts such as `dev`, `dev:client`, `dev:server`, `build`, `build:client`, `build:server`, `start`, `typecheck`, and `test` using the repo's chosen tooling.
  - [ ] Compile the server to a Node-runnable output that can import shared contracts after build.
  - [ ] Set package/runtime metadata so local development satisfies Vite's Node requirement and Azure can use Node 24 LTS where available.
  - [ ] Add `.env.example` with non-secret local settings such as allowed local origins and an example `PORT`.
- [ ] Add test tooling and first scaffold tests. (AC: 2, 3, 5)
  - [ ] Configure Vitest for TypeScript unit tests and jsdom-based component tests.
  - [ ] Add React Testing Library and a `src/test/render.tsx` helper.
  - [ ] Add Playwright configuration under `playwright.config.ts` with tests located under `tests/e2e`.
  - [ ] Add at least one server health test, one shared schema/contract test, and one minimal React render/component smoke test.
  - [ ] Keep Playwright ready for future Moderator/Participant browser flows; do not implement full live-session e2e behavior in this story unless it is only a harmless smoke check.
- [ ] Add the initial app shell and route foundation without implementing later session behavior. (AC: 1, 4)
  - [ ] Create `src/app/App.tsx`, `src/app/routes.tsx`, and `src/app/styles.css`.
  - [ ] Install and wire React Router in SPA/declarative mode for `/`, `/session/:roomCode/moderator`, and `/session/:roomCode`.
  - [ ] Keep screens minimal but keyboard-readable and responsive enough to satisfy scaffold smoke tests.
- [ ] Verify the scaffold end to end. (AC: 1-6)
  - [ ] Run install, type-check, build, unit/component tests, and any configured Playwright smoke test.
  - [ ] Start the production server from the compiled output and confirm `/health` returns success.
  - [ ] Confirm a deep route such as `/session/ABC123` falls back to the React app instead of returning a server 404.

## Dev Notes

### Current Repository State

- The repository currently contains BMad planning and implementation artifacts but no application source, package manifest, client, or server scaffold. `rg --files -g '!_bmad-output/**' -g '!node_modules/**' -g '!.git/**'` returned only `_bmad` configuration and scripts.
- Treat this as a greenfield scaffold in a non-empty repository. The existing `_bmad/`, `_bmad-output/`, `.agents/`, and `.git/` content is planning infrastructure and must be preserved.
- There are no previous story implementation files for Epic 1, so there are no established application code patterns to inherit yet.

### Scope Boundaries

- This story creates a runnable foundation only. It must not implement real session creation, join behavior, room-code generation, voting, reveal, result aggregation, final estimate capture, persistence, authentication, backlog integrations, analytics, exports, or multi-session dashboards.
- Stub or skeletal event handlers are acceptable only when they compile, make Socket.IO startup possible, and do not pretend feature behavior exists.
- Do not introduce Redis, Azure Web PubSub, Azure SQL, Cosmos DB, Azure Storage, durable sessions, accounts, SSO, Redux, Zustand, GraphQL, tRPC, OpenAPI, or AsyncAPI in this story.

### Architecture Requirements

- Selected starter is Vite React TypeScript plus a custom TypeScript Node/Socket.IO server. The architecture explicitly identifies `npm create vite@latest . -- --template react-ts` as the first implementation priority. [Source: `_bmad-output/planning-artifacts/architecture.md#selected-starter-vite-react-typescript-custom-node-socketio-server`]
- The production app is one Node process on Azure App Service for Linux. The Node server must serve Express HTTP endpoints, Socket.IO, static Vite assets from `dist`, and an SPA fallback on the same origin. [Source: `_bmad-output/planning-artifacts/architecture.md#deployment-architecture`]
- HTTP is limited to health/static/minimal metadata. Live session behavior belongs to Socket.IO commands in later stories. [Source: `_bmad-output/planning-artifacts/architecture.md#api-communication-patterns`]
- Socket handlers must stay thin: validate, authorize, call domain logic, and emit sanitized snapshots. For this story, create the folders and typed contract seams so later stories can follow that pattern. [Source: `_bmad-output/planning-artifacts/architecture.md#process-patterns`]
- Shared contracts live under `src/shared` and must not import React or server-only modules. The server build must be able to import the same shared modules without copying contract definitions. [Source: `_bmad-output/planning-artifacts/architecture.md#file-organization-patterns`]

### Required Project Structure

Use the architecture's structure as the target. The first story should create at least these areas with compilable files where empty directories would otherwise be ignored by git:

```text
src/
  main.tsx
  app/
    App.tsx
    routes.tsx
    styles.css
  features/
    session/
  shared/
    contracts/
      ack.ts
      errors.ts
      socket-events.ts
      snapshots.ts
    domain/
      decks.ts
      session-types.ts
    schemas/
      command-schemas.ts
      session-schemas.ts
  test/
    render.tsx
server/
  index.ts
  app.ts
  config/
    env.ts
  domain/
  security/
  socket/
    register-session-handlers.ts
  http/
    health.ts
    static-client.ts
tests/
  e2e/
```

Later stories will fill in richer feature modules such as `CreateSessionView`, `JoinSessionView`, `ModeratorSessionView`, `ParticipantSessionView`, `useSessionSocket`, card controls, results components, and complete domain commands. [Source: `_bmad-output/planning-artifacts/architecture.md#complete-project-directory-structure`]

### Contract Guardrails

- Acknowledgements must use the shared shape from architecture: `{ ok: true, data }` or `{ ok: false, error: { code, message, details? } }`.
- Event names must be stable and match the architecture: client events `session:create`, `session:join`, `story:update`, `deck:select`, `round:start`, `vote:submit`, `round:reveal`, `round:reset`, `estimate:record`, `story:advance`, and `session:leave`; server events `session:snapshot`, `session:error`, and `session:closed`.
- Error codes must be uppercase snake case. Include at least the architecture seed codes: `INVALID_ROOM_CODE`, `UNAUTHORIZED`, `ROUND_NOT_ACTIVE`, `VOTE_LOCKED`, and `STORY_LOCKED`.
- Deck definitions must include T-shirt values `XS`, `S`, `M`, `L`, `XL` and Fibonacci values `1`, `2`, `3`, `5`, `8`, `13`, `21`, `Coffee`.
- Zod schemas should live beside shared contracts and infer TypeScript types where useful. Keep `strict` TypeScript mode enabled.

### Security And Privacy Guardrails

- Capability tokens and hidden vote values are future story behavior, but the scaffold must not log secrets or payloads indiscriminately.
- Add Helmet and restrictive CORS plumbing if the server scaffold includes middleware; use local origins in development and environment-driven production origin configuration.
- Do not add durable storage or data-at-rest decisions. v1 has live in-memory session state only.

### Testing Requirements

- Vitest must run unit tests for server/shared TypeScript modules.
- React Testing Library must be available for component interaction tests and should test through accessible DOM queries rather than implementation details.
- Playwright must be configured for future e2e flows under `tests/e2e`.
- Minimum scaffold tests should prove `/health` works, shared contracts/schemas can be imported, and the React app renders.
- A successful story should leave `npm run build` and `npm run test` working from a clean install.

### Latest Technical Notes Checked On 2026-06-19

- Vite docs show Vite `v8.0.16`, support the `react-ts` template, document `npm create vite@latest`, and state Vite requires Node.js `20.19+` or `22.12+`. Use a local/runtime Node version compatible with that requirement and with Azure's preferred Node 24 LTS target. Source: https://vite.dev/guide/
- Socket.IO docs are on version `4.x` and describe low-latency, bidirectional, event-based client/server communication with WebSocket and fallback transports. Source: https://socket.io/docs/v4/
- Zod 4 is stable, TypeScript-first, and expects TypeScript strict mode; keep schemas in shared code so command validation and types stay together. Source: https://zod.dev/
- Vitest is Vite-powered, installs as a dev dependency, uses `.test.` or `.spec.` filenames by default, and currently requires Node `>=20.0.0` and Vite `>=6.0.0`. Source: https://vitest.dev/guide/
- React Testing Library should be installed with `@testing-library/dom` and encourages user-centered DOM queries. Source: https://testing-library.com/docs/react-testing-library/intro/
- Playwright can be added to an existing TypeScript project and creates `playwright.config.ts` plus a tests folder without overwriting existing tests. Source: https://playwright.dev/docs/intro
- Azure App Service for Node supports stack configuration, app settings as environment variables, Web sockets for Socket.IO, Always On, session affinity for multi-instance routing, HTTPS Only, and Node stack versions including Node 24 LTS where available. Sources: https://learn.microsoft.com/en-us/azure/app-service/configure-language-nodejs and https://learn.microsoft.com/en-us/azure/app-service/configure-common
- React Router latest docs show version `8.0.1` and document declarative SPA installation with `BrowserRouter`; the architecture requires React Router SPA routes, not framework-mode server rendering. Source: https://reactrouter.com/start/declarative/installation

### Git Intelligence

- Recent commits are planning-only: sprint status setup, epics/readiness refinements, sprint change proposal, and architecture document creation.
- No application scaffold has been committed yet. There are no app implementation patterns to preserve beyond the architecture and BMad planning files.

## Project Structure Notes

- The architecture says client code belongs under `src`, server code under `server`, shared contracts under `src/shared`, unit/component tests co-located or under the relevant test helper area, and Playwright tests under `tests/e2e`.
- The only current variance is that BMad planning artifacts already exist in the repo root. Preserve them; the app scaffold should coexist with them.
- Empty placeholder directories are not enough. Add minimal exported TypeScript modules so the structure is visible, buildable, and testable.

## References

- `_bmad-output/planning-artifacts/epics.md#story-11-set-up-initial-project-from-starter-template`
- `_bmad-output/planning-artifacts/architecture.md#selected-starter-vite-react-typescript-custom-node-socketio-server`
- `_bmad-output/planning-artifacts/architecture.md#api-communication-patterns`
- `_bmad-output/planning-artifacts/architecture.md#frontend-architecture`
- `_bmad-output/planning-artifacts/architecture.md#deployment-architecture`
- `_bmad-output/planning-artifacts/architecture.md#complete-project-directory-structure`
- `_bmad-output/planning-artifacts/prds/prd-adr-buddy-2026-06-16/prd.md#cross-cutting-non-functional-requirements`
- `_bmad-output/planning-artifacts/implementation-readiness-report-2026-06-19.md#summary-and-recommendations`

## Dev Agent Record

### Agent Model Used

TBD by dev agent.

### Debug Log References

### Completion Notes List

### File List
