---
stepsCompleted:
  - 1
  - 2
  - 3
  - 4
  - 5
  - 6
  - 7
  - 8
inputDocuments:
  - "_bmad-output/planning-artifacts/briefs/brief-poker-planning-bmad-2026-06-16/.decision-log.md"
  - "_bmad-output/planning-artifacts/briefs/brief-poker-planning-bmad-2026-06-16/addendum.md"
  - "_bmad-output/planning-artifacts/briefs/brief-poker-planning-bmad-2026-06-16/brief.md"
  - "_bmad-output/planning-artifacts/prds/prd-poker-planning-bmad-2026-06-16/.decision-log.md"
  - "_bmad-output/planning-artifacts/prds/prd-poker-planning-bmad-2026-06-16/addendum.md"
  - "_bmad-output/planning-artifacts/prds/prd-poker-planning-bmad-2026-06-16/prd.md"
  - "_bmad-output/planning-artifacts/prds/prd-poker-planning-bmad-2026-06-16/reconcile-brief.md"
  - "_bmad-output/planning-artifacts/prds/prd-poker-planning-bmad-2026-06-16/review-rubric.md"
  - "_bmad-output/planning-artifacts/prds/prd-poker-planning-bmad-2026-06-16/source-extract-brief.md"
workflowType: 'architecture'
lastStep: 8
status: 'complete'
project_name: 'poker-planning-bmad'
user_name: 'Maxi'
date: '2026-06-17'
completedAt: '2026-06-17'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
The PRD defines 15 functional requirements across six main areas:

- Session creation and join: Moderators create Sessions and receive Room Codes; Participants join with Room Code and required Display Name; Moderator can see joined Participants and voting status.
- Story and Deck setup: Moderator sets the current Story identifier and description, selects either the T-shirt Deck or Fibonacci Deck, and Story changes are blocked during an active Round.
- Round control: Moderator alone can start, reset, advance, reveal, and record Final Estimates.
- Hidden voting: Participants and Moderator can submit one Vote from the active Deck; users can change Votes before reveal; selected Cards stay hidden until reveal.
- Reveal and result reading: Moderator reveals Results; submitted Cards become visible; non-voters remain identifiable; Results are grouped or ordered by Vote count.
- Final estimate and live history: Moderator selects a Final Estimate from the active Deck only; the Moderator-only Estimated Stories list exists for the live Session.

Architecturally, these requirements point to a state-driven collaborative session model with explicit Round states, role-aware commands, and separate public versus private vote representations.

**Non-Functional Requirements:**
The NFRs emphasize low-friction access, near-real-time coherence, keyboard-accessible controls, responsive web support, hidden-vote privacy, and session-local persistence. These will drive decisions around session lifecycle, state transport, UI state management, accessibility patterns, and data retention boundaries.

**Scale & Complexity:**

- Primary domain: full-stack real-time web application
- Complexity level: medium
- Estimated architectural components: 7 conceptual components

The likely conceptual components are:

- Session creation and Room Code management
- Moderator experience
- Participant experience
- Story, Deck, and Round state model
- Vote submission and hidden-vote handling
- Result aggregation and Final Estimate capture
- Live Estimated Stories list

The feature surface is compact, but collaborative live state, privacy-before-reveal, and Moderator-only command enforcement make state modeling the central architectural concern.

### Technical Constraints & Dependencies

Known constraints from the planning documents:

- v1 has no user accounts or authentication.
- Room Code access is sufficient for v1.
- Session history is live-session-only and does not need to survive refresh, reconnect, or later reopening.
- No durable analytics, reporting, export, or velocity tracking is required.
- No Jira, GitHub, GitLab, or other backlog integrations are required.
- Only two fixed Decks are required: T-shirt and Fibonacci.
- Fibonacci Deck values are `1`, `2`, `3`, `5`, `8`, `13`, `21`, and `Coffee`.
- Final Estimate must be selected from the active Deck; custom final estimates are out of scope.
- Duplicate Display Names are allowed and disambiguated with numeric suffixes.
- Estimated Stories list is Moderator-only.
- Moderator voting is optional.
- Participants can change Votes before reveal.
- Votes cannot change after reveal unless the Moderator resets the Round.
- Story changes are blocked during an active Round until reset or end.

No external technical dependencies are mandated by the PRD. Technology choices remain open.

### Cross-Cutting Concerns Identified

