---
baseline_commit: 645d5fdc4709a8a0b88cbd84b646a367d7272136
---

# Story 2.3: Participants Submit And Change Hidden Votes

Status: done

Completion Note: Ultimate context engine analysis completed - comprehensive developer guide created.

## Story

As a Participant,
I want to select one Card from the active Deck and change it before reveal,
so that I can submit my estimate privately and recover from misclicks while voting is open.

## Acceptance Criteria

1. Given a Round is active, when a Participant selects a Card from the active Deck, then the server records that Card as the Participant's one active Vote for the Round, and the Participant receives confirmation through the next Session snapshot.
2. Given a Participant has already voted in the active Round, when they select a different Card before reveal, then the server replaces their prior Vote with the new Card, and only one active Vote remains for that Participant.
3. Given a Participant tries to submit a Card that is not in the active Deck, when the vote command is processed, then the server rejects the command with a stable validation error, and no Vote is recorded or changed.
4. Given no Round is active, when a Participant attempts to vote, then the server rejects the command with `ROUND_NOT_ACTIVE`, and the UI keeps Card selection disabled or unavailable.
5. Given a Participant has submitted a Vote before reveal, when Moderator or Participant snapshots are emitted, then other users may see that the Participant has voted, and no other user sees the selected Card value before reveal.
6. Given a Round is active and Participants submit Votes, when the Moderator receives updated snapshots, then the presence list shows which Participants have submitted a Vote, and it does not show selected Card values before reveal.
7. Given the Card grid is displayed, when the Participant uses keyboard navigation and readable labels, then each Card can be reached and selected without a mouse, and the selected state is clear without relying on color alone.

## Tasks / Subtasks

- [x] Add participant vote command contracts. (AC: 1-4)
  - [x] Extend `SubmitVoteCommandSchema` in `src/shared/schemas/command-schemas.ts` to include `participantId`, `participantToken`, and `value`; preserve `roomCode` validation and strict schemas.
  - [x] Update `src/shared/contracts/socket-events.ts` so `vote:submit` uses the shared `SubmitVoteCommand` type and acknowledges with `SessionSnapshot`.
  - [x] Keep `ROUND_NOT_ACTIVE`, `VOTE_LOCKED`, `UNAUTHORIZED`, and `VALIDATION_FAILED` as stable errors; add a new code only if the existing set cannot express invalid deck value cleanly.
  - [x] Add schema/contract tests for valid vote payloads, missing token, invalid room code, and out-of-deck vote value rejection at the correct layer.
- [x] Implement server-authoritative participant vote submission. (AC: 1-6)
  - [x] Add `submitVote` to `server/domain/session-commands.ts`.
  - [x] Return `INVALID_ROOM_CODE` for missing sessions.
  - [x] Return `UNAUTHORIZED` when `participantId` is unknown, role is not participant, or the supplied `participantToken` does not match `session.participantTokens`.
  - [x] Return `ROUND_NOT_ACTIVE` when `session.snapshot.round.active` is false.
  - [x] Return `VOTE_LOCKED` when `session.snapshot.round.revealed` is true.
  - [x] Reject values not included in `session.snapshot.deck.values` with a stable validation failure or dedicated invalid-vote error; do not mutate session state on failure.
  - [x] On success, set `session.votes.set(participantId, value)`, set only that participant's `hasVoted` to `true`, recompute `round.voteCount` from unique submitted voters, and update `updatedAt`.
  - [x] Preserve single active vote semantics by replacing the existing map value for that participant instead of appending votes.
- [x] Keep pre-reveal snapshots sanitized while allowing own-vote confirmation. (AC: 1, 5, 6)
  - [x] Decide and document the minimal participant own-vote field needed for confirmation, for example `viewerVote: string | null` or `ownVote: string | null`.
  - [x] If adding own-vote state to `SessionSnapshot`, ensure only the voting participant receives their own selected value; other participants and the moderator must not receive it before reveal.
  - [x] If using the existing shared snapshot for all users in this story, confirmation may be limited to `hasVoted: true`; selected value disclosure must wait for Story 2.5 or a role-aware snapshot mapper.
  - [x] Do not add grouped counts, result distributions, or other users' selected card values before reveal.
  - [x] Do not log participant tokens or hidden vote values.
