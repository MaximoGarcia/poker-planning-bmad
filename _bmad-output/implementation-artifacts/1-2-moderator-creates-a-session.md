---
baseline_commit: 4eea0eaac156f50ea45042df3fbc80c931cc0197
---

# Story 1.2: Moderator Creates A Session

Status: ready-for-dev

Completion Note: Ultimate context engine analysis completed - comprehensive developer guide created.

## Story

As a Moderator,
I want to create a new Planning Poker Session and receive a Room Code,
so that I can invite the team into a shared estimation room quickly.

## Acceptance Criteria

1. Given the Moderator is on the entry view, when they choose to create a Session, then the server creates a new live Session with a generated Room Code, and the creator is treated as the Moderator for that Session.
2. Given a Session is created successfully, when the server returns the creation result, then the response includes the Room Code and a Moderator capability token, and the Moderator token is stored in browser `sessionStorage`, not `localStorage`.
3. Given a newly created Session exists, when the Moderator lands in the Moderator session view, then no active Story is shown until the Moderator adds one, and the Room Code is visible so it can be shared with Participants.
4. Given Session creation fails validation or rate limiting, when the Moderator attempts to create a Session, then the UI shows a readable error derived from a stable error code, and no invalid local Session state is created.
5. Given the Session creation command is handled by the server, when the command is accepted, then the server emits a sanitized Moderator snapshot, and hidden Vote data is not present in the snapshot structure.

## Tasks / Subtasks

- [ ] Add real session creation domain logic behind the existing scaffold. (AC: 1, 2, 3, 5)
  - [ ] Create `server/domain/session-store.ts` with an in-memory `SessionStore` abstraction keyed by Room Code.
  - [ ] Create `server/domain/room-code.ts` to generate unique Room Codes that satisfy `RoomCodeSchema` (`^[A-Z0-9]{4,12}$`).
  - [ ] Create `server/domain/session-commands.ts` or equivalent pure command module for `createSession`.
  - [ ] Model a new Session with default deck, `story: null`, inactive/unrevealed Round state, one Moderator participant, no Votes, no Estimated Stories, and an ISO `updatedAt`.
  - [ ] Ensure token values are internal to server state or returned only in the create acknowledgement; they must not appear in `SessionSnapshot`.
- [ ] Add capability-token and rate-limit support for create Session. (AC: 2, 4, 5)
  - [ ] Create `server/security/capability-tokens.ts` using Node crypto APIs for unguessable Moderator tokens.
  - [ ] Create `server/security/rate-limit.ts` or equivalent lightweight per-socket limiter for `session:create` bursts.
  - [ ] Add stable error codes such as `VALIDATION_FAILED` and `RATE_LIMITED` to `src/shared/contracts/errors.ts`.
  - [ ] Do not log capability tokens, command payloads containing tokens, or future hidden Vote values.
- [ ] Update shared contracts and schemas for event-specific acknowledgements. (AC: 1, 2, 4, 5)
  - [ ] Update `src/shared/contracts/socket-events.ts` so `session:create` acknowledges a create result, not only a `SessionSnapshot`.
  - [ ] Define a shared `CreateSessionResult` contract containing at least `roomCode`, `moderatorToken`, and `snapshot`.
  - [ ] Keep `session:snapshot` payloads token-free and usable by the Moderator view.
  - [ ] Keep Zod validation in `src/shared/schemas/command-schemas.ts`; reconcile the existing `moderatorName` field with low-friction create flow by either providing a clear required field or a deliberate default.
- [ ] Implement the Socket.IO `session:create` command handler. (AC: 1, 2, 4, 5)
  - [ ] Update `server/socket/register-session-handlers.ts` to validate with `CreateSessionCommandSchema.safeParse`.
  - [ ] On validation or rate-limit failure, call the acknowledgement callback with `{ ok: false, error }` and do not create local client Session state.
  - [ ] On success, call the domain command, `socket.join(roomCode)`, attach non-sensitive identity metadata to `socket.data`, acknowledge with the Room Code, Moderator token, and snapshot, then emit `session:snapshot` to the Moderator socket.
  - [ ] Keep the handler thin: validation, rate limit, domain call, room join, acknowledgement, snapshot emission.
