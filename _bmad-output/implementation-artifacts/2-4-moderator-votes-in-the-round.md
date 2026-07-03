---
baseline_commit: d4307df
---

# Story 2.4: Moderator Votes In The Round

Status: done

Completion Note: Ultimate context engine analysis completed - comprehensive developer guide created.

## Story

As a Moderator,
I want to optionally submit my own Vote using the active Deck,
so that I can contribute an estimate under the same hidden-vote rules as Participants.

## Acceptance Criteria

1. Given a Round is active, when the Moderator selects a Card from the active Deck, then the server records one Moderator Vote for the Round, and the Moderator Vote uses the same active Deck as Participant Votes.
2. Given the Moderator has already voted in the active Round, when they select a different Card before reveal, then the server replaces their prior Vote with the new Card, and only one Moderator Vote remains for the Round.
3. Given the Moderator has submitted a Vote before reveal, when snapshots are emitted, then users may see that the Moderator has voted if Moderator voting status is shown, and no user sees the Moderator's selected Card value before reveal.
4. Given a Moderator vote command is pending, when the Moderator view waits for acknowledgement, then the Card selection shows a pending or disabled state, and the UI does not optimistically expose or broadcast the selected Card before the server snapshot arrives.

## Tasks / Subtasks

- [x] Extend the shared vote command contract for Moderator voting without breaking Participant voting. (AC: 1-4)
  - [x] Preserve the existing Participant vote payload shape `{ roomCode, participantId, participantToken, value }` unless there is a deliberate migration with all affected tests updated.
  - [x] Add a Moderator vote branch such as `{ roomCode, moderatorToken, value }` to `SubmitVoteCommandSchema` in `src/shared/schemas/command-schemas.ts`.
  - [x] Keep `roomCode`, capability token, and `value` validation strict; reject payloads that mix participant and moderator credentials.
  - [x] Keep `CLIENT_EVENTS.voteSubmit` / `vote:submit` as the stable Socket.IO event in `src/shared/contracts/socket-events.ts`.
  - [x] Add schema tests for valid Moderator vote payloads, invalid or short moderator tokens, extra fields, missing value, and participant-payload regression coverage.
- [x] Implement server-authoritative Moderator vote submission in the domain layer. (AC: 1-3)
  - [x] Update `submitVote` in `server/domain/session-commands.ts` to handle both Participant and Moderator vote commands.
  - [x] For Moderator commands, authorize only with `session.moderatorToken`; do not accept participant tokens or route/client role claims.
  - [x] Store the Moderator vote using `session.moderatorParticipantId` as the vote key in `session.votes`.
  - [x] Set only the Moderator participant entry (`role: 'moderator'`) to `hasVoted: true`.
  - [x] Recompute `round.voteCount` from `votes.size`, so a Moderator vote increments the count once and a changed Moderator vote does not increment it again.
  - [x] Keep failure guard behavior stable: missing room -> `INVALID_ROOM_CODE`; bad Moderator token -> `UNAUTHORIZED`; inactive round -> `ROUND_NOT_ACTIVE`; revealed round -> `VOTE_LOCKED`; out-of-deck value -> `VALIDATION_FAILED`.
  - [x] Assert every failure path leaves `votes`, `participants`, `round`, and `updatedAt` unchanged.
- [x] Preserve hidden-vote privacy for room-wide snapshots. (AC: 3)
  - [x] Do not add selected card values, grouped counts, result distributions, or `selectedCard` fields to `SessionSnapshot` before reveal.
  - [x] It is acceptable for the room-wide snapshot to show `hasVoted: true` on the Moderator participant entry; it must not include the Moderator's chosen card.
  - [x] Do not log moderator tokens, participant tokens, or hidden vote values.
  - [x] Avoid viewer-specific selected-card fields unless a role-aware snapshot mapper is introduced; the current room-wide `session:snapshot` object is unsafe for hidden values.
