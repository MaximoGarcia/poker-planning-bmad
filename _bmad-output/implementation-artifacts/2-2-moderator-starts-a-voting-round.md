---
baseline_commit: 3ab212099d0b521966447ebfa40fba66958e09fd
---

# Story 2.2: Moderator Starts A Voting Round

Status: ready-for-dev

Completion Note: Ultimate context engine analysis completed - comprehensive developer guide created.

## Story

As a Moderator,
I want to start a voting Round for the current Story,
so that the team can begin submitting estimates in a controlled live flow.

## Acceptance Criteria

1. Given the Session has a current Story and selected Deck, when the Moderator starts a Round, then the server changes the Round state to active, and all joined users receive a near-real-time snapshot showing that voting is open.
2. Given prior unrecorded Votes exist for the current Story, when the Moderator starts a new Round, then the server clears those prior unrecorded Votes, and no previous selected Card values remain in the active Round state.
3. Given the Session has no current Story, when the Moderator attempts to start a Round, then the server rejects the command with a stable error code such as `STORY_REQUIRED`, and the UI shows a readable message without changing Round state.
4. Given a Participant attempts to start a Round, when the command is processed, then the server rejects the command with `UNAUTHORIZED`, and the Participant UI does not expose start controls.
5. Given a start Round command is pending, when the Moderator view is waiting for acknowledgement, then the start control shows a pending or disabled state, and the UI does not optimistically mark the Round active before the server snapshot arrives.

## Tasks / Subtasks

- [ ] Add shared round-start command and error contracts. (AC: 1, 3, 4)
  - [ ] Add `StartRoundCommandSchema` in `src/shared/schemas/command-schemas.ts` with `roomCode` and `moderatorToken`; reuse the existing room-code and token validation style from story/deck commands.
  - [ ] Update `src/shared/contracts/socket-events.ts` so `round:start` uses the shared command type and acknowledges with `SessionSnapshot`.
  - [ ] Add `STORY_REQUIRED` to `src/shared/contracts/errors.ts`; keep existing codes unchanged.
  - [ ] Add or extend schema/contract tests for valid round-start payloads, missing token rejection, and invalid room code rejection.
- [ ] Implement the server-authoritative start-round domain transition. (AC: 1, 2, 3, 4)
  - [ ] Add `startRound` to `server/domain/session-commands.ts`.
  - [ ] Return `INVALID_ROOM_CODE` for missing sessions and `UNAUTHORIZED` for invalid moderator tokens.
  - [ ] Return `STORY_REQUIRED` when `session.snapshot.story` is `null`; leave `snapshot`, `votes`, and `updatedAt` unchanged on failure.
  - [ ] On success, set `round.active = true`, `round.revealed = false`, `round.voteCount = 0`, and set `story.locked = true`.
  - [ ] Clear `session.votes` so any prior unrecorded votes are removed before the new round begins.
  - [ ] Set every participant snapshot `hasVoted` to `false`, including the moderator participant, so presence and future vote status start clean.
  - [ ] Update `updatedAt` only on successful mutation.
- [ ] Wire `round:start` through Socket.IO. (AC: 1, 3, 4, 5)
  - [ ] Register `CLIENT_EVENTS.roundStart` in `server/socket/register-session-handlers.ts`.
  - [ ] Reuse the existing moderator-command helper shape: validate, delegate to domain, return stable failure ack or success ack, then emit `SERVER_EVENTS.sessionSnapshot` to `io.to(roomCode)`.
  - [ ] Keep the handler thin; do not mutate session state in the socket layer.
  - [ ] Confirm thrown domain/store failures are converted to a stable failure ack rather than leaking exceptions.
- [ ] Extend the socket client helper. (AC: 1, 5)
  - [ ] Add `startRound(command: StartRoundCommand)` to `src/features/session/useSessionSocket.ts`.
  - [ ] Validate the success acknowledgement with `SessionSnapshotAckSchema` and apply it to `latestSnapshot`.
  - [ ] Preserve the existing 5 second Socket.IO timeout behavior and connection-unavailable fallback.
- [ ] Add Moderator start-round UI. (AC: 1, 3, 5)
  - [ ] Update `src/features/session/ModeratorSessionView.tsx` to show a Start round control only for the moderator.
  - [ ] Read the moderator token with the existing `readModeratorToken(roomCode)` helper; never put the token in route state, snapshots, logs, or local storage.
  - [ ] Disable the control while a command is pending, while a round is already active, or when no current Story exists.
  - [ ] Show a pending label/state while waiting for acknowledgement.
  - [ ] Show readable messages for `STORY_REQUIRED`, `UNAUTHORIZED`, and generic failures without changing local round state optimistically.
  - [ ] Preserve the existing story/deck editor, room code copy behavior, participant presence list, and missing-session guard.