- Real-time state synchronization across Moderator and Participant browsers
- Hidden-vote privacy before reveal
- Moderator-only command authorization without formal authentication
- Explicit Round state transitions to avoid invalid actions
- Input validation for Room Codes, Display Names, Story fields, Deck choices, Votes, and Final Estimates
- Duplicate Display Name disambiguation
- Ephemeral Session lifecycle and behavior on refresh/reconnect
- Responsive Card and Results UI for desktop and mobile browsers
- Keyboard accessibility and readable text labels
- Clear separation between Participant-visible state and Moderator-only state

## Starter Template Evaluation

### Primary Technology Domain

Full-stack real-time web application based on TypeScript, React, and Node.js.

The project needs a browser UI plus an authoritative live-session backend. The frontend can be a React single-page app. The backend needs to manage ephemeral Sessions, Room Codes, Participants, Round state, hidden Votes, Results, and Moderator-only commands.

### Starter Options Considered

**Option 1: Vite React TypeScript + custom Node/Socket.IO server**

This option uses the official Vite React TypeScript template as the frontend starter, then adds a small TypeScript Node server with Socket.IO for real-time session coordination.

Current source checks:

- Vite docs list `v8.0.16`, support the `react-ts` template, and document `npm create vite@latest`.
- Vite requires Node.js `20.19+` or `22.12+`.
- Socket.IO docs are on `4.x` and describe bidirectional event communication, WebSocket transport, fallback, reconnection, acknowledgements, and broadcasting.

Fit:

- Strong fit for hidden-vote state and Moderator command enforcement.
- Keeps v1 simple: no database, no authentication, no serverless state coordination.
- Lets the server hold live Session state in memory for the internal single-team MVP.
- Can later move to Redis or another shared-state or managed real-time service if scale or resilience needs increase.

Trade-off:

- The backend is not fully generated by the starter. We must add the server structure deliberately in the first implementation story.

**Option 2: Static frontend + serverless functions + managed realtime broker**

This option uses a static React frontend, serverless API endpoints, and a managed realtime broker for live messaging.

Fit:

- Serverless and operationally lightweight.
- Good fit for broadcast messaging.

Trade-off:

- Serverless Functions are not a natural place for authoritative live in-memory Session state.
- Would likely need an additional state store even though v1 does not require durable Session history.
- More moving parts than the MVP needs.

**Option 3: Next.js App Router TypeScript**

This option uses `create-next-app` with the current Next.js App Router defaults.

Current source checks:

- Next.js docs list latest version `16.2.2`.
- The default CLI setup includes TypeScript, Tailwind CSS, ESLint, App Router, Turbopack, and an import alias.

Fit:

- Strong full-stack React framework.
- Good if the app needed SSR, route-level server rendering, or a broader web platform foundation.

Trade-off:

- The MVP does not need SSR or React Server Components.
- Real-time Socket.IO still requires a long-running server or external service.
- Adds framework complexity that does not solve the core Planning Poker state problem.

### Selected Starter: Vite React TypeScript + custom Node/Socket.IO server

**Rationale for Selection:**

Use Vite React TypeScript as the frontend starter because it is current, lightweight, and directly aligned with the requested TypeScript + React preference. Add a custom TypeScript Node/Socket.IO backend because the main architectural concern is live room state, not page rendering.

The selected foundation favors explicit state modeling over framework ceremony. For v1, a single local Node app can host the React frontend and Socket.IO backend during development and local runtime validation. The architecture should run as one instance initially so in-memory Session state remains coherent. If future requirements add durable sessions, reconnect recovery, multiple teams, or horizontal scale, the backend can introduce Redis or another shared-state service without changing the frontend starter.

**Initialization Command:**

```bash
npm create vite@latest . -- --template react-ts
```

**Architectural Decisions Provided by Starter:**

**Language & Runtime:**

- TypeScript for frontend application code.
- React for UI components.
- Node.js runtime target should be aligned with current tool requirements, with local development on a supported Node version.

**Styling Solution:**

- The Vite React TypeScript starter does not impose a styling framework.
- Styling should be selected explicitly in implementation. For this internal tool, a simple CSS module or app-level CSS approach is sufficient unless a later UX decision requires Tailwind or a component library.

**Build Tooling:**

- Vite development server and build tooling for local implementation work.
- React TypeScript template.
- Production frontend output goes to `dist`.

**Testing Framework:**