- [x] Wire Moderator voting through the existing Socket.IO vote path. (AC: 1-4)
  - [x] Reuse the existing `CLIENT_EVENTS.voteSubmit` handler in `server/socket/register-session-handlers.ts`; keep it thin: validate, delegate, ack, broadcast sanitized snapshot.
  - [x] Preserve the existing acknowledgement-before-broadcast ordering.
  - [x] Return stable validation and authorization failures without broadcasting.
  - [x] Keep accepted broadcasts room-scoped with `io.to(roomCode).emit(SERVER_EVENTS.sessionSnapshot, snapshot)`.
- [x] Add Moderator Card selection UI. (AC: 1, 2, 4)
  - [x] Update `src/features/session/ModeratorSessionView.tsx` so active unrevealed rounds render selectable active Deck cards for the Moderator.
  - [x] Read the Moderator token via `readModeratorToken(roomCode)`; never expose it in UI text, route state, logs, snapshots, or local storage.
  - [x] Disable vote controls when no round is active, results are revealed, no moderator token exists, or a vote command is pending.
  - [x] Show pending, submitted, changed, and readable error states derived from the server acknowledgement/snapshot; do not optimistically mark the Moderator as voted before accepted server state.
  - [x] Keep Story, Deck, and Start Round controls behavior unchanged.
  - [x] Use real buttons or radio-style controls with readable labels and `aria-pressed` or equivalent selected state.
- [x] Reuse or carefully extract Card vote UI to avoid divergent Participant and Moderator behavior. (AC: 1, 2, 4)
  - [x] Prefer a small presentational component under `src/features/cards` only if it removes meaningful duplication between Participant and Moderator card grids.
  - [x] Keep socket commands, token lookup, and role-specific state in the owning session views or hooks; do not bury authorization behavior inside a visual component.
  - [x] Preserve existing Participant voting behavior and tests while adding Moderator voting.
- [x] Add focused automated coverage. (AC: 1-4)
  - [x] Add domain tests for successful Moderator first vote, changed Moderator vote replacement, combined Participant plus Moderator `voteCount`, invalid room, bad moderator token, participant token misuse, inactive round, revealed round, invalid deck value, no selected-card leakage, and unchanged state on failure.
  - [x] Add socket handler tests for valid Moderator `vote:submit` ack/broadcast, malformed Moderator payload validation, unauthorized token failure, no broadcast on failure, and sanitized snapshot broadcast.
  - [x] Add or extend `useSessionSocket` tests if the command type or harness needs coverage for Moderator vote payloads.
  - [x] Add Moderator component tests for active card rendering, token-backed submit command, changed vote, missing token disabled state, pending state, readable failures, keyboard-accessible labels, and no hidden value/token rendering.
  - [x] Keep existing Participant component tests passing; add regression coverage if shared card UI is extracted.
  - [x] Extend Playwright coverage in `tests/e2e/create-session.spec.ts` or add `tests/e2e/voting-round.spec.ts` for a Moderator-started round where both a Participant and the Moderator vote before reveal, the Moderator can change their vote, vote status is visible only as status, and selected card values are not visible in the other browser before reveal.
- [x] Verify the story end to end. (AC: 1-4)
  - [x] Run `cmd.exe /c npm run typecheck`.
  - [x] Run `cmd.exe /c npm run test`.
  - [x] Run `cmd.exe /c npm run build`.
  - [x] Run `cmd.exe /c npm run lint`.
  - [x] Run `cmd.exe /c npm run test:e2e` after browser-flow coverage is updated.

### Review Findings

- [x] [Review][Patch] Verify the moderator participant entry before accepting a moderator vote [server/domain/session-commands.ts:267]
- [x] [Review][Patch] Prefer the latest moderator socket snapshot when timestamps are equal [src/features/session/ModeratorSessionView.tsx:452]
- [x] [Review][Patch] Prefer the latest participant socket snapshot when timestamps are equal [src/features/session/ParticipantSessionView.tsx:205]

## Dev Notes

### Current Repository State