- [ ] Keep Participant UI read-only and round-aware. (AC: 1, 4)
  - [ ] Update `src/features/session/ParticipantSessionView.tsx` only as needed to make the active voting state clear from the server snapshot.
  - [ ] Do not add start controls, moderator token access, or moderator-only command affordances to the Participant view.
  - [ ] Keep deck values and current story display driven by `snapshot.deck` and `snapshot.story`.
- [ ] Add focused automated coverage. (AC: 1-5)
  - [ ] Add domain tests for successful start, vote clearing, `STORY_REQUIRED`, `UNAUTHORIZED`, invalid room, unchanged failure state, locked story, and `hasVoted` reset.
  - [ ] Add socket handler tests proving valid start commands ack and broadcast the room snapshot, while invalid/participant commands return stable errors without mutation.
  - [ ] Add `useSessionSocket` tests for `startRound` success, ack validation failure, timeout/connection failure, and snapshot state update.
  - [ ] Add Moderator component tests for disabled states, pending state, error messages, and no optimistic active-round rendering.
  - [ ] Add or extend Playwright coverage in `tests/e2e/create-session.spec.ts` for Moderator starting a round and Participant seeing `Voting` near-real-time.
- [ ] Verify the story end to end. (AC: 1-5)
  - [ ] Run `npm run typecheck`.
  - [ ] Run `npm run test`.
  - [ ] Run `npm run build`.
  - [ ] Run `npm run lint`.
  - [ ] Run `npm run test:e2e` after browser coverage is updated.

## Dev Notes

### Current Repository State

- Story 2.1 is complete and established token-aware moderator commands for `story:update` and `deck:select`.
- `src/shared/schemas/command-schemas.ts` already has strict command schemas for create, join, story update, deck selection, and a placeholder vote schema. It does not yet define a token-bearing `StartRoundCommandSchema`.
- `src/shared/contracts/socket-events.ts` already declares `round:start`, but its payload is currently `{ roomCode: string }`. Story 2.2 must add `moderatorToken` and move the payload to a shared command type.
- `src/shared/contracts/errors.ts` does not yet contain `STORY_REQUIRED`; add it as a stable machine-readable error code.
- `server/domain/session-commands.ts` currently implements `createSession`, `joinSession`, `updateStory`, `selectDeck`, and participant removal. Round start behavior must be added here, not in React or socket handlers.
- `server/domain/session-store.ts` already stores `votes: Map<string, string>`. Story 2.2 must clear this map on successful round start, even though vote submission is not implemented yet, because the AC explicitly protects future unrecorded-vote reset behavior.
- `server/socket/register-session-handlers.ts` already has a generic `handleModeratorCommand` used by story/deck commands. Reuse that pattern for `round:start`.
- `src/features/session/useSessionSocket.ts` already has `updateStory` and `selectDeck` helpers that validate `SessionSnapshot` acks and call `setLatestSnapshot`. Add `startRound` the same way.
- `src/features/session/ModeratorSessionView.tsx` currently shows story/deck controls, deck options, participant presence, and lock/readiness text. It has no start-round control yet.
- `src/features/session/ParticipantSessionView.tsx` already maps `round.active` to `Voting`; it may need only small UI/test updates for the new flow.

### Story Scope Boundaries

- In scope: start-round command schema, server-side moderator authorization, story-required guard, round active transition, story lock, vote/status reset, snapshot broadcast, Moderator pending/error UI, Participant voting-state visibility, and tests.
- Out of scope: participant vote submission, moderator voting, reveal, reset, final estimate capture, results grouping, estimated story history, reconnect recovery, persistence, Redis, authentication, analytics, and any backlog integration.
- Do not introduce REST endpoints for round control. Live session behavior remains Socket.IO command based.
- Do not add client-only round state or optimistic active-round changes. Accepted round state must come from the server acknowledgement/snapshot.
- Do not upgrade dependencies for this story unless a blocking defect is found.

### Architecture Compliance