- [ ] Replace the scaffold entry route with a usable create-session workflow. (AC: 1, 2, 3, 4)
  - [ ] Add `socket.io-client` as a dependency and use the existing shared event types; do not add `@types/socket.io-client`.
  - [ ] Create `src/features/session/CreateSessionView.tsx` and replace the sample route links on `/`.
  - [ ] Create a small `useSessionSocket` hook or session client module that owns connection state, emits `session:create`, handles acknowledgement results, and receives `session:snapshot`.
  - [ ] Store the returned Moderator token with `sessionStorage` using a scoped key such as `adr-buddy:moderator-token:<roomCode>`.
  - [ ] Never write the Moderator token to `localStorage`, route params, query strings, visible text, logs, or snapshots.
  - [ ] Navigate to `/session/:roomCode/moderator` only after a successful acknowledgement.
- [ ] Build the Moderator session landing state. (AC: 2, 3, 5)
  - [ ] Add `src/features/session/ModeratorSessionView.tsx` and route `/session/:roomCode/moderator` to it.
  - [ ] Show the Room Code in readable text with a copy-friendly affordance if practical.
  - [ ] Show an empty state that no active Story exists yet; do not add Story editing, Deck selection, voting, reveal, results, or join behavior in this story.
  - [ ] Render from the returned or latest server snapshot where available; do not invent durable refresh/reconnect recovery.
  - [ ] If a Moderator route is opened without a stored token or snapshot, show a clear waiting/missing-session state instead of fabricating a Session.
- [ ] Add focused automated coverage. (AC: 1-5)
  - [ ] Add unit tests for Room Code format/uniqueness behavior, token generation shape, and the `createSession` domain command.
  - [ ] Add contract/schema tests proving create acknowledgement includes the token while snapshots do not.
  - [ ] Add socket integration coverage for `session:create` success, validation failure, rate-limit failure if deterministic, acknowledgement shape, and `session:snapshot` emission.
  - [ ] Add React Testing Library tests for create-session success, error display, sessionStorage token write, and no `localStorage` write.
  - [ ] Add or update Playwright smoke/e2e coverage for the single-browser Moderator create flow if the existing dev-server setup can support it cleanly.
- [ ] Verify the story end to end. (AC: 1-5)
  - [ ] Run `npm install` after adding `socket.io-client`.
  - [ ] Run `npm run typecheck`.
  - [ ] Run `npm run test`.
  - [ ] Run `npm run build`.
  - [ ] If Playwright coverage is added, run the relevant Playwright command and document it in the Dev Agent Record.

## Dev Notes

### Current Repository State

- Story 1.1 has created the Vite/React/TypeScript client, Express 5 server, Socket.IO 4 server, shared contract folders, Zod schemas, Vitest, React Testing Library, and Playwright scaffold.
- `package.json` currently has `socket.io` but not `socket.io-client`; the frontend cannot emit typed browser socket commands until the client package is added.
- `server/socket/register-session-handlers.ts` only records `socket.data.connectedAt`; Story 1.2 is the first real Socket.IO command implementation.
- `server/domain/index.ts` and `server/security/index.ts` are placeholders. Add concrete domain/security modules instead of growing these placeholder exports into mixed-purpose files.
- `src/app/routes.tsx` is still a route shell with sample links. Replace the sample `/session/ABC123` links with the actual create-session entry workflow.
- `src/features/session/index.ts` is a placeholder export. This story should introduce real feature files under `src/features/session`.

### Story Scope Boundaries

- In scope: create a live in-memory Session, generate a Room Code, create a Moderator participant, return a Moderator capability token, store that token in `sessionStorage`, navigate to the Moderator route, and show Room Code plus no-active-Story state.
- Out of scope: Participant join, duplicate Display Name handling, participant presence updates beyond the Moderator seed participant, Story editing, Deck selection UI, starting Rounds, voting, reveal, result grouping, final estimates, durable refresh recovery, Redis, databases, accounts, SSO, analytics, exports, and backlog integrations.
- Do not add REST endpoints for live Session creation. Architecture says live Session behavior belongs to Socket.IO commands.

### Architecture Compliance