- [x] Wire `vote:submit` through Socket.IO. (AC: 1-6)
  - [x] Register `CLIENT_EVENTS.voteSubmit` in `server/socket/register-session-handlers.ts`.
  - [x] Validate with `SubmitVoteCommandSchema`, delegate to the domain layer, return stable failure acks, and broadcast only accepted sanitized snapshots to `io.to(roomCode)`.
  - [x] Keep the handler thin; do not mutate votes, participants, or snapshots in the socket layer.
  - [x] Preserve the existing ack-before-broadcast ordering from Story 2.2.
- [x] Extend the socket client helper. (AC: 1, 2, 4)
  - [x] Add `submitVote(command: SubmitVoteCommand)` to `src/features/session/useSessionSocket.ts`.
  - [x] Validate successful acknowledgements with `SessionSnapshotAckSchema` and apply the accepted snapshot to `latestSnapshot`.
  - [x] Preserve the existing 5 second Socket.IO timeout behavior and connection-unavailable fallback.
- [x] Add participant Card selection UI. (AC: 1, 2, 4, 7)
  - [x] Update `src/features/session/ParticipantSessionView.tsx` to render each active deck value as a real button or radio-style control when voting is open.
  - [x] Read the participant token with `readParticipantToken(roomCode, participantId)`; never expose it in UI, route state, logs, local storage, or snapshots.
  - [x] Disable or hide voting controls when no round is active, when results are revealed, when no participant token exists, or while a vote command is pending.
  - [x] Show pending, submitted, changed, and readable error states derived from the server ack/snapshot; do not optimistically mark another participant as voted.
  - [x] Ensure keyboard users can reach and select every card and that selected/submitted state is not conveyed by color alone.
- [x] Preserve Moderator visibility rules. (AC: 5, 6)
  - [x] Keep `src/features/session/ModeratorSessionView.tsx` limited to participant display names and `hasVoted` status before reveal.
  - [x] Do not add selected card values, grouped counts, or result controls in this story.
  - [x] Verify the moderator presence list updates to `Voted` after a participant submits and stays token-free.
- [x] Add focused automated coverage. (AC: 1-7)
  - [x] Add domain tests for successful first vote, changed vote replacement, invalid deck value, inactive round, revealed round, unauthorized token, invalid room, unchanged failure state, voteCount recomputation, and no hidden values in snapshots.
  - [x] Add socket handler tests proving valid `vote:submit` acks and broadcasts, while invalid/unauthorized/locked commands return stable errors without mutation.
  - [x] Add `useSessionSocket` tests for `submitVote` success, ack validation failure, timeout/connection failure, and latest snapshot update.
  - [x] Add Participant component tests for card rendering, disabled states, pending state, changed selection, keyboard-accessible controls, and readable errors.
  - [x] Add Moderator component coverage for participant `Voted` status without card value leakage.
  - [x] Extend Playwright coverage in `tests/e2e/create-session.spec.ts` or add `tests/e2e/voting-round.spec.ts` for a moderator-started round, participant voting, participant changing vote, moderator seeing only `Voted`, and no selected card value visible in the moderator browser before reveal.
- [x] Verify the story end to end. (AC: 1-7)
  - [x] Run `cmd.exe /c npm run typecheck`.
  - [x] Run `cmd.exe /c npm run test`.
  - [x] Run `cmd.exe /c npm run build`.
  - [x] Run `cmd.exe /c npm run lint`.
  - [x] Run `cmd.exe /c npm run test:e2e` after browser coverage is updated.

### Review Findings

- [x] [Review][Patch] Clear stale local vote selection when server state resets the participant vote [src/features/session/ParticipantSessionView.tsx:100]

## Dev Notes

### Current Repository State