- Keep Socket.IO as the authoritative live Session API; `round:start` is a command event with an acknowledgement and a sanitized `session:snapshot` broadcast. [Source: `_bmad-output/planning-artifacts/architecture.md#api--communication-patterns`]
- Keep all authoritative state transitions in `server/domain`; socket handlers validate, authorize/delegate, ack, and broadcast only. [Source: `_bmad-output/planning-artifacts/architecture.md#api--communication-patterns`]
- Use capability-token authorization for moderator-only commands. The server must reject invalid moderator tokens with `UNAUTHORIZED`; the route alone is not authority. [Source: `_bmad-output/planning-artifacts/architecture.md#authentication--security`]
- Keep frontend state server-snapshot-driven and avoid optimistic mutation for moderator commands. [Source: `_bmad-output/planning-artifacts/architecture.md#frontend-architecture`]
- Preserve v1 ephemerality and the existing in-memory `SessionStore`; do not add persistence or migrations. [Source: `_bmad-output/planning-artifacts/architecture.md#data-architecture`]
- Keep hidden vote values out of snapshots and logs before reveal. Even though this story only clears votes, it must not add any selected-card fields to `SessionSnapshot`. [Source: `_bmad-output/planning-artifacts/architecture.md#format-patterns`]

### Existing Files To Update Carefully

- `src/shared/schemas/command-schemas.ts`
  - Current state: story/deck commands require `moderatorToken`; `SubmitVoteCommandSchema` exists but has no token yet.
  - Change needed: add `StartRoundCommandSchema` and `StartRoundCommand` using the same token regex/min/max as existing moderator commands.
  - Preserve: strict schemas, shared `RoomCodeSchema`, existing create/join/story/deck behavior.
- `src/shared/contracts/socket-events.ts`
  - Current state: `round:start` is typed as `{ roomCode: string }`.
  - Change needed: import/use `StartRoundCommand`; keep ack type as `SessionSnapshot`.
  - Preserve: stable event name `round:start` and `session:snapshot`.
- `src/shared/contracts/errors.ts`
  - Current state: no `STORY_REQUIRED` code.
  - Change needed: add `storyRequired: 'STORY_REQUIRED'`.
  - Preserve: existing codes and casing.
- `server/domain/session-commands.ts`
  - Current state: moderator story/deck commands already authorize by token and reject active-round story/deck edits with `STORY_LOCKED`.
  - Change needed: add `startRound`; ensure failures do not mutate session state.
  - Preserve: `createSession` and `joinSession` behavior, room code generation, display-name disambiguation, and snapshot shape.
- `server/socket/register-session-handlers.ts`
  - Current state: generic moderator handler catches validation/domain failures and broadcasts on success.
  - Change needed: register `round:start` using `StartRoundCommandSchema` and `startRound`.
  - Preserve: handler thinness, room-scoped broadcast, stable ack shape, rate limiter behavior for create/join.
- `src/features/session/useSessionSocket.ts`
  - Current state: shared socket lifecycle, snapshot validation, create/join/story/deck helpers.
  - Change needed: add `startRound` helper.
  - Preserve: `ACK_TIMEOUT_MS`, single socket provider, no second realtime abstraction.
- `src/features/session/ModeratorSessionView.tsx`
  - Current state: story/deck editor has independent pending state and renders active-round lock text.
  - Change needed: add start control and pending/error state without breaking story/deck command pending behavior.
  - Preserve: participant list and no hidden card values.
- `src/features/session/ParticipantSessionView.tsx`
  - Current state: read-only and already labels active rounds as `Voting`.
  - Change needed: likely tests/UI polish only.
  - Preserve: no moderator controls, no token reads, no command buttons except future vote controls in later stories.

### Files Expected To Remain Unchanged Unless A Defect Is Found

- `src/shared/domain/decks.ts`: deck definitions already satisfy Story 2.2; do not duplicate them.
- `src/shared/contracts/snapshots.ts`: current snapshot already includes `round.active`, `round.revealed`, and `round.voteCount`; do not add selected-card values for this story.
- `src/features/session/session-storage.ts`: token storage helpers already use `sessionStorage`; reuse them.
- `server/security/capability-tokens.ts`: token generation exists; this story only validates and compares existing moderator tokens.

### Implementation Guidance

- Preferred command shape:

```ts
type StartRoundCommand = {
  roomCode: string
  moderatorToken: string
}
```

- Successful domain transition should be equivalent to:

```ts
const snapshot = {
  ...session.snapshot,
  story: session.snapshot.story
    ? { ...session.snapshot.story, locked: true }
    : session.snapshot.story,
  participants: session.snapshot.participants.map((participant) => ({
    ...participant,
    hasVoted: false,
  })),
  round: {
    active: true,
    revealed: false,
    voteCount: 0,
  },
  updatedAt: now().toISOString(),
}
```

- Store update should replace/clear prior votes:

```ts
store.set({
  ...session,
  votes: new Map(),
  snapshot,
})
```