- The starter does not include tests by default.
- Add Vitest for unit tests and state-machine tests.
- Add React Testing Library for component interaction tests.
- Add Playwright for end-to-end tests covering Moderator/Participant browser flows.

**Code Organization:**

- Keep generated frontend under the application root initially.
- Add a `server/` directory for the TypeScript Node/Socket.IO backend.
- Add shared TypeScript types under `src/shared` or `shared/` so client and server use the same Session, Round, Deck, Vote, and Result contracts.
- Keep the live session model isolated from transport handlers so it can be tested without WebSocket setup.

**Development Experience:**

- Vite provides fast local frontend development and straightforward build tooling for local implementation work.
- Socket.IO backend should run locally alongside Vite during development.
- Local development should run the frontend and server together with minimal setup.

**Note:** Project initialization using the Vite command should be the first implementation story. The same story should add the Node/Socket.IO server scaffold, shared types, and test setup.

Sources checked:

- https://vite.dev/guide/
- https://react.dev/learn/creating-a-react-app
- https://nextjs.org/docs/app/getting-started/installation
- https://socket.io/docs/v4/

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**

- Use an in-memory authoritative `SessionStore` for v1 live Sessions.
- Run the MVP as a single local Node instance while session state remains in memory.
- Use capability-token authorization instead of user accounts.
- Use Socket.IO as the authoritative session command and state-update API.
- Use React Router with server-snapshot-driven frontend state.
- Use Zod schemas for runtime command validation and shared contract enforcement.

**Important Decisions (Shape Architecture):**

- Keep the domain state transition layer independent of Socket.IO handlers.
- Keep client and server contracts in shared TypeScript modules.
- Store capability tokens in browser `sessionStorage`.
- Use CSS Modules and CSS custom properties for v1 styling.
- Use Vitest, React Testing Library, and Playwright for test coverage.

**Deferred Decisions (Post-MVP):**

- Redis-backed or database-backed Session state is deferred until durable history, reconnect recovery, or multi-instance scale is required.
- Managed real-time fan-out services are deferred until scale requires them.
- Authentication, SSO, and account management are deferred because the PRD explicitly excludes accounts in v1.
- Durable storage, analytics, export, and backlog integrations are deferred by MVP scope.
- Tailwind, a component library, or a formal design system are deferred unless UX work creates a concrete need.

### Data Architecture

**Decision:** Use an in-memory authoritative session store for MVP.

**Rationale:**
The PRD requires live-session-only state and explicitly does not require durable Session history, refresh recovery, analytics, or later reopening. A server-owned in-memory model is the smallest architecture that can enforce hidden Votes, Moderator-only commands, and Round state transitions consistently.

**Implementation Direction:**

- Store live Sessions in memory on the Node server, keyed by generated Room Code.
- Introduce a `SessionStore` abstraction immediately so future Redis or durable adapters can replace the in-memory implementation without rewriting domain commands.
- Keep session lifecycle ephemeral with inactivity cleanup.
- Model state transitions as pure domain functions: create Session, join, set Story, select Deck, start Round, submit Vote, reveal, reset, record Final Estimate, and advance Story.
- Use Zod 4 for runtime validation at command boundaries.
- Do not introduce database migrations in v1.
- Do not add persistent storage in v1.

**Version Notes:**

- Zod 4 is the current Zod version family in official docs.

**Affects:**

- Session creation and join
- Hidden voting
- Result reveal
- Final Estimate capture
- Runtime scale constraints

### Authentication & Security

**Decision:** Use capability-token authorization without user accounts.

**Rationale:**
The PRD excludes accounts and authentication in v1, but Moderator-only controls still need server-side enforcement. Capability tokens preserve low-friction Room Code access while preventing arbitrary clients from claiming Moderator authority.

**Implementation Direction:**

- No accounts, login, SSO, or durable user identity in v1.
- Room Code allows joining as a Participant only.
- Session creation returns a `moderatorToken`.
- Participant join returns a `participantToken`.
- Moderator-only commands must include a valid `moderatorToken`.
- Participant Vote updates must include that Participant's valid `participantToken`.
- Validate every command payload with Zod 4.
- Enforce authorization and Round state transitions on the server for every command.
- Use Helmet for Express security headers.
- Use restrictive CORS that supports local development without broad origins by default.
- Use basic rate limiting on create/join endpoints and Socket.IO command bursts.
- Do not log capability tokens or hidden Vote values before reveal.
- No data-at-rest encryption decision is required in v1 because there is no durable storage.