- Keep Socket.IO as the authoritative Session API. Client commands are validated commands, not direct mutations. [Source: `_bmad-output/planning-artifacts/architecture.md#api-communication-patterns`]
- Keep Socket handlers thin: validate payloads, authorize/rate-limit, call domain logic, and emit snapshots. [Source: `_bmad-output/planning-artifacts/architecture.md#communication-patterns`]
- Keep authoritative Session state in `server/domain` and storage behind an in-memory `SessionStore` abstraction. [Source: `_bmad-output/planning-artifacts/architecture.md#data-architecture`]
- Use capability-token authorization without accounts. Session creation returns `moderatorToken`; later Moderator-only commands must require it. [Source: `_bmad-output/planning-artifacts/architecture.md#authentication-security`]
- Store capability tokens in browser `sessionStorage`, not `localStorage`. [Source: `_bmad-output/planning-artifacts/architecture.md#frontend-architecture`]
- Use shared TypeScript contracts and Zod 4 schemas for command payloads, acknowledgements, errors, snapshots, Decks, Session types, and validation. [Source: `_bmad-output/planning-artifacts/architecture.md#api-communication-patterns`]
- Do not introduce persistence. v1 Session lifecycle is live and ephemeral. [Source: `_bmad-output/planning-artifacts/prds/prd-adr-buddy-2026-06-16/prd.md#cross-cutting-non-functional-requirements`]

### Existing Files To Update Carefully

- `src/shared/contracts/socket-events.ts`
  - Current state: all client events share `AckCallback<SessionSnapshot>`, which cannot represent `session:create` returning a Moderator token.
  - Change needed: introduce event-specific acknowledgement result types so `session:create` can return token-bearing data while snapshots stay sanitized.
  - Preserve: stable event names from `CLIENT_EVENTS` and `SERVER_EVENTS`.
- `src/shared/contracts/snapshots.ts`
  - Current state: `SessionSnapshot` has `roomCode`, `deck`, nullable `story`, participants, round, and `updatedAt`; it has no token fields.
  - Change needed: likely enough for Story 1.2 with `story: null`; add fields only if needed for Moderator empty state.
  - Preserve: no capability token or hidden Vote values in the snapshot structure.
- `src/shared/schemas/command-schemas.ts`
  - Current state: `CreateSessionCommandSchema` requires `moderatorName` and defaults `deckId`.
  - Change needed: align UI and domain command with this schema or deliberately change the schema with tests. Keep create low-friction.
  - Preserve: `RoomCodeSchema` format and strict Zod object validation.
- `server/socket/register-session-handlers.ts`
  - Current state: only attaches `connectedAt`.
  - Change needed: register `CLIENT_EVENTS.sessionCreate` with validation, rate limiting, domain call, room join, acknowledgement, and snapshot emission.
  - Preserve: typed `SessionSocket` / `SessionServer` pattern.
- `server/domain/index.ts`
  - Current state: placeholder constant only.
  - Change needed: export real domain modules from here if useful, but keep logic in dedicated files.
- `server/security/index.ts`
  - Current state: placeholder constant only.
  - Change needed: export token and rate-limit helpers from dedicated files.
- `src/app/routes.tsx`
  - Current state: home route is a scaffold with sample links; session route is a placeholder.
  - Change needed: route to `CreateSessionView` and `ModeratorSessionView`.
  - Preserve: React Router declarative route structure and `/session/:roomCode/moderator` path.
- `src/app/styles.css`
  - Current state: global app styling for route shell and deck summaries.
  - Change needed: add form, error, connection, and Moderator empty-state styling with responsive behavior.
  - Preserve: accessible contrast, keyboard focus visibility, no text overlap, and card radius no more than 8px.

### Contract And Data Shape Guidance

Use one token-bearing create result and one token-free snapshot. A precise shape is preferred over ad hoc objects:

```ts
export interface CreateSessionResult {
  roomCode: string
  moderatorToken: string
  snapshot: SessionSnapshot
}
```

The initial snapshot should be valid for the Moderator view:

```ts
{
  roomCode,
  deck: PLANNING_DECKS[deckId],
  story: null,
  participants: [
    {
      id: moderatorParticipantId,
      displayName: moderatorDisplayName,
      role: 'moderator',
      connected: true,
      hasVoted: false,
    },
  ],
  round: {
    active: false,
    revealed: false,
    voteCount: 0,
  },
  updatedAt: new Date().toISOString(),
}
```

The internal server state may include `moderatorToken`, but `SessionSnapshot`, logs, UI text, and browser route state must not.

### UI And UX Requirements