- Story 2.2 is complete and implemented the moderator start-round path end to end.
- `src/shared/schemas/command-schemas.ts` already has `SubmitVoteCommandSchema`, but it currently accepts only `{ roomCode, value }`; it is not safe for participant-owned voting because it lacks `participantId` and `participantToken`.
- `src/shared/contracts/socket-events.ts` already declares `CLIENT_EVENTS.voteSubmit` and `vote:submit`, but the payload is still an inline `{ roomCode: string; value: string }`.
- `server/domain/session-store.ts` already stores `votes: Map<string, string>`, keyed by participant id in prior tests. Use this instead of creating a second vote store.
- `server/domain/session-commands.ts` currently implements `createSession`, `joinSession`, `updateStory`, `selectDeck`, `startRound`, and participant removal. Vote submission belongs here.
- `server/socket/register-session-handlers.ts` has no `vote:submit` handler yet. Add one following the existing validate/delegate/ack/broadcast pattern.
- `src/features/session/useSessionSocket.ts` has helpers for create, join, story update, deck select, and start round. Add `submitVote` there; do not create a separate socket abstraction.
- `src/features/session/ParticipantSessionView.tsx` currently shows deck options as a read-only list and displays `Your vote` as `Submitted` or `Not submitted` based on `participant.hasVoted`. It has no command UI.
- `src/features/session/ModeratorSessionView.tsx` already renders participant `Voted` or `Not voted` status. It must continue to avoid selected-card values before reveal.

### Story Scope Boundaries

- In scope: participant vote command schema, participant token authorization, deck-value validation, active-round/locked-round guards, single-vote replacement, `hasVoted` and `voteCount` updates, participant card UI, moderator vote-status update, and tests.
- Out of scope: moderator voting, reveal results, round reset, final estimate capture, grouped results, estimated story history, reconnect recovery, persistence, Redis, authentication, analytics, exports, and backlog integrations.
- Do not introduce REST endpoints for voting. Live session behavior remains Socket.IO command based.
- Do not add durable storage or database migrations. Votes remain live, in-memory state for v1.
- Do not expose hidden selected cards to the moderator or other participants before reveal. This story is the first privacy-sensitive vote write path and must not create cleanup work for Story 2.5.

### Architecture Compliance

- Socket.IO is the authoritative live Session API; `vote:submit` must be a command event with a typed acknowledgement and sanitized `session:snapshot` broadcast. [Source: `_bmad-output/planning-artifacts/architecture.md#api--communication-patterns`]
- Socket handlers validate payloads, authorize, delegate to the domain layer, return acks, and emit snapshots only. Authoritative state mutation stays in `server/domain`. [Source: `_bmad-output/planning-artifacts/architecture.md#api--communication-patterns`]
- Participant vote updates require the valid Participant capability token. Room code and route state are not authority. [Source: `_bmad-output/planning-artifacts/architecture.md#authentication--security`]
- Frontend state is server-snapshot-driven. Vote controls may show a pending state, but accepted vote state must come from the server acknowledgement/snapshot. [Source: `_bmad-output/planning-artifacts/architecture.md#frontend-architecture`]
- Hidden Vote values must not be included in public snapshots or logs before reveal. [Source: `_bmad-output/planning-artifacts/architecture.md#format-patterns`]
- Cards must be real buttons or radio-style controls with readable labels and keyboard support. [Source: `_bmad-output/planning-artifacts/architecture.md#frontend-architecture`]

### Existing Files To Update Carefully

- `src/shared/schemas/command-schemas.ts`
  - Current state: `SubmitVoteCommandSchema` has only `roomCode` and `value`.
  - Change needed: add `participantId` and `participantToken`, reuse token constraints from moderator commands, and keep value constrained enough for current deck values.
  - Preserve: strict schema style, `RoomCodeSchema`, exported inferred command type.
- `src/shared/contracts/socket-events.ts`
  - Current state: `vote:submit` payload is inline and under-specified.
  - Change needed: import and use `SubmitVoteCommand`; keep ack as `SessionSnapshot`.
  - Preserve: stable event name `vote:submit`.