**Version Notes:**

- Helmet is the selected Express security-header middleware.
- `express-rate-limit` is acceptable for basic single-instance MVP rate limiting; external stores become necessary for accurate multi-instance rate limiting.

**Affects:**

- Moderator command enforcement
- Participant Vote ownership
- Hidden Vote privacy
- Logging
- Future authentication migration path

### API & Communication Patterns

**Decision:** Use a hybrid HTTP + Socket.IO API, with Socket.IO as the authoritative Session API.

**Rationale:**
The application is fundamentally a live collaborative room. Socket.IO fits room broadcasts, acknowledgements, reconnection behavior, and server-pushed snapshots. REST-only communication would push the app toward polling or duplicated real-time infrastructure.

**Implementation Direction:**

- Use Express 5.x for HTTP server concerns: static frontend serving, health endpoint, and minimal non-real-time endpoints.
- Use Socket.IO 4.x for all live Session behavior.
- Treat Socket.IO client events as commands, not direct mutations.
- Every command returns an acknowledgement result: `{ ok: true, data }` or `{ ok: false, error }`.
- Server emits sanitized `session:snapshot` events after accepted commands.
- Public snapshots never include hidden Vote values before reveal.
- Moderator snapshots may include Moderator-only data such as Estimated Stories and command availability.
- Use Room Code based Socket.IO rooms so updates broadcast only to users in that Session.
- Keep event contracts in shared TypeScript types and Zod schemas.
- Do not introduce GraphQL, tRPC, OpenAPI, or AsyncAPI in v1.

**Core Events:**

- Client to server: `session:create`, `session:join`, `story:update`, `deck:select`, `round:start`, `vote:submit`, `round:reveal`, `round:reset`, `estimate:record`, `story:advance`, `session:leave`
- Server to client: `session:snapshot`, `session:error`, `session:closed`

**Error Handling Standards:**

- Use stable machine-readable error codes such as `INVALID_ROOM_CODE`, `UNAUTHORIZED`, `ROUND_NOT_ACTIVE`, `VOTE_LOCKED`, and `STORY_LOCKED`.
- Socket handlers should stay thin: validate, authorize, call domain command, emit snapshot.
- The domain layer should return typed success or domain-error results.

**Version Notes:**

- Socket.IO 4.x is the selected real-time transport.
- Express 5.x is the selected HTTP framework.

**Affects:**

- Frontend socket hook
- Shared contracts
- Domain command testing
- Result visibility and hidden-vote safety

### Frontend Architecture

**Decision:** Use React Router with server-snapshot-driven local state.

**Rationale:**
The frontend needs enough route structure for create/join/session views, but the server remains authoritative. A heavy global client store would add complexity without improving correctness.

**Implementation Direction:**

- Use React Router in declarative SPA mode.
- Routes:
  - `/` for create/join entry
  - `/session/:roomCode/moderator` for Moderator view
  - `/session/:roomCode` for Participant join/session view
- Use Socket.IO as the source of truth.
- Render the latest server `session:snapshot`.
- Create a `useSessionSocket` hook to own connection lifecycle, command sending, acknowledgements, and snapshot updates.
- Use React Context plus `useReducer` only for client session UI state.
- Avoid Redux or Zustand in v1.
- Keep form state local unless it participates in the live Session.
- Store capability tokens in `sessionStorage`, not `localStorage`.
- Do not optimistically mutate authority-sensitive state; wait for server acknowledgement and snapshot.
- Use CSS Modules plus CSS custom properties for styling.

**Component Organization:**

- `src/app` for routes and app shell
- `src/features/session` for Moderator and Participant session views
- `src/features/cards` for Deck and Card controls
- `src/features/results` for reveal and grouped result display
- `src/shared` or `shared/` for shared types, schemas, UI primitives, and socket contracts

**Accessibility Standards:**

- Cards must be real buttons or radio-style controls with readable labels.
- Round controls must expose disabled states and status text.
- Result grouping must be readable without color alone.
- Keyboard navigation is a first-class requirement.

**Version Notes:**

- React Router docs list `8.0.0` as current and document installation into a Vite React app.

**Affects:**

- Route structure
- Token handling
- Component testing
- Accessibility acceptance criteria
- Client/server contract boundaries

### Runtime Assumptions

**Decision:** Run as one Node.js app locally for MVP development, single instance while session state remains in memory.