- Story 2.3 is complete and implemented Participant voting as a vertical slice through shared schemas, domain command, Socket.IO handler, socket hook, Participant UI, Moderator presence status, unit/component tests, and e2e coverage.
- `SubmitVoteCommandSchema` currently accepts Participant-only payloads: `{ roomCode, participantId, participantToken, value }`.
- `submitVote` in `server/domain/session-commands.ts` currently rejects moderator ids because it requires the target participant entry to have `role === 'participant'` and a matching `session.participantTokens` entry.
- `SessionState` already contains `moderatorParticipantId`, `moderatorToken`, `participantTokens`, `votes: Map<string, string>`, and `snapshot`; use these fields instead of introducing a second vote store.
- `startRound` already clears `votes`, sets every participant entry including the Moderator to `hasVoted: false`, locks the current Story, sets `round.active = true`, `round.revealed = false`, and resets `voteCount` to `0`.
- `SessionSnapshot.participants` includes both Moderator and Participant entries with `role`, `connected`, and `hasVoted`. This is enough to represent Moderator vote status without revealing the selected card.
- `ModeratorSessionView.tsx` currently renders Story/Deck editing, Start Round, participant presence, and read-only deck option lists. It has no Moderator vote controls.
- `ParticipantSessionView.tsx` already renders active deck values as vote buttons, uses `readParticipantToken`, tracks pending and local selected state, and sends `sessionSocket.submitVote`.
- `useSessionSocket.ts` already exposes `submitVote(command)` through the shared 5 second timeout, ack validation, and `latestSnapshot` update helper.
- `register-session-handlers.ts` already registers `CLIENT_EVENTS.voteSubmit`; the handler delegates to `submitVote` and broadcasts only accepted snapshots.

### Story Scope Boundaries

- In scope: Moderator vote command contract, Moderator token authorization, active deck validation, active-round and revealed-round guards, single Moderator vote replacement, Moderator `hasVoted` status, `voteCount` recomputation, Moderator card UI, and tests.
- Out of scope: reveal results, grouped vote counts, selected-card disclosure, round reset, final estimate capture, estimated story history, reconnect recovery, persistence, Redis, authentication, analytics, exports, backlog integrations, and changing deck definitions.
- Do not introduce REST endpoints for voting. Live session behavior remains Socket.IO command based.
- Do not add durable storage or database migrations. Votes remain live, in-memory state for v1.
- Do not expose selected card values in any room-wide snapshot before reveal. Story 2.5 will harden privacy further; this story must not create a leak that later work has to undo.

### Architecture Compliance

- Socket.IO is the authoritative live Session API; `vote:submit` must remain a typed command event with acknowledgement and sanitized `session:snapshot` broadcast. [Source: `_bmad-output/planning-artifacts/architecture.md#api--communication-patterns`]
- Socket handlers validate payloads, authorize, delegate to domain logic, return acknowledgements, and emit snapshots only. Authoritative mutation stays in `server/domain`. [Source: `_bmad-output/planning-artifacts/architecture.md#communication-patterns`]
- Moderator-only authority comes from the `moderatorToken` returned at session creation and stored in `sessionStorage`; do not use client route state as authority. [Source: `_bmad-output/planning-artifacts/architecture.md#authentication--security`]
- Frontend state must remain server-snapshot-driven. Vote controls may show pending state, but accepted vote state must come from server acknowledgement and snapshot. [Source: `_bmad-output/planning-artifacts/architecture.md#frontend-architecture`]
- Hidden Vote values must not be included in public snapshots or logs before reveal. [Source: `_bmad-output/planning-artifacts/architecture.md#format-patterns`]
- Cards must be real buttons or radio-style controls with readable labels and keyboard support. [Source: `_bmad-output/planning-artifacts/architecture.md#frontend-architecture`]

### Existing Files To Update Carefully