- `src/shared/contracts/snapshots.ts` and `src/shared/schemas/session-schemas.ts`
  - Current state: participant entries include `hasVoted`; no selected card value exists in snapshots.
  - Change needed: only add own-vote fields if the implementation can keep them viewer-specific. A single room-wide snapshot object cannot safely contain one participant's selected card and be broadcast to all clients before reveal.
  - Preserve: token-free, hidden-card-free public snapshot shape before reveal.
- `server/domain/session-store.ts`
  - Current state: `votes: Map<string, string>` exists; Story 2.2 clears it on round start.
  - Change needed: no structural change required unless the team chooses to type card values more narrowly.
  - Preserve: in-memory store abstraction and `SessionState` as the single authoritative vote state boundary.
- `server/domain/session-commands.ts`
  - Current state: `startRound` sets `round.active = true`, `round.revealed = false`, clears votes, and resets `hasVoted`.
  - Change needed: add `submitVote` with failure-order guards and success-only mutation.
  - Preserve: `createSession`, `joinSession`, story/deck lock behavior, and start-round behavior.
- `server/socket/register-session-handlers.ts`
  - Current state: create/join and moderator commands are registered; no vote handler exists.
  - Change needed: add `vote:submit` handler using the same stable ack and room broadcast conventions.
  - Preserve: rate limiting for create/join, ack-before-broadcast ordering, room-scoped snapshot emit.
- `src/features/session/useSessionSocket.ts`
  - Current state: `emitValidatedCommand` centralizes timeout, ack validation, and latest snapshot updates.
  - Change needed: add `submitVote` through that helper.
  - Preserve: `ACK_TIMEOUT_MS`, single provider, no optimistic authoritative mutation.
- `src/features/session/ParticipantSessionView.tsx`
  - Current state: route state supplies `participantId`; token can be read via session storage helper.
  - Change needed: render selectable deck cards during active unrevealed rounds and submit the vote command.
  - Preserve: missing-session guard, participant-only controls, no moderator affordances.
- `src/features/session/ModeratorSessionView.tsx`
  - Current state: presence list already reads `participant.hasVoted`.
  - Change needed: minimal if snapshots update `hasVoted`; add tests only unless UI copy needs polish.
  - Preserve: no hidden values or result summaries.

### Files Expected To Remain Unchanged Unless A Defect Is Found

- `src/shared/domain/decks.ts`: deck definitions already satisfy Story 2.3.
- `src/features/session/session-storage.ts`: participant token helpers already use `sessionStorage`; reuse `readParticipantToken`.
- `server/security/capability-tokens.ts`: token generation exists; this story validates stored participant tokens.
- `src/features/results/*`: results and final estimate UI belong to Epic 3.
- `server/domain/result-aggregation.ts`: grouped results are out of scope until reveal/result stories.

### Implementation Guidance

- Preferred command shape:

```ts
type SubmitVoteCommand = {
  roomCode: string
  participantId: string
  participantToken: string
  value: string
}
```

- Conservative domain guard order:

```text
1. Missing room -> INVALID_ROOM_CODE
2. Unknown participant or bad token -> UNAUTHORIZED
3. No active round -> ROUND_NOT_ACTIVE
4. Revealed round -> VOTE_LOCKED
5. Value outside active deck -> VALIDATION_FAILED or a dedicated invalid-vote error
6. Success -> replace vote, set hasVoted, recompute voteCount, update updatedAt
```

- Success mutation should be equivalent to:

```ts
const votes = new Map(session.votes)
votes.set(command.participantId, command.value)

const snapshot = {
  ...session.snapshot,
  participants: session.snapshot.participants.map((participant) =>
    participant.id === command.participantId
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

- Do not set `hasVoted` by display name; duplicate display names are allowed.
- Do not use array append semantics for votes; the `Map` replacement is the one-active-vote guarantee.
- If a changed vote replaces `3` with `5`, `round.voteCount` stays the same because the same participant has one active vote.
- If invalid commands fail, assert `session.votes`, `participants`, `round`, and `updatedAt` remain unchanged.
- A participant joining during an active round remains `hasVoted: false` and can vote with their own token.
- Current `SessionSnapshot` is broadcast room-wide. Adding selected card values directly to it would leak hidden votes. Use `hasVoted` for room-wide state unless a role-aware/viewer-aware snapshot mapper is introduced.

### Cross-Story Intelligence

- Story 2.1 established moderator command authorization and server-snapshot-driven story/deck updates.
- Story 2.2 added `StartRoundCommandSchema`, `startRound`, `useSessionSocket.startRound`, and the ack-before-broadcast socket pattern. Reuse that pattern for `vote:submit`.
- Story 2.2 deliberately resets `votes` and every participant `hasVoted` to `false` on round start. Story 2.3 should build on that clean slate and set `hasVoted` only after accepted vote commands.
- Story 1.3 established participant token storage in `sessionStorage` via `saveParticipantToken` and `readParticipantToken`.
- Story 1.4 established Moderator presence as display name plus voting status only; this story should update status without leaking card values.
- Story 2.5 will harden pre-reveal privacy. Story 2.3 must avoid introducing selected-card leakage that Story 2.5 would need to undo.

### Git Intelligence

- Recent commits:
  - `645d5fd feat: implement start round functionality for moderator`
  - `0644c8b docs: add BMAD story 2.2 context`
  - `3ab2120 Improve ADR buddy validation and workflow handling`
  - `55f84d5 Refocus scaffold docs on local Node runtime`
  - `5b18d42 Add participant presence to moderator session view`
- Current repo status was clean before creating this story file.
- The latest feature slice changed shared schemas/contracts, domain commands, socket handlers, socket hook, React views, component tests, and Playwright tests together. Story 2.3 should follow the same vertical-slice approach.

### Latest Technical Notes Checked On 2026-07-03

- Socket.IO 4.x official docs still support acknowledgements and per-emit timeouts; keep the existing `socket.timeout(ACK_TIMEOUT_MS).emit(...)` client pattern. Source: https://socket.io/docs/v4/emitting-events/
- Socket.IO 4.x room docs still support `socket.join(room)` and `io.to(room).emit(...)`; keep accepted vote snapshots room-scoped. Source: https://socket.io/docs/v4/rooms/
- Zod 4 remains the active schema API family; extend existing Zod schemas rather than introducing another validator. Source: https://zod.dev/api
- React form controls and buttons remain standard DOM-backed controls; implement card choices with native keyboard-operable controls and accessible labels rather than custom non-button elements. Source: https://react.dev/reference/react-dom/components/input
- The repo already pins current major versions in `package.json` (`socket.io` 4.x, `zod` 4.x, React 19, Vite 8). No dependency upgrade is required for this story.

### Project Structure Notes

- Expected update locations:

```text
src/shared/contracts/
  errors.ts
  socket-events.ts
  snapshots.ts
src/shared/schemas/
  command-schemas.ts
  command-schemas.test.ts
  session-schemas.ts
  session-schemas.test.ts
server/domain/
  session-commands.ts
  session-commands.test.ts
server/socket/
  register-session-handlers.ts
  register-session-handlers.test.ts
src/features/session/
  ParticipantSessionView.tsx
  ParticipantSessionView.test.tsx
  ModeratorSessionView.test.tsx
  useSessionSocket.ts
  useSessionSocket.test.tsx
tests/e2e/
  create-session.spec.ts or voting-round.spec.ts