**Rationale:**
The selected architecture uses a long-running Node process that owns live in-memory Session state and Socket.IO connections. The runtime should stay simple and local-first while the team focuses on product behavior instead of deployment concerns.

**Implementation Direction:**

- Run one Node.js application locally.
- The Node server serves:
  - Express HTTP endpoints
  - Socket.IO real-time endpoint
  - The local React application runtime needed for development and verification
- Use a Node version compatible with current tool requirements.
- Use local runtime configuration that supports predictable development startup.
- Run one app instance for MVP.
- Use environment variables for local runtime configuration where helpful, without making deployment concerns part of current scope.
- Add Docker and Docker Compose as a supported wrapper around the same local runtime so the app can be started consistently across environments.
- Prefer a single compose app service for the standard startup path, with an optional development profile if a split client/server workflow becomes useful.
- Use a container healthcheck that targets the existing `/health` endpoint.
- Do not add Redis, managed real-time brokers, databases, deployment pipelines, or durable storage in MVP unless scope changes.

**Version Notes:**

**Affects:**

- Local startup scripts
- Runtime configuration
- Scaling boundary

### Decision Impact Analysis

**Implementation Sequence:**

1. Initialize the Vite React TypeScript app.
2. Add TypeScript Node/Express/Socket.IO server scaffold.
3. Add shared TypeScript contracts and Zod schemas.
4. Implement the pure domain model and in-memory `SessionStore`.
5. Implement capability-token authorization and command validation.
6. Implement Socket.IO command handlers and sanitized snapshots.
7. Implement React Router routes and `useSessionSocket`.
8. Build Moderator and Participant session views.
9. Add unit tests for domain state transitions and validation.
10. Add component and end-to-end tests for live Moderator/Participant flows.
11. Add local build and start scripts.
12. Add Docker and Docker Compose assets for the local runtime path.
13. Add the health endpoint and local runtime documentation.

**Cross-Component Dependencies:**

- In-memory state requires single-instance runtime behavior.
- Capability tokens require frontend sessionStorage handling and server-side command authorization.
- Hidden Vote privacy requires separate internal Session state and sanitized public snapshots.
- Socket.IO event contracts require shared TypeScript types and Zod schemas.
- React UI state must follow server snapshots to preserve server authority.
- The local runtime must allow the React client and Socket.IO backend to work together during implementation and validation.
- The containerized runtime must preserve the same single-instance authority model as the local Node process.
- Future multi-instance scaling requires a new `SessionStore` adapter and likely revised rate limiting.

**Sources Checked:**

- https://zod.dev/
- https://helmetjs.github.io/
- https://express-rate-limit.mintlify.app/overview
- https://socket.io/docs/v4/
- https://expressjs.com/
- https://reactrouter.com/start/declarative/installation

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Critical Conflict Points Identified:** 9 areas where AI agents could make different choices: event names, payload shapes, snapshot visibility, token storage, error formats, file locations, component naming, test placement, and loading/error UI behavior.

### Naming Patterns

**Database Naming Conventions:**
No database exists in v1. Agents MUST NOT add database tables, migrations, repositories, or ORM configuration unless a later architecture update explicitly introduces persistence.

**API Naming Conventions:**

- Socket.IO event names use lowercase namespace plus action: `session:create`, `round:start`, `vote:submit`.
- Error codes use uppercase snake case: `INVALID_ROOM_CODE`, `UNAUTHORIZED`, `VOTE_LOCKED`.
- HTTP endpoints are minimal and kebab-case if needed: `/health`, `/api/version`.
- JSON fields use camelCase everywhere.

**Code Naming Conventions:**

- React components use PascalCase: `ModeratorSessionView`.
- Hooks use camelCase with `use` prefix: `useSessionSocket`.
- Files for components use PascalCase: `CardGrid.tsx`.
- Non-component modules use kebab-case or domain nouns consistently: `session-store.ts`, `socket-contracts.ts`.
- Types use PascalCase: `SessionSnapshot`, `RoundState`, `VoteCommand`.

### Structure Patterns

**Project Organization:**

- `src/app` contains routing and app shell.
- `src/features/session` contains Moderator and Participant session screens.
- `src/features/cards` contains Deck and Card UI.
- `src/features/results` contains reveal and grouped result UI.
- `src/shared` or `shared/` contains contracts reused by client and server.
- `server/domain` contains pure Session state transitions.
- `server/socket` contains Socket.IO handlers only.
- `server/security` contains token, CORS, Helmet, and rate-limit setup.