- `src/shared/schemas/command-schemas.ts`
  - Current state: `SubmitVoteCommandSchema` supports Participant-only credentials.
  - Change needed: add a Moderator vote payload branch while preserving strict validation and inferred `SubmitVoteCommand` typing.
  - Preserve: `RoomCodeSchema`, capability token constraints, strict schema behavior, Participant payload compatibility.
- `src/shared/contracts/socket-events.ts`
  - Current state: `vote:submit` is stable and typed as `SubmitVoteCommand`.
  - Change needed: usually only type changes through the schema export; event name should remain unchanged.
  - Preserve: acknowledgement type as `SessionSnapshot`.
- `server/domain/session-store.ts`
  - Current state: `moderatorParticipantId` and `votes: Map<string, string>` already exist.
  - Change needed: no structural change expected.
  - Preserve: the in-memory `SessionStore` boundary as the single authoritative Session storage abstraction.
- `server/domain/session-commands.ts`
  - Current state: `submitVote` handles only participant-owned votes.
  - Change needed: split Participant and Moderator authorization paths inside `submitVote` or through small internal helpers; both paths should converge on the same success mutation pattern.
  - Preserve: existing Participant vote behavior, guard ordering, error codes, `startRound` reset behavior, story/deck lock behavior.
- `server/socket/register-session-handlers.ts`
  - Current state: `vote:submit` handler validates with `SubmitVoteCommandSchema`, delegates to `submitVote`, acks, and broadcasts.
  - Change needed: minimal if the schema/domain accept Moderator payloads.
  - Preserve: thin handler, ack-before-broadcast ordering, room-scoped snapshot emit, no mutation in socket layer.
- `src/features/session/useSessionSocket.ts`
  - Current state: `submitVote` already exists and validates successful acks with `SessionSnapshotAckSchema`.
  - Change needed: likely type-only changes if the command union changes.
  - Preserve: `ACK_TIMEOUT_MS`, connection unavailable fallback, no optimistic authoritative mutation.
- `src/features/session/ModeratorSessionView.tsx`
  - Current state: `readModeratorToken(roomCode)` is already used; deck values are displayed read-only.
  - Change needed: add Moderator vote controls for active unrevealed rounds and local pending/status/error state.
  - Preserve: missing-session guard, Story/Deck editor behavior, Start Round behavior, participant presence privacy.
- `src/features/session/ParticipantSessionView.tsx`
  - Current state: Participant vote controls are implemented and tested.
  - Change needed: no behavioral change expected unless extracting shared card UI.
  - Preserve: participant token usage, disabled states, selected state reset on server reset, no moderator controls.
- `src/app/styles.css`
  - Current state: contains vote-card button styles from Story 2.3.
  - Change needed: reuse existing styles for Moderator vote controls before adding new visual patterns.
  - Preserve: responsive behavior and non-color-only selected affordances.

### Files Expected To Remain Unchanged Unless A Defect Is Found

- `src/shared/domain/decks.ts`: active deck definitions already satisfy Story 2.4.
- `src/features/session/session-storage.ts`: `readModeratorToken` already uses `sessionStorage`; reuse it.
- `server/security/capability-tokens.ts`: token generation already exists; this story only validates the stored Moderator token.
- `src/features/results/*`: results and final estimate UI belong to Epic 3.
- `server/domain/result-aggregation.ts`: grouped results are out of scope until reveal/result stories.

### Implementation Guidance

Preferred low-risk command shape keeps existing Participant voting intact and adds a strict Moderator branch:

```ts
type SubmitParticipantVoteCommand = {
  roomCode: string
  participantId: string
  participantToken: string
  value: string
}

type SubmitModeratorVoteCommand = {
  roomCode: string
  moderatorToken: string
  value: string
}

type SubmitVoteCommand = SubmitParticipantVoteCommand | SubmitModeratorVoteCommand
```

Conservative domain guard order:

```text
1. Missing room -> INVALID_ROOM_CODE
2. Bad actor token -> UNAUTHORIZED
3. No active round -> ROUND_NOT_ACTIVE
4. Revealed round -> VOTE_LOCKED
5. Value outside active deck -> VALIDATION_FAILED
6. Success -> replace vote, set actor hasVoted, recompute voteCount, update updatedAt
```