```

- Keep unit/component tests co-located and browser tests under `tests/e2e`.
- Avoid new top-level folders and duplicate command/snapshot definitions.

### References

- `_bmad-output/planning-artifacts/epics.md#story-23-participants-submit-and-change-hidden-votes`
- `_bmad-output/planning-artifacts/epics.md#story-25-enforce-pre-reveal-vote-privacy`
- `_bmad-output/planning-artifacts/prds/prd-adr-buddy-2026-06-16/prd.md#fr-9-submit-vote`
- `_bmad-output/planning-artifacts/prds/prd-adr-buddy-2026-06-16/prd.md#fr-11-hidden-votes-before-reveal`
- `_bmad-output/planning-artifacts/architecture.md#authentication--security`
- `_bmad-output/planning-artifacts/architecture.md#api--communication-patterns`
- `_bmad-output/planning-artifacts/architecture.md#frontend-architecture`
- `_bmad-output/planning-artifacts/architecture.md#project-structure--boundaries`
- `_bmad-output/implementation-artifacts/2-2-moderator-starts-a-voting-round.md`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-07-03: `bmad-create-story` workflow customization resolved with no prepend/append activation steps and persistent project-context glob returned no files.
- 2026-07-03: Loaded sprint status, epics, architecture, Story 2.2 context, current source files, package metadata, git history, and official Socket.IO/Zod/React documentation.
- 2026-07-03: `cmd.exe /c npm run test -- src/shared/schemas/command-schemas.test.ts` failed red phase on missing `participantId` and `participantToken`; passed after schema update.
- 2026-07-03: `cmd.exe /c npm run test -- server/domain/session-commands.test.ts` failed red phase on missing `submitVote`; passed after domain implementation.
- 2026-07-03: `cmd.exe /c npm run test -- server/socket/register-session-handlers.test.ts` failed red phase on missing vote handler; passed after Socket.IO wiring.
- 2026-07-03: `cmd.exe /c npm run test -- src/features/session/useSessionSocket.test.tsx` failed red phase on missing client `submitVote`; passed after hook update.
- 2026-07-03: `cmd.exe /c npm run test -- src/features/session/ParticipantSessionView.test.tsx` failed red phase on read-only deck list; passed after participant voting UI.
- 2026-07-03: Validation passed: `cmd.exe /c npm run typecheck`, `cmd.exe /c npm run test`, `cmd.exe /c npm run build`, `cmd.exe /c npm run lint`, and `cmd.exe /c npm run test:e2e`.

### Completion Notes List

- Story context created for Story 2.3 with implementation guardrails, previous-story intelligence, architecture compliance notes, local file analysis, and latest official-doc checks.
- Sprint status updated from `backlog` to `ready-for-dev`.
- Implemented strict participant vote command contracts with `participantId`, `participantToken`, and value fields, reusing stable error codes and shared socket event types.
- Added server-authoritative `submitVote` with participant token authorization, active/revealed round guards, active deck validation, single-vote replacement, `hasVoted`, `voteCount`, and success-only mutation.
- Chose not to add own-vote value fields to shared `SessionSnapshot`; participant confirmation remains `hasVoted` plus local ack UI state so public room snapshots stay hidden-card-free before reveal.
- Wired `vote:submit` through Socket.IO with schema validation, domain delegation, stable failure acknowledgements, ack-before-broadcast ordering, and sanitized room broadcasts.
- Added `useSessionSocket.submitVote` and participant card buttons with disabled, pending, submitted, changed, selected, and readable error states while keeping participant tokens out of UI and route state.
- Preserved moderator pre-reveal visibility as participant display name plus `Voted` status only; no selected card values, grouped counts, or result controls were added.
- Added unit, socket, hook, component, and Playwright coverage for first vote, changed vote, invalid values, inactive/revealed rounds, unauthorized tokens, no-mutation failures, hidden-value snapshots, and keyboard-accessible card controls.

### File List

- `_bmad-output/implementation-artifacts/2-3-participants-submit-and-change-hidden-votes.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `server/domain/session-commands.test.ts`
- `server/domain/session-commands.ts`
- `server/socket/register-session-handlers.test.ts`
- `server/socket/register-session-handlers.ts`
- `src/app/styles.css`
- `src/features/session/ParticipantSessionView.test.tsx`
- `src/features/session/ParticipantSessionView.tsx`
- `src/features/session/useSessionSocket.test.tsx`
- `src/features/session/useSessionSocket.ts`
- `src/shared/contracts/socket-events.ts`
- `src/shared/schemas/command-schemas.test.ts`
- `src/shared/schemas/command-schemas.ts`
- `tests/e2e/create-session.spec.ts`

### Change Log

- 2026-07-03: Implemented Story 2.3 participant hidden vote submission and change-vote flow; status moved to review.
