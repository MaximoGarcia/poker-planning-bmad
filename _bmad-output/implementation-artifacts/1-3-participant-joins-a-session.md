---
baseline_commit: 500c4a87cc31eec48f7a0407b1de9a256e6bb786
---

# Story 1.3: Participant Joins A Session

Status: ready-for-dev

Completion Note: Ultimate context engine analysis completed - comprehensive developer guide created.

## Story

As a Participant,
I want to join an existing Session with a Room Code and Display Name,
so that I can enter the team's estimation room without account setup.

## Acceptance Criteria

1. Given a Participant is on the entry or join view, when they enter a valid Room Code and a non-empty Display Name, then the server joins them to the matching active Session, and the response includes a Participant capability token.
2. Given a Participant joins successfully, when the client stores join state, then the Participant token is stored in browser `sessionStorage`, not `localStorage`, and the Participant lands in the Participant session view for that Room Code.
3. Given a Display Name already exists in the Session, when another Participant joins with the same Display Name, then the system allows the join, and the duplicate name is disambiguated for display with a numeric suffix such as `Maxi (2)`.
4. Given the Participant submits a missing Display Name, invalid Room Code, or inactive Room Code, when the join command is processed, then the server rejects the request with a stable error code such as `INVALID_ROOM_CODE`, and the UI shows a readable message without entering the Session.
5. Given a Participant has joined the Session, when the Participant session view renders, then it shows the current Story, Deck, Round state, and the Participant's own Vote state when those values exist, and it does not show Moderator-only controls or Moderator-only data.

## Tasks / Subtasks

- [ ] Reconcile Story 1.2 dependency before implementation. (AC: 1-5)
  - [ ] Check `_bmad-output/implementation-artifacts/1-2-moderator-creates-a-session.md` Review Findings before coding.
  - [ ] If Story 1.2 findings are still unresolved, either resolve the shared socket/storage/rate-limit findings first or keep the join implementation compatible with the current known limitations.
  - [ ] Do not duplicate fixes in a second style; extend the existing `useSessionSocket`, storage helper, socket handler, rate limiter, and `SessionStore` patterns.
- [ ] Extend shared contracts and schemas for Participant join acknowledgements. (AC: 1, 2, 4, 5)
  - [ ] Add a token-bearing `JoinSessionResult` contract with `roomCode`, `participantToken`, `participantId`, `displayName`, and `snapshot`.
  - [ ] Update `ClientToServerEventAcknowledgements['session:join']` to use `JoinSessionResult`, not bare `SessionSnapshot`.
  - [ ] Add `JoinSessionResultSchema` beside `CreateSessionResultSchema`; validate token format and keep snapshots strict and token-free.
  - [ ] Keep `JoinSessionCommandSchema` strict with trimmed `roomCode` and `displayName`; preserve `RoomCodeSchema` format `^[A-Z0-9]{4,12}$`.
  - [ ] Ensure stable error codes cover validation and inactive/unknown Room Code paths; prefer existing `VALIDATION_FAILED`, `INVALID_ROOM_CODE`, and `RATE_LIMITED`.
- [ ] Add domain join-session behavior behind the existing `SessionStore`. (AC: 1, 3, 4, 5)
  - [ ] Add `joinSession` to `server/domain/session-commands.ts` or a focused companion module, keeping transport-free domain logic in `server/domain`.
  - [ ] Extend `SessionState` to store Participant capability tokens and Participant identity without exposing those tokens in `SessionSnapshot`.
  - [ ] Reject missing/inactive Sessions by Room Code using a typed domain result or stable error, not a thrown expected-business exception.
  - [ ] Generate an unguessable Participant token using the same Node crypto capability-token approach as Moderator tokens.
  - [ ] Add the Participant to `snapshot.participants` with role `participant`, connected `true`, hasVoted `false`, and an ISO `updatedAt`.
  - [ ] Allow duplicate Display Names and disambiguate only the display label, for example first `Maxi`, second `Maxi (2)`, third `Maxi (3)`.
  - [ ] Preserve current `story`, `deck`, and `round` values from the existing Session snapshot; do not invent Story editing, Round start, voting, reveal, results, or reconnect recovery here.