Moderator success mutation should be equivalent to:

```ts
const voterId = session.moderatorParticipantId
const votes = new Map(session.votes)
votes.set(voterId, command.value)

const snapshot = {
  ...session.snapshot,
  participants: session.snapshot.participants.map((participant) =>
    participant.id === voterId && participant.role === 'moderator'
      ? { ...participant, hasVoted: true }
      : participant,
  ),
  round: {
    ...session.snapshot.round,
    voteCount: votes.size,
  },
  updatedAt: now().toISOString(),
}
```

Do not set vote ownership by display name. Duplicate display names are allowed, and the Moderator may share a display name prefix with Participants after disambiguation.

Do not use array append semantics for votes. `Map#set(session.moderatorParticipantId, value)` is the one-active-Moderator-vote guarantee.

If a Moderator changes from `8` to `13`, `round.voteCount` stays the same because the same actor still has one active vote.

If a Participant and Moderator both vote, `round.voteCount` should be `2` and `session.votes` should contain one key for the Participant id and one key for `session.moderatorParticipantId`.

The current `SessionSnapshot` is room-wide. Adding selected card values directly to it would leak hidden votes. Use `hasVoted` status only until a reveal/story-specific snapshot mapper is introduced.

### Cross-Story Intelligence

- Story 2.1 established Moderator command authorization and server-snapshot-driven Story/Deck updates. Moderator voting should reuse the same `moderatorToken` authority source.
- Story 2.2 established `StartRoundCommandSchema`, `startRound`, `useSessionSocket.startRound`, and the ack-before-broadcast Socket.IO pattern. Keep the same flow for `vote:submit`.
- Story 2.2 deliberately resets all `hasVoted` flags, including the Moderator's entry, and clears `votes` on round start. Moderator voting should build on that clean slate.
- Story 2.3 established `vote:submit`, `submitVote`, `useSessionSocket.submitVote`, active deck validation, single-vote replacement, room-wide `hasVoted` status, and hidden-card-free snapshots. Story 2.4 should extend this path instead of creating a second event.
- Story 2.3 review patched stale local selected vote state after a server reset. Mirror that learning in Moderator UI: if server snapshot shows the Moderator `hasVoted: false`, clear local selected/status state.
- Story 2.5 will enforce pre-reveal privacy across all snapshots. Keep this story's snapshot changes minimal and status-only.

### Git Intelligence

- Recent commits:
  - `d4307df feat: implement participant vote submission and change functionality`
  - `645d5fd feat: implement start round functionality for moderator`
  - `0644c8b docs: add BMAD story 2.2 context`
  - `3ab2120 Improve ADR buddy validation and workflow handling`
  - `55f84d5 Refocus scaffold docs on local Node runtime`
- Commit `d4307df` changed `server/domain/session-commands.ts`, `server/socket/register-session-handlers.ts`, `src/features/session/ParticipantSessionView.tsx`, `src/features/session/useSessionSocket.ts`, shared schemas/contracts, styles, unit/component tests, and e2e tests. Story 2.4 should follow the same vertical-slice scope.
- Current repo status was clean before creating this story file.

### Latest Technical Notes Checked On 2026-07-03

- Socket.IO 4.x official docs still support acknowledgement callbacks and `socket.timeout(ms).emit(...)`; keep the existing 5 second ack timeout pattern. Source: https://socket.io/docs/v4/emitting-events/
- Socket.IO 4.x rooms still support `socket.join(room)` and `io.to(room).emit(...)`; accepted vote snapshots should remain room-scoped. Source: https://socket.io/docs/v4/rooms/
- Zod 4 is the active Zod version family, and strict object schemas/unions remain appropriate for command validation. Source: https://zod.dev/api
- React DOM button semantics remain the correct baseline for keyboard-operable card controls; use native buttons or radio-style inputs rather than custom non-interactive elements. Source: https://react.dev/reference/react-dom/components/button
- The repo already pins compatible current major versions in `package.json`: Socket.IO 4.x, Zod 4.x, React 19, Vite 8, Express 5. No dependency upgrade is required for this story.