- Failure ordering should be: invalid room, unauthorized token, missing story. This avoids exposing session state to callers without a valid moderator token.
- Starting an already active round is not specified in the story. Conservative behavior: make it idempotently active only if the moderator is valid and a story exists, while still clearing prior unrecorded votes. If the team prefers rejecting double-starts, add a stable error code and update story/architecture first.
- The UI should disable Start round when `snapshot.round.active` is true to prevent accidental double-starts.
- The UI should also disable Start round when `snapshot.story` is null, but the server still owns the `STORY_REQUIRED` rejection for forged or stale clients.

### Cross-Story Intelligence

- Story 2.1 established the pattern for moderator-only commands: command payload includes `moderatorToken`, domain layer compares it to stored session token, socket handler returns stable acks, and frontend waits for validated server snapshot.
- Story 2.1 review fixed overlapping command dispatch in `ModeratorSessionView`; Story 2.2 should ensure the new Start round control participates in the same pending/disabled discipline.
- Story 1.4 established participant presence and `hasVoted` display in the Moderator view. Story 2.2 must reset `hasVoted` to `false` when a round starts so later voting stories can safely toggle it.
- Story 1.3 established participant token/session storage rules. Story 2.2 should not modify participant token behavior.

### Git Intelligence

- Recent commits:
  - `3ab2120 Improve ADR buddy validation and workflow handling`
  - `55f84d5 Refocus scaffold docs on local Node runtime`
  - `5b18d42 Add participant presence to moderator session view`
  - `5e94a0e feat: implement participant session functionality and UI`
  - `ef77066 feat: complete moderator session creation story`
- Current repo status was clean before creating this story file.
- Existing implementation style favors small shared contract changes plus domain, socket, hook, component, and Playwright coverage for each feature slice.

### Latest Technical Notes Checked On 2026-07-03

- Socket.IO 4.x official docs still support acknowledgement callbacks and per-emit timeouts; the repo’s existing `socket.timeout(ACK_TIMEOUT_MS).emit(...)` pattern remains valid. Source: https://socket.io/docs/v4/emitting-events/
- Socket.IO room docs still show `socket.join(room)` and `io.to(room).emit(...)` for broadcasting to a subset of clients; keep room-scoped snapshots for accepted round starts. Source: https://socket.io/docs/v4/rooms/
- Zod 4 remains the active validation API family; add the new schema beside existing Zod schemas rather than adding another validator. Source: https://zod.dev/api
- Vite docs continue to list Node `20.19+` / `22.12+` requirements, matching this repo’s `package.json` engine range. No dependency upgrade is required. Source: https://vite.dev/guide/

### Project Structure Notes

- Expected update locations:

```text
src/shared/contracts/
  errors.ts
  socket-events.ts
src/shared/schemas/
  command-schemas.ts
  command-schemas.test.ts
server/domain/
  session-commands.ts
  session-commands.test.ts
server/socket/
  register-session-handlers.ts
  register-session-handlers.test.ts
src/features/session/
  ModeratorSessionView.tsx
  ModeratorSessionView.test.tsx
  ParticipantSessionView.tsx
  ParticipantSessionView.test.tsx
  useSessionSocket.ts
  useSessionSocket.test.tsx
tests/e2e/
  create-session.spec.ts
```

- Keep unit/component tests co-located and browser tests under `tests/e2e`.
- Avoid new top-level folders and duplicate command/snapshot definitions.

### References

- `_bmad-output/planning-artifacts/epics.md#story-22-moderator-starts-a-voting-round`
- `_bmad-output/planning-artifacts/prds/prd-adr-buddy-2026-06-16/prd.md#fr-6-start-round`
- `_bmad-output/planning-artifacts/prds/prd-adr-buddy-2026-06-16/prd.md#fr-8-restrict-round-controls-to-moderator`
- `_bmad-output/planning-artifacts/prds/prd-adr-buddy-2026-06-16/prd.md#cross-cutting-non-functional-requirements`
- `_bmad-output/planning-artifacts/architecture.md#authentication--security`
- `_bmad-output/planning-artifacts/architecture.md#api--communication-patterns`
- `_bmad-output/planning-artifacts/architecture.md#frontend-architecture`
- `_bmad-output/planning-artifacts/architecture.md#project-structure--boundaries`
- `_bmad-output/implementation-artifacts/2-1-moderator-sets-current-story-and-deck.md`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-07-03: `bmad-create-story` workflow customization resolved with no prepend/append activation steps and persistent project-context glob returned no files.

### Completion Notes List

- Story context created for Story 2.2 with implementation guardrails, previous-story intelligence, architecture compliance notes, local file analysis, and latest official-doc checks.

### File List

- `_bmad-output/implementation-artifacts/2-2-moderator-starts-a-voting-round.md`