**File Structure Patterns:**

- Tests are co-located for unit/component tests: `*.test.ts` and `*.test.tsx`.
- Playwright tests live under `tests/e2e`.
- Environment examples live in `.env.example`; real `.env` files are not committed.
- Static assets live under `public` unless imported directly by React components.

### Format Patterns

**API Response Formats:**
All command acknowledgements use:

```ts
type Ack<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: ErrorCode; message: string; details?: unknown } };
```

**Data Exchange Formats:**

- All payloads and snapshots use camelCase.
- Dates, if introduced, use ISO 8601 strings.
- Missing optional values use `undefined` internally and omitted JSON fields externally.
- Hidden Votes are never included in public snapshots before reveal.
- Moderator-only fields are only present in Moderator snapshots.

### Communication Patterns

**Event System Patterns:**

- Client commands are named by domain action: `story:update`, `estimate:record`.
- Server broadcasts use noun result names: `session:snapshot`, `session:error`, `session:closed`.
- Socket handlers MUST validate with Zod, authorize, call domain logic, then emit snapshots.
- Socket handlers MUST NOT mutate Session state directly.

**State Management Patterns:**

- Server state is authoritative.
- Frontend state is derived from the latest `session:snapshot`.
- No optimistic updates for Moderator commands, Vote submission, reveal, reset, or Final Estimate recording.
- Domain state transitions use immutable return values or controlled mutation inside `server/domain`; the pattern must be consistent within that module.

### Process Patterns

**Error Handling Patterns:**

- Domain functions return typed success/error results instead of throwing for expected business failures.
- Socket handlers convert domain errors to `Ack` errors.
- User-facing messages are derived from error codes, not raw exceptions.
- Logs must not include tokens or hidden Vote values before reveal.

**Loading State Patterns:**

- Command buttons show pending state while awaiting acknowledgement.
- Disable controls that are invalid for the current Round state.
- Connection states use consistent labels: `connecting`, `connected`, `reconnecting`, `disconnected`.
- Participant and Moderator views must render a clear waiting state when no active Round exists.

### Enforcement Guidelines

**All AI Agents MUST:**

- Use shared TypeScript contracts and Zod schemas for socket payloads.
- Keep Socket.IO handlers thin and domain logic in `server/domain`.
- Preserve hidden-vote privacy in every snapshot and log.
- Keep Moderator-only data out of Participant snapshots.
- Follow the accepted folder structure and naming rules.

**Pattern Enforcement:**

- Unit tests verify domain state transitions.
- Contract tests verify Zod schemas for every socket command.
- E2E tests verify Moderator/Participant flows across two browser contexts.
- Pattern changes require updating this architecture document before implementation.

### Pattern Examples

**Good Examples:**

- `vote:submit` with `{ roomCode, participantToken, cardValue }`
- `session:snapshot` with `participants: [{ displayName, hasVoted }]` before reveal
- `server/domain/session-state.test.ts`
- `src/features/cards/CardGrid.tsx`

**Anti-Patterns:**

- Adding REST endpoints for live voting commands.
- Emitting hidden Vote values before reveal.
- Storing `moderatorToken` in `localStorage`.
- Mutating Session state inside React components.
- Creating database migrations during v1 implementation.
- Returning inconsistent errors such as `{ message }` in one handler and `{ errorCode }` in another.

## Project Structure & Boundaries

### Complete Project Directory Structure