### Project Structure Notes

Expected update locations:

```text
src/shared/contracts/
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
  ParticipantSessionView.test.tsx (only if shared card UI changes)
  useSessionSocket.ts
  useSessionSocket.test.tsx
src/features/cards/
  VoteCardGrid.tsx (optional, only if extracting shared presentation)
tests/e2e/
  create-session.spec.ts or voting-round.spec.ts
```

Keep unit/component tests co-located and browser tests under `tests/e2e`.

Avoid new top-level folders and duplicate command/snapshot definitions.

### References

- `_bmad-output/planning-artifacts/epics.md#story-24-moderator-votes-in-the-round`
- `_bmad-output/planning-artifacts/epics.md#story-23-participants-submit-and-change-hidden-votes`
- `_bmad-output/planning-artifacts/epics.md#story-25-enforce-pre-reveal-vote-privacy`
- `_bmad-output/planning-artifacts/prds/prd-adr-buddy-2026-06-16/prd.md#44-hidden-voting`
- `_bmad-output/planning-artifacts/architecture.md#api--communication-patterns`
- `_bmad-output/planning-artifacts/architecture.md#frontend-architecture`
- `_bmad-output/implementation-artifacts/2-3-participants-submit-and-change-hidden-votes.md`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `cmd.exe /c npm run test -- src/shared/schemas/command-schemas.test.ts` failed before schema implementation, then passed after adding the strict Moderator branch.
- `cmd.exe /c npm run test -- server/domain/session-commands.test.ts` failed before Moderator actor resolution, then passed after splitting Participant/Moderator vote authorization.
- `cmd.exe /c npm run test -- src/features/session/ModeratorSessionView.test.tsx` failed before Moderator vote controls existed, then passed after wiring server-acknowledged card selection.
- `cmd.exe /c npm run lint` initially failed on synchronous state reset effects; replaced them with derived display state and timestamp-aware snapshot precedence.
- Final validation passed: `cmd.exe /c npm run typecheck`, `cmd.exe /c npm run test`, `cmd.exe /c npm run build`, `cmd.exe /c npm run lint`, `cmd.exe /c npm run test:e2e`.

### Completion Notes List

- Added strict Participant/Moderator vote command union while preserving `vote:submit` and the Participant payload shape.
- Extended `submitVote` to authorize Moderator votes using only `session.moderatorToken`, store them under `session.moderatorParticipantId`, update only Moderator `hasVoted`, and recompute `voteCount` from `votes.size`.
- Kept snapshots status-only before reveal; no selected-card, result, token, or vote-store fields were added to room-wide snapshots.
- Added Moderator vote cards in active unrevealed rounds with pending, submitted, changed, disabled, and error states driven by server acknowledgements/snapshots.
- Kept Participant voting behavior passing and tightened accepted-ack versus later snapshot precedence for both session views.
- Extended schema, domain, socket, component, and Playwright coverage for Moderator voting.

### File List

- `_bmad-output/implementation-artifacts/2-4-moderator-votes-in-the-round.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `server/domain/session-commands.ts`
- `server/domain/session-commands.test.ts`
- `server/socket/register-session-handlers.test.ts`
- `src/features/session/ModeratorSessionView.tsx`
- `src/features/session/ModeratorSessionView.test.tsx`
- `src/features/session/ParticipantSessionView.tsx`
- `src/shared/schemas/command-schemas.ts`
- `src/shared/schemas/command-schemas.test.ts`
- `tests/e2e/create-session.spec.ts`

### Change Log

- 2026-07-03: Implemented Moderator voting through shared schema, domain command, existing Socket.IO vote path, Moderator UI, and automated coverage.
- 2026-07-03: Validated with typecheck, full Vitest suite, production build, lint, and Playwright e2e.