- The first screen must be the usable create-session experience, not a landing page or sample route menu.
- Use a real `<button>` for creating the Session and real form controls for any Moderator display-name input.
- Create pending state must disable duplicate submissions and should show clear status text.
- Error text must be readable and derived from stable error codes; do not display raw exceptions.
- The Moderator room must make the Room Code easy to read and share, and must clearly say no active Story exists yet.
- Keep the UI responsive for mobile and desktop widths and preserve keyboard navigation/focus states.
- Do not add visible instructional text about keyboard shortcuts or implementation details.

### Previous Story Intelligence

- Story 1.1 completed the scaffold with `npm run typecheck`, `npm run test`, `npm run build`, `npm run lint`, `/health`, and deep-route SPA fallback passing.
- Story 1.1 pinned current package reality: `react-router-dom@7.18.0` is installed even though earlier planning notes mentioned React Router 8 docs. Build on the installed declarative `BrowserRouter` setup unless a deliberate dependency change is made.
- Server compilation uses NodeNext ESM into `server-dist`, and server files import shared contracts with relative `.js` imports. Preserve import style so `npm run build:server` remains green.
- Shared contracts live under `src/shared`; do not duplicate server-only copies of acknowledgement, error, event, deck, or snapshot contracts.
- The current Playwright folder is ready but contains only `.gitkeep`; add focused e2e coverage only if it is stable and cheap.

### Git Intelligence

- Recent commits are scaffold/planning work: asset addition, initial story documentation, sprint status, readiness refinements, and architecture documents.
- HEAD at story creation is `4eea0eaac156f50ea45042df3fbc80c931cc0197`.
- Working tree was clean when this story was created.

### Latest Technical Notes Checked On 2026-06-19

- Socket.IO v4 supports acknowledgement callbacks as the last argument to `emit`, which fits the required `{ ok, data | error }` command response. Source: https://socket.io/docs/v4/emitting-events/
- Socket.IO rooms are server-only channels; use `socket.join(roomCode)` and `io.to(roomCode).emit(...)` or direct `socket.emit(...)` as appropriate, and do not expose room membership lists to clients. Source: https://socket.io/docs/v4/rooms/
- Socket.IO client latest 4.x release is `4.8.3` and the v4 JS client is compatible with a v4 server. Install `socket.io-client`; its types are included, so `@types/socket.io-client` is not needed. Source: https://socket.io/docs/v4/client-installation/
- Socket.IO TypeScript event types improve IDE/type safety but do not replace runtime validation; keep Zod validation at command boundaries. Source: https://socket.io/docs/v4/typescript/
- MDN documents `sessionStorage` as origin and tab scoped, lasting for the page session and cleared when the tab/window closes. This matches the architecture's token-storage requirement better than `localStorage`. Source: https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage
- Zod 4 is stable and TypeScript-first; it requires TypeScript strict mode, which the current tsconfigs already enable. Source: https://zod.dev/
- React Router declarative routing supports dynamic route segments like `/session/:roomCode`, with params read through `useParams`; preserve the existing route shape. Source: https://reactrouter.com/start/declarative/routing

## Project Structure Notes

- Add new files under the architecture's established folders:

```text
server/domain/
  room-code.ts
  session-commands.ts
  session-store.ts
server/security/
  capability-tokens.ts
  rate-limit.ts
src/features/session/
  CreateSessionView.tsx
  ModeratorSessionView.tsx
  useSessionSocket.ts
  session-storage.ts
```

- Tests should stay co-located for unit/component tests and under `tests/e2e` for Playwright.
- Do not create new top-level app folders or introduce a second shared contract location.

## References

- `_bmad-output/planning-artifacts/epics.md#story-12-moderator-creates-a-session`
- `_bmad-output/planning-artifacts/prds/prd-adr-buddy-2026-06-16/prd.md#fr-1-create-session`
- `_bmad-output/planning-artifacts/prds/prd-adr-buddy-2026-06-16/prd.md#cross-cutting-non-functional-requirements`
- `_bmad-output/planning-artifacts/architecture.md#data-architecture`
- `_bmad-output/planning-artifacts/architecture.md#authentication-security`
- `_bmad-output/planning-artifacts/architecture.md#api-communication-patterns`
- `_bmad-output/planning-artifacts/architecture.md#frontend-architecture`
- `_bmad-output/implementation-artifacts/1-1-set-up-initial-project-from-starter-template.md#completion-notes-list`

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Implementation Plan

### Completion Notes List

### File List

## Change Log

- 2026-06-19: Created Story 1.2 developer context for Moderator Session creation.