```text
poker-planning-bmad/
|-- README.md
|-- package.json
|-- package-lock.json
|-- tsconfig.json
|-- tsconfig.node.json
|-- vite.config.ts
|-- vitest.config.ts
|-- eslint.config.js
|-- playwright.config.ts
|-- index.html
|-- .env.example
|-- .gitignore
|-- public/
|   `-- favicon.svg
|-- src/
|   |-- main.tsx
|   |-- app/
|   |   |-- App.tsx
|   |   |-- routes.tsx
|   |   `-- styles.css
|   |-- features/
|   |   |-- session/
|   |   |   |-- CreateSessionView.tsx
|   |   |   |-- JoinSessionView.tsx
|   |   |   |-- ModeratorSessionView.tsx
|   |   |   |-- ParticipantSessionView.tsx
|   |   |   |-- useSessionSocket.ts
|   |   |   `-- session-ui-state.ts
|   |   |-- cards/
|   |   |   |-- CardGrid.tsx
|   |   |   |-- DeckSelector.tsx
|   |   |   `-- card-labels.ts
|   |   `-- results/
|   |       |-- ResultsSummary.tsx
|   |       |-- VoteGroupList.tsx
|   |       `-- EstimatedStoriesList.tsx
|   |-- shared/
|   |   |-- contracts/
|   |   |   |-- ack.ts
|   |   |   |-- errors.ts
|   |   |   |-- socket-events.ts
|   |   |   `-- snapshots.ts
|   |   |-- domain/
|   |   |   |-- decks.ts
|   |   |   `-- session-types.ts
|   |   `-- schemas/
|   |       |-- command-schemas.ts
|   |       `-- session-schemas.ts
|   `-- test/
|       `-- render.tsx
|-- server/
|   |-- index.ts
|   |-- app.ts
|   |-- config/
|   |   `-- env.ts
|   |-- domain/
|   |   |-- session-state.ts
|   |   |-- session-store.ts
|   |   |-- session-commands.ts
|   |   |-- result-aggregation.ts
|   |   `-- room-code.ts
|   |-- security/
|   |   |-- capability-tokens.ts
|   |   |-- cors.ts
|   |   |-- rate-limit.ts
|   |   `-- security-middleware.ts
|   |-- socket/
|   |   |-- register-session-handlers.ts
|   |   |-- snapshot-mapper.ts
|   |   `-- socket-auth.ts
|   `-- http/
|       |-- health.ts
|       `-- static-client.ts
|-- tests/
|   `-- e2e/
|       |-- moderator-participant-flow.spec.ts
|       |-- hidden-vote-privacy.spec.ts
|       `-- fixtures.ts
`-- docs/
    |-- architecture-notes.md
    `-- runtime.md
```

### Architectural Boundaries

**API Boundaries:**
HTTP is limited to health, static client serving, and minimal metadata. Live session behavior is exposed through Socket.IO commands only.

**Component Boundaries:**
React components render snapshots and send commands through `useSessionSocket`. Components do not mutate authoritative Session state.

**Service Boundaries:**
`server/socket` validates, authorizes, and delegates. `server/domain` owns all Session state transitions. `server/security` owns tokens, CORS, Helmet, and rate limiting.

**Data Boundaries:**
No database exists in v1. `server/domain/session-store.ts` is the only in-memory Session storage boundary.

### Requirements to Structure Mapping

- FR-1 to FR-3 Session creation/join/presence -> `src/features/session`, `server/domain/session-commands.ts`, `server/socket/register-session-handlers.ts`
- FR-4 to FR-5 Story and Deck setup -> `src/features/cards`, `src/shared/domain/decks.ts`, `server/domain/session-state.ts`
- FR-6 to FR-8 Round control -> `server/domain/session-commands.ts`, `server/security/capability-tokens.ts`
- FR-9 to FR-11 Hidden voting -> `server/domain/session-state.ts`, `server/socket/snapshot-mapper.ts`, `tests/e2e/hidden-vote-privacy.spec.ts`
- FR-12 to FR-13 Reveal and grouped results -> `src/features/results`, `server/domain/result-aggregation.ts`
- FR-14 to FR-15 Final Estimate and live history -> `src/features/results/EstimatedStoriesList.tsx`, `server/domain/session-commands.ts`

### Integration Points

**Internal Communication:**
React sends typed Socket.IO commands. Socket handlers return typed acknowledgements and emit sanitized `session:snapshot` events.

**External Integrations:**
No external product integrations exist in v1.

**Data Flow:**
UI command -> Zod validation -> token authorization -> domain command -> in-memory SessionStore -> sanitized snapshot -> Socket.IO room broadcast -> React render.

### File Organization Patterns

**Configuration Files:**
Root config files own build, test, lint, Vite, Vitest, Playwright, and TypeScript settings. Runtime configuration is read through `server/config/env.ts`.

**Source Organization:**
Client code lives under `src`. Server code lives under `server`. Shared contracts live under `src/shared` and must not import React or server-only modules.

**Test Organization:**
Unit and component tests are co-located as `*.test.ts` or `*.test.tsx`. Browser flow tests live in `tests/e2e`.

**Asset Organization:**
Static public assets live in `public`. Feature-specific imported assets live beside the feature that owns them.