- [ ] Implement the Socket.IO `session:join` command handler. (AC: 1, 3, 4, 5)
  - [ ] Update `server/socket/register-session-handlers.ts` to handle `CLIENT_EVENTS.sessionJoin` with `JoinSessionCommandSchema.safeParse`.
  - [ ] Apply join rate limiting consistently with create-session burst limiting; do not let malformed join payload bursts bypass rate limiting.
  - [ ] Require an acknowledgement callback for state-changing join commands or return without mutating server state when no ack callback is supplied.
  - [ ] On validation, inactive Room Code, or rate-limit failure, acknowledge `{ ok: false, error }`, do not `socket.join`, and do not attach identity metadata.
  - [ ] On success, call the domain join command, `socket.join(roomCode)`, attach token-free `socket.data.identity`, acknowledge with `JoinSessionResult`, and emit a sanitized `session:snapshot` to the room.
  - [ ] Keep command payloads, Participant tokens, Moderator tokens, and future hidden Vote values out of logs and snapshots.
- [ ] Build the Participant join and session UI. (AC: 1, 2, 4, 5)
  - [ ] Replace the placeholder participant route in `src/app/routes.tsx` with a real `ParticipantSessionView`.
  - [ ] Add a join workflow on `/` or a dedicated join view reachable from `/`; use real form controls for Room Code and Display Name.
  - [ ] Extend `useSessionSocket` with `joinSession` and use acknowledgement timeouts/failure handling so the UI cannot stay pending forever.
  - [ ] Store the returned Participant token only in `sessionStorage` with a scoped key such as `adr-buddy:participant-token:<roomCode>:<participantId>`; never use `localStorage`, route params, query strings, visible text, or snapshots.
  - [ ] Navigate to `/session/:roomCode` only after a successful acknowledgement.
  - [ ] Show readable stable-code errors for invalid Room Code, missing Display Name, inactive Session, rate limiting, and unavailable connection.
  - [ ] In the Participant session view, render from returned/latest snapshot: Room Code, current Story if present, active Deck label/options, Round state, and a waiting/no-active-story state when no Story exists.
  - [ ] Do not expose Moderator-only controls, Moderator token state, Estimated Stories, Story editing, Deck selection, Round start/reveal/reset, or Final Estimate controls in the Participant view.
  - [ ] Keep layout responsive and keyboard navigable; room code/display-name text must not overflow or overlap at mobile widths.
- [ ] Add focused automated coverage. (AC: 1-5)
  - [ ] Add domain unit tests for successful join, invalid Room Code, duplicate Display Name disambiguation, token-free snapshots, and preserved Story/Deck/Round state.
  - [ ] Add shared contract/schema tests proving join acknowledgement includes the Participant token while snapshots reject token fields.
  - [ ] Add socket tests for `session:join` success, validation failure, invalid/inactive Room Code failure, duplicate name handling, acknowledgement shape, `socket.join`, room snapshot emission, and no-token snapshot emission.
  - [ ] Add React Testing Library tests for join success, sessionStorage token write, no localStorage write, readable error display, and Participant view hiding Moderator-only controls.
  - [ ] Add Playwright coverage for Moderator creates a Session, Participant joins with Room Code and Display Name, Participant lands on `/session/:roomCode`, token is in `sessionStorage`, and `localStorage` is empty.
- [ ] Verify the story end to end. (AC: 1-5)
  - [ ] Run `npm run typecheck`.
  - [ ] Run `npm run test`.
  - [ ] Run `npm run build`.
  - [ ] Run `npm run lint`.
  - [ ] Run `npm run test:e2e` after Playwright coverage is added or updated.
  - [ ] Confirm no unchecked tasks remain before moving the story to review.

## Dev Notes

### Current Repository State