### Development Workflow Integration

**Development Server Structure:**
Vite serves the React client in development. The Node/Socket.IO server runs separately and allows configured localhost origins.

**Build Process Structure:**
The local build process should compile the React app and the server code in a way that supports implementation validation without introducing CI/CD requirements into the current scope.

**Runtime Structure:**
The local Node server exposes `/health`, hosts Socket.IO, and supports the React client runtime needed for implementation and local verification.

## Architecture Validation Results

### Coherence Validation

**Decision Compatibility:**
All major choices work together: Vite React TypeScript provides the SPA, Express serves HTTP/static assets, Socket.IO handles live Session commands, and Zod validates contracts while a single local Node process owns in-memory room state.

**Pattern Consistency:**
The naming, event, acknowledgement, error, snapshot, token, and folder rules support the selected architecture. The patterns directly protect the main risk areas: hidden Vote privacy, Moderator-only commands, and agent implementation consistency.

**Structure Alignment:**
The project structure supports the architecture boundaries: `server/domain` owns state transitions, `server/socket` owns transport handlers, `server/security` owns authorization/security setup, `src/features` owns UI, and `src/shared` owns contracts.

### Requirements Coverage Validation

**Feature Coverage:**
All six PRD feature areas are mapped to concrete components and server modules.

**Functional Requirements Coverage:**
FR-1 through FR-15 are architecturally supported by the SessionStore, command model, capability tokens, Socket.IO snapshots, Moderator/Participant views, result aggregation, and Estimated Stories list.

**Non-Functional Requirements Coverage:**
Low friction is supported by Room Code plus Display Name. Near-real-time coherence is supported by Socket.IO. Accessibility and responsive web are assigned to frontend component patterns. Hidden-vote privacy is enforced through sanitized snapshots. Session-local persistence is handled through in-memory state.

### Implementation Readiness Validation

**Decision Completeness:**
All critical decisions are documented with current version families or current-version source checks where relevant.

**Structure Completeness:**
The directory tree is specific enough for implementation agents to place client, server, shared, test, and documentation files consistently.

**Pattern Completeness:**
The architecture defines naming, structure, format, communication, state, error, loading, and enforcement patterns with examples and anti-patterns.

### Gap Analysis Results

**Critical Gaps:**
None.

**Important Gaps:**
None blocking implementation.

**Minor Gaps:**
The initial scaffold story must configure TypeScript path aliases or package/build settings so shared contracts can be imported safely by both client and server code.

### Validation Issues Addressed

No architecture changes were required during validation. The minor shared-import build concern is captured as an implementation handoff note.

### Architecture Completeness Checklist

**Requirements Analysis**

- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed
- [x] Technical constraints identified
- [x] Cross-cutting concerns mapped

**Architectural Decisions**

- [x] Critical decisions documented with versions
- [x] Technology stack fully specified
- [x] Integration patterns defined
- [x] Performance considerations addressed

**Implementation Patterns**

- [x] Naming conventions established
- [x] Structure patterns defined
- [x] Communication patterns specified
- [x] Process patterns documented

**Project Structure**

- [x] Complete directory structure defined
- [x] Component boundaries established
- [x] Integration points mapped
- [x] Requirements to structure mapping complete

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION

**Confidence Level:** high

**Key Strengths:**

- Architecture is narrowly aligned to the PRD and avoids out-of-scope persistence, auth, analytics, and integrations.
- The server-authoritative model directly protects hidden Votes and Moderator-only actions.
- Implementation patterns are specific enough to keep multiple AI agents consistent.
- Project structure maps every FR category to concrete files and directories.

**Areas for Future Enhancement:**

- Redis or another shared-state service for multi-instance scale.
- Durable storage if reusable Sessions or history become required.
- Authentication or SSO if the tool expands beyond the initial internal team.
- A formal design system if UX scope grows.

### Implementation Handoff

**AI Agent Guidelines:**

- Follow all architectural decisions exactly as documented.
- Use implementation patterns consistently across all components.
- Respect project structure and boundaries.
- Refer to this document for all architectural questions.
- Do not introduce persistence, authentication, external integrations, or multi-instance infrastructure unless the architecture is updated first.

**First Implementation Priority:**
Initialize the Vite React TypeScript app, then add the Node/Express/Socket.IO server scaffold, shared contracts, Zod schemas, and test setup.

```bash
npm create vite@latest . -- --template react-ts
```