- Story 1.2 is currently `in-progress`, not `done`, because code review found unresolved action items in socket timeout handling, server failure acknowledgements, rate-limit cleanup, no-ack mutation, storage errors, clipboard errors, and mobile room-code overflow.
- Story 1.3 depends on the Story 1.2 create-session surface: live `SessionStore`, generated Room Code, default token-free `SessionSnapshot`, `session:create` socket command, `useSessionSocket`, `sessionStorage` token helpers, and `/session/:roomCode/moderator`.
- `session:join` already exists in `CLIENT_EVENTS`, `ClientToServerEventPayloads`, and `ClientToServerEventAcknowledgements`, but its acknowledgement is currently typed as `SessionSnapshot`; this story needs a token-bearing join result.
- `JoinSessionCommandSchema` already exists and validates `{ roomCode, displayName }` with strict Zod parsing.
- Current `SessionState` only stores a Moderator token and Moderator participant id. It has no Participant token storage yet.
- The participant route `/session/:roomCode` is still a placeholder route. Replace it with a real Participant session view in this story.

### Story Scope Boundaries

- In scope: Participant join by existing active Room Code, required Display Name, Participant capability token, duplicate Display Name disambiguation, token storage in `sessionStorage`, Participant session landing state, and invalid/inactive Room Code errors.
- Out of scope: Moderator presence list UI, online/offline diagnostics, Story editing, Deck selection, starting Rounds, voting, reveal, result grouping, final estimates, durable refresh/reconnect recovery, Redis, database persistence, accounts, SSO, analytics, exports, and backlog integrations.
- Story 1.4 owns Moderator presence display and near-real-time Moderator UI verification. This story may emit updated room snapshots on join, but it should not build the Moderator presence list UI beyond what is required for join correctness.
- Do not add REST endpoints for join. Live Session behavior belongs to Socket.IO commands.

### Architecture Compliance

- Keep Socket.IO as the authoritative Session API; client commands are validated commands, not direct mutations. [Source: `_bmad-output/planning-artifacts/architecture.md#api-communication-patterns`]
- Keep Socket handlers thin: validate payloads, rate-limit/authorize, call domain logic, join rooms, acknowledge, and emit sanitized snapshots. [Source: `_bmad-output/planning-artifacts/architecture.md#communication-patterns`]
- Keep authoritative Session state in `server/domain` behind the in-memory `SessionStore` abstraction. [Source: `_bmad-output/planning-artifacts/architecture.md#data-architecture`]
- Use capability-token authorization without accounts; Participant join returns `participantToken`, and later Participant commands must require that token. [Source: `_bmad-output/planning-artifacts/architecture.md#authentication-security`]
- Store capability tokens in browser `sessionStorage`, not `localStorage`. [Source: `_bmad-output/planning-artifacts/architecture.md#frontend-architecture`]
- Public snapshots must not include capability tokens or hidden Vote values. [Source: `_bmad-output/planning-artifacts/architecture.md#api-communication-patterns`]
- Use shared TypeScript contracts and Zod 4 schemas for command payloads, acknowledgements, errors, snapshots, Decks, Session types, and validation. [Source: `_bmad-output/planning-artifacts/architecture.md#api-communication-patterns`]
- Do not introduce persistence. v1 Session lifecycle is live and ephemeral. [Source: `_bmad-output/planning-artifacts/prds/prd-adr-buddy-2026-06-16/prd.md#cross-cutting-non-functional-requirements`]

### Existing Files To Update Carefully

- `src/shared/contracts/socket-events.ts`
  - Current state: `session:join` acknowledges `SessionSnapshot`.
  - Change needed: introduce `JoinSessionResult` and set `ClientToServerEventAcknowledgements['session:join']` to it.
  - Preserve: stable event names from `CLIENT_EVENTS` and `SERVER_EVENTS`.
- `src/shared/schemas/command-schemas.ts`
  - Current state: `JoinSessionCommandSchema` already exists with strict Room Code and Display Name validation.
  - Change needed: only adjust if tests prove the existing shape is insufficient; do not loosen validation.
- `src/shared/schemas/session-schemas.ts`
  - Current state: `CreateSessionResultSchema` exists; snapshots are strict and token-free.
  - Change needed: add `JoinSessionResultSchema` and tests.
  - Preserve: strict token-free `SessionSnapshotSchema`.
- `src/shared/contracts/errors.ts`
  - Current state: includes `VALIDATION_FAILED`, `RATE_LIMITED`, `INVALID_ROOM_CODE`, and other seed codes.
  - Change needed: add only stable codes genuinely needed for join, such as a separate inactive-room code if the implementation distinguishes it from `INVALID_ROOM_CODE`.
- `server/domain/session-store.ts`
  - Current state: stores one Moderator token/id plus snapshot, votes map, and estimatedStories.
  - Change needed: add Participant token/identity storage and any helper needed to look up/update joined Participants.
  - Preserve: one in-memory store abstraction keyed by Room Code; no durable storage.
- `server/domain/session-commands.ts`
  - Current state: implements `createSession`.
  - Change needed: add `joinSession` as pure domain logic and keep expected business failures as typed results or stable errors.
  - Preserve: create-session behavior and token-free snapshots.
- `server/security/capability-tokens.ts`
  - Current state: `generateModeratorToken` returns 32 random bytes as base64url.
  - Change needed: either reuse it for Participant tokens via a generic name/export or add a Participant wrapper using the same crypto strength.
- `server/security/rate-limit.ts`
  - Current state: per-socket limiter exists for create bursts.
  - Change needed: support create/join command bursts without leaking stale socket entries; align with Story 1.2 review findings if unresolved.
- `server/socket/register-session-handlers.ts`
  - Current state: handles only `session:create`.
  - Change needed: add `session:join` without letting the file grow into domain logic; consider small helper functions if readability suffers.
- `src/features/session/useSessionSocket.ts`
  - Current state: connects with `io()`, sends `createSession`, and listens for `session:snapshot`.
  - Change needed: add `joinSession`; avoid indefinite pending state by using Socket.IO ack timeouts/failure paths.
- `src/features/session/session-storage.ts`
  - Current state: only Moderator token helpers and no try/catch protection.
  - Change needed: add Participant token helpers and handle storage failures intentionally.
- `src/features/session/CreateSessionView.tsx`
  - Current state: first screen only creates Moderator Sessions.
  - Change needed: add or compose a join form without turning the screen into a marketing/landing page.
- `src/app/routes.tsx`
  - Current state: `/session/:roomCode` is a placeholder participant shell.
  - Change needed: route to `ParticipantSessionView`.
- `src/app/styles.css`
  - Current state: global app styling includes create and Moderator room states.
  - Change needed: add join and Participant room states while keeping mobile text within containers.

### Contract And Data Shape Guidance

Use one token-bearing join result and one token-free snapshot:

```ts
export interface JoinSessionResult {
  roomCode: string
  participantToken: string
  participantId: string
  displayName: string
  snapshot: SessionSnapshot
}
```

The joined Participant should appear in snapshots as:

```ts
{
  id: participantId,
  displayName: disambiguatedDisplayName,
  role: 'participant',
  connected: true,
  hasVoted: false,
}
```

The internal server state may store `participantToken`, but `SessionSnapshot`, logs, UI text, route state, and browser URLs must not.

### Duplicate Display Name Rules

- Compare against existing participant display labels in the Session.
- Preserve the first user as the original name, for example `Maxi`.
- If the base name already exists, assign the lowest available suffix: `Maxi (2)`, then `Maxi (3)`, etc.
- Do not mutate existing display names when a duplicate joins.
- Apply the same trim/max-length behavior as `DisplayNameSchema`.

### Participant View Requirements

- For a newly created Session with no active Story, the Participant view should show a clear waiting/no-active-story state.
- The Deck label and Round state should be readable if available from the snapshot.
- Do not expose Moderator-only controls or data. In this story, Participant UI must not show Story edit, Deck selection, start/reveal/reset controls, Final Estimate controls, Estimated Stories, Moderator token, or Participant token.
- The Participant view should render safely from route state, latest snapshot, or missing local token/snapshot state. Durable refresh recovery is not required; a clear missing-session state is acceptable.

### Previous Story Intelligence

- Story 1.2 added `SessionStore`, room-code generation, crypto-backed Moderator tokens, `CreateSessionResult`, `CreateSessionResultSchema`, `session:create`, `useSessionSocket`, `sessionStorage` Moderator token helpers, `CreateSessionView`, `ModeratorSessionView`, and Playwright coverage for Moderator create.
- Story 1.2 final tests passed before review: `npm run typecheck`, `npm run test`, `npm run build`, `npm run lint`, and `npm run test:e2e`.
- Story 1.2 review moved the story back to `in-progress` with unresolved patch findings. The most relevant to Story 1.3 are: no Socket.IO ack timeout in `useSessionSocket`, no stable ack on server create exceptions, stale rate-limit entries, invalid payloads bypassing rate limiting, state mutation without ack callback, unguarded `sessionStorage`, and mobile room-code overflow.
- Build/import pattern: server files import shared contracts with relative `.js` imports from `../../src/shared/...`; preserve this style so `npm run build:server` remains green.
- Tests are co-located for unit/component coverage, with Playwright tests in `tests/e2e`.

### Git Intelligence

- Recent commits include review tracking and Story 1.2 implementation:
  - `500c4a8 feat: update session creation story status to in-progress and add review findings`
  - `c0e8f1e feat: implement session creation and management features`
  - `c769ed3 feat: update project status to done, add session creation story, and enhance environment configuration`
- HEAD at story creation is `500c4a87cc31eec48f7a0407b1de9a256e6bb786`.

### Latest Technical Notes Checked On 2026-06-28

- Socket.IO v4 acknowledgements support callback responses and `.timeout(ms).emit(...)` for client-side timeout handling. Use this to avoid indefinite pending join/create UI states. Source: https://socket.io/docs/v4/emitting-events/
- Socket.IO rooms are server-side channels. Use `socket.join(roomCode)` after an accepted join and broadcast sanitized snapshots with room targeting as needed; clients do not directly manage room membership. Source: https://socket.io/docs/v4/rooms/
- Socket.IO TypeScript event maps improve compile-time event safety but do not replace Zod runtime validation at command boundaries. Source: https://socket.io/docs/v4/typescript/
- MDN documents `sessionStorage` as origin and tab scoped; storage access can fail in restricted browser contexts, so token helpers should handle storage errors without crashing the app. Source: https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage
- The Clipboard API can reject writes when permissions or browser context disallow copying; Participant story changes should not add new unhandled promise paths. Source: https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText
- Current project dependencies include `socket.io@^4.8.1`, `socket.io-client@^4.8.3`, `react-router-dom@^7.18.0`, `zod@^4.1.13`, `vitest@^4.0.16`, and `@playwright/test@^1.57.0`; do not add new dependencies for this story unless absolutely required.

### Project Structure Notes

- Add or update files under established folders only:

```text
server/domain/
  session-commands.ts
  session-store.ts
server/security/
  capability-tokens.ts
  rate-limit.ts
server/socket/
  register-session-handlers.ts
src/features/session/
  CreateSessionView.tsx
  ParticipantSessionView.tsx
  session-storage.ts
  useSessionSocket.ts
src/shared/contracts/
  errors.ts
  socket-events.ts
src/shared/schemas/
  command-schemas.ts
  session-schemas.ts
tests/e2e/
  create-session.spec.ts or participant-join.spec.ts
```

- Do not create new top-level app folders, a second shared contract location, or a REST API for join.
- If join UI makes `CreateSessionView.tsx` too broad, split a focused `JoinSessionView.tsx` or `SessionEntryView.tsx` inside `src/features/session`.

### References

- `_bmad-output/planning-artifacts/epics.md#story-13-participant-joins-a-session`
- `_bmad-output/planning-artifacts/prds/prd-adr-buddy-2026-06-16/prd.md#fr-2-join-session`
- `_bmad-output/planning-artifacts/prds/prd-adr-buddy-2026-06-16/prd.md#cross-cutting-non-functional-requirements`
- `_bmad-output/planning-artifacts/architecture.md#data-architecture`
- `_bmad-output/planning-artifacts/architecture.md#authentication-security`
- `_bmad-output/planning-artifacts/architecture.md#api-communication-patterns`
- `_bmad-output/planning-artifacts/architecture.md#frontend-architecture`
- `_bmad-output/implementation-artifacts/1-2-moderator-creates-a-session.md#review-findings`
- `_bmad-output/implementation-artifacts/1-2-moderator-creates-a-session.md#completion-notes-list`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

### Implementation Plan

### Completion Notes List

### File List

## Change Log

- 2026-06-28: Created Story 1.3 developer context for Participant Session join.
