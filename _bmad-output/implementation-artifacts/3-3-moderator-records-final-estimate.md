---
baseline_commit: dde150de9ac052c0361d65bf6123ea870a9cce9d
created_at: 2026-07-06T16:08:10+00:00
---

# Story 3.3: Moderator Records Final Estimate

Status: done

Completion Note: Ultimate context engine analysis completed - comprehensive developer guide created.

## Story

As a Moderator,
I want to select a Final Estimate from the active Deck after reveal,
so that the Session records the team's decision for the current Story.

## Acceptance Criteria

1. Given Results have been revealed for the current Round, when the Moderator selects a Final Estimate from the active Deck, then the server records that value as the current Story's Final Estimate, and the value is one of the active Deck Cards.
2. Given the Moderator attempts to enter or submit a custom Final Estimate, when the command is processed, then the server rejects the value with a stable validation error, and no Final Estimate is recorded or changed.
3. Given Results have not been revealed, when the Moderator attempts to record a Final Estimate, then the server rejects the command with a stable error code such as `RESULTS_NOT_REVEALED`, and the UI keeps Final Estimate controls disabled or unavailable.
4. Given a Participant attempts to record a Final Estimate, when the command is processed, then the server rejects the command with `UNAUTHORIZED`, and the Participant UI does not expose Final Estimate controls.
5. Given a Final Estimate is recorded for a Story that already exists in the Estimated Stories list, when the Moderator records a new Final Estimate for that same Story, then the server updates the existing Estimated Story entry, and it does not create a duplicate entry for the same Story.
6. Given a Final Estimate command is pending, when the Moderator view waits for acknowledgement, then the Final Estimate control shows a pending or disabled state, and the UI waits for the server snapshot before showing the estimate as recorded.

## Tasks / Subtasks

- [x] Complete the shared command and snapshot contract. (AC: 1-6)
  - [x] Add `RecordEstimateCommandSchema` in `src/shared/schemas/command-schemas.ts` with strict fields `{ roomCode, moderatorToken, value }`; `value` must be a trimmed non-empty string with the same practical max length as vote values.
  - [x] Export `RecordEstimateCommand` and wire it into `src/shared/contracts/socket-events.ts` for `CLIENT_EVENTS.estimateRecord`.
  - [x] Replace the current loose placeholder payload `{ roomCode: string; estimate: string }`; do not leave two competing estimate payload shapes.
  - [x] Add an `EstimatedStorySnapshot` type with `{ storyId, title, deck, finalEstimate }` or `{ story: { id, title }, deck, finalEstimate }`; use one camelCase shape consistently across TypeScript types, Zod schemas, mapper tests, and UI.
  - [x] Add a moderator-only `estimatedStories` field to `SessionSnapshot` only if the snapshot mapper can omit it for participant viewers. If strict schemas make optional moderator-only fields awkward, model `estimatedStories?: EstimatedStorySnapshot[]` and assert participant snapshots omit it.
  - [x] Add `resultsNotRevealed: 'RESULTS_NOT_REVEALED'` to `src/shared/contracts/errors.ts`; use existing `VALIDATION_FAILED` for invalid deck values unless a narrower estimate-specific code already exists by implementation time.
- [x] Implement server-domain final estimate recording. (AC: 1-5)
  - [x] Replace `SessionState.estimatedStories: []` in `server/domain/session-store.ts` with a typed array; do not create a second store, database, browser-only list, or module-global estimated-story cache.
  - [x] Add `recordEstimate(command, deps)` in `server/domain/session-commands.ts` following the existing `updateStory`, `startRound`, `revealRound`, and `submitVote` typed result pattern.
  - [x] Validate room existence, moderator token authorization, current story presence, active revealed round state, and active-deck membership before mutating state.
  - [x] Reject participant or missing moderator-token attempts with `UNAUTHORIZED`; the participant UI must never call this command, but the server must still enforce it.
  - [x] Reject pre-reveal attempts with `RESULTS_NOT_REVEALED`; if no active round exists, choose the most specific stable existing code only if tests document it.
  - [x] Record the current story id/title, current deck id/label/values, and selected final estimate.
  - [x] Upsert by current story id so re-recording the same story updates the existing entry instead of appending a duplicate.
  - [x] Update `updatedAt` using the injected `now()` dependency and preserve existing `participants`, `round`, `results`, votes, and hidden-vote protections.
- [x] Wire the socket handler without breaking sanitized snapshots. (AC: 1-6)
  - [x] Import `recordEstimate` and `RecordEstimateCommandSchema` into `server/socket/register-session-handlers.ts`.
  - [x] Register `CLIENT_EVENTS.estimateRecord` with `handleModeratorCommand`, validation failure text, and the same ack/snapshot flow as the other moderator commands.
  - [x] Update `toPreRevealSessionSnapshot` in `server/socket/snapshot-mapper.ts` so moderator viewers receive `estimatedStories` and participant viewers do not.
  - [x] Fix the current room broadcast issue for role-specific snapshots: `io.to(roomCode).emit(session:snapshot, snapshot)` sends one sanitized snapshot to every socket in the room. With moderator-only estimated stories, either emit per socket/viewer or broadcast only fields safe for all and send the moderator field separately to moderator sockets. Do not broadcast a moderator snapshot to participants.
  - [x] Keep post-reveal `results` visible to all joined users and keep `results` null before reveal.
- [x] Add the Moderator final-estimate UI. (AC: 1, 3, 5, 6)
  - [x] Extend `useSessionSocket.ts` with `recordEstimate(command)` using `CLIENT_EVENTS.estimateRecord`, `SessionSnapshotAckSchema`, `setLatestSnapshot`, and the existing 5 second ack timeout path.
  - [x] Add controls in `src/features/session/ModeratorSessionView.tsx` after revealed results. Reuse `sessionSnapshot.deck.values`; do not add a free-text final estimate input.
  - [x] Disable or hide controls unless `moderatorToken` exists, `sessionSnapshot.round.revealed` is true, `sessionSnapshot.story` exists, and no command is pending.
  - [x] Track a pending estimate value or pending boolean so the selected controls are disabled and labelled while waiting for acknowledgement.
  - [x] Wait for the successful server ack/snapshot before showing the estimate as recorded; do not optimistically append to a client-local estimated-story list.
  - [x] On command failure, map stable error codes to readable messages without exposing raw exceptions.
  - [x] Preserve existing story/deck editing, start round, reveal, moderator voting, grouped results, and participant presence behavior.
- [x] Keep Participant UI free of moderator-only controls and data. (AC: 4)
  - [x] Do not add final-estimate controls to `src/features/session/ParticipantSessionView.tsx`.
  - [x] Ensure participant snapshots cannot parse or render moderator-only `estimatedStories` if the field is present only for moderators.
  - [x] Preserve participant voting disabled state after reveal and current grouped-results rendering.
- [x] Prepare for Story 3.5 without overbuilding it. (AC: 1, 5)
  - [x] Store enough estimated-story data for the next story's live Moderator-only list: story identifier, brief description, deck, and final estimate.
  - [x] It is acceptable in this story to show only the current story's recorded estimate or a simple status; the full list UI belongs to Story 3.5 unless needed to prove the upsert.
  - [x] Do not add durable persistence. Estimated stories are live-session-only and may be lost on refresh/restart.
- [x] Add automated coverage. (AC: 1-6)
  - [x] Domain tests: records valid estimate after reveal, rejects invalid deck value, rejects pre-reveal with `RESULTS_NOT_REVEALED`, rejects unauthorized token, upserts same story, preserves previous estimated stories for different story ids.
  - [x] Socket tests: validates payload, handles `estimate:record`, acknowledges with a moderator-safe snapshot, and does not send `estimatedStories` to participant viewers.
  - [x] Snapshot mapper tests: moderator snapshot includes estimated stories; participant snapshot omits them; hidden votes remain absent before reveal.
  - [x] Schema tests: `RecordEstimateCommandSchema`, `SessionSnapshotSchema` with optional moderator-only estimated stories, invalid custom estimates, and strict rejection of extra fields.
  - [x] Moderator view tests: controls appear only after reveal, deck values are used as buttons, pending state disables controls, success waits for ack, and errors render by code.
  - [x] Participant view tests: no final-estimate controls and no estimated-story list.
  - [x] E2E coverage: moderator and participant complete a voting/reveal flow; moderator records a final estimate; participant never sees the control; custom/manual values cannot be submitted through exposed UI.
- [x] Run verification.
  - [x] `cmd.exe /c npm run typecheck`
  - [x] `cmd.exe /c npm run test`
  - [x] `cmd.exe /c npm run build`
  - [x] `cmd.exe /c npm run lint`
  - [x] `cmd.exe /c npm run test:e2e`

### Review Findings

- [x] [Review][Patch] Moderator command acknowledgements can expose moderator-only estimated stories to sockets without a matching room identity [server/socket/register-session-handlers.ts:373]
- [x] [Review][Patch] Participant-shaped or missing-token estimate attempts return validation errors instead of `UNAUTHORIZED` [server/socket/register-session-handlers.ts:353]

## Dev Notes

### Current Repository State

- Sprint status selected `3-3-moderator-records-final-estimate` as the first backlog story on 2026-07-06.
- The working tree is already dirty with changes from Story 3.2 and grouped results, including `src/features/results/*`, `ModeratorSessionView.tsx`, `ParticipantSessionView.tsx`, CSS, tests, and `sprint-status.yaml`. Treat those as current project state; do not revert them.
- Story 3.2 is marked `done` in `sprint-status.yaml` and its story file includes implementation notes. The source currently imports `VoteGroupList` in both session views and renders grouped results after reveal.
- `package.json` currently uses React `^19.2.6`, React Router `^7.18.0`, Socket.IO server/client `^4.8.x`, Zod `^4.1.13`, Vite `^8.0.12`, Vitest `^4.0.16`, TypeScript `~6.0.2`, and Node `^20.19.0 || >=22.12.0`.
- No `project-context.md` file was found under the project root during activation.

### Story Requirements Source

- Epic 3 goal: reveal vote distribution, read consensus/outliers, record a Final Estimate, reset or advance flow, and maintain a Moderator-only live list of Estimated Stories. [Source: `_bmad-output/planning-artifacts/epics.md#epic-3-reveal-results-and-capture-estimates`]
- Story 3.3 acceptance requires Moderator-only final estimate selection from the active deck after reveal, stable rejection of custom values, pre-reveal rejection, participant rejection, upsert by story, and pending UI state. [Source: `_bmad-output/planning-artifacts/epics.md#story-33-moderator-records-final-estimate`]
- PRD FR-14 requires final estimates to be chosen from the active deck only and added or updated in the Estimated Stories list. [Source: `_bmad-output/planning-artifacts/prds/prd-poker-planning-bmad-2026-06-16/prd.md#fr-14-record-final-estimate`]
- PRD FR-15 says each Estimated Story includes story identifier, brief description, deck, and final estimate, is Moderator-only, and does not need to survive refresh or reopening. [Source: `_bmad-output/planning-artifacts/prds/prd-poker-planning-bmad-2026-06-16/prd.md#fr-15-show-estimated-stories-list`]

### Previous Story Intelligence

- Story 3.1 introduced the explicit post-reveal `results: RevealedResultsSnapshot | null` contract. Before reveal, `results` must remain `null`; after reveal, `results.votes` contains only submitted votes.
- Story 3.2 added deterministic grouped result UI under `src/features/results` and replaced flat result rendering in Moderator and Participant views. Final estimate controls should sit beside/after these revealed results, not replace them.
- Story 3.2 preserved non-voters in the participant list instead of assigning fake card groups. Keep that behavior when recording an estimate.
- Previous notes warned that `io.to(roomCode).emit(...)` sends the same payload to the full room. Story 3.3 makes this more important because `estimatedStories` is Moderator-only.

### Existing Files To Update Carefully

- `server/domain/session-store.ts`
  - Current state: `SessionState` stores `snapshot`, `votes`, and an untyped `estimatedStories: []` placeholder.
  - Change needed: introduce a real typed estimated-story array on `SessionState`.
  - Preserve: in-memory-only session storage; no database, ORM, migrations, Redis, or durable persistence.
- `server/domain/session-commands.ts`
  - Current state: domain functions return typed success/failure results; `startRound` clears votes/results; `revealRound` builds flat `results.votes`; `submitVote` validates active deck membership.
  - Change needed: add `recordEstimate` using the same result style and deck membership validation.
  - Preserve: server-authoritative state, injected `now()`, stable error codes, hidden vote privacy, and existing command behavior.
- `server/socket/register-session-handlers.ts`
  - Current state: handlers validate with Zod, call domain commands, ack success/failure, then emit `session:snapshot`. `estimate:record` is declared in shared constants but no handler is registered.
  - Change needed: register the estimate handler and update snapshot emission so participant sockets do not receive moderator-only estimated stories.
  - Preserve: acknowledgement callbacks, `createFailureAck`/`createSuccessAck`, rate limiting for create/join, and thin handler boundaries.
- `server/socket/snapshot-mapper.ts`
  - Current state: sanitizes token-free snapshots, keeps `results` null before reveal, maps results after reveal, ignores viewer role today.
  - Change needed: use `viewer.role` to include `estimatedStories` only for moderator viewers.
  - Preserve: no capability tokens, no hidden vote values before reveal, no grouped counts before reveal.
- `src/shared/contracts/snapshots.ts`
  - Current state: snapshot contains room, deck, story, participants, round, results, and updatedAt.
  - Change needed: add estimated story contract in a way strict schemas can validate.
  - Preserve: no selected card values inside `ParticipantSnapshot`.
- `src/shared/schemas/command-schemas.ts`
  - Current state: create/join/story/deck/start/reveal/vote command schemas are strict; vote value is string max 40.
  - Change needed: add a strict `RecordEstimateCommandSchema` with moderator token.
  - Preserve: strict validation and token regex pattern.
- `src/shared/schemas/session-schemas.ts`
  - Current state: strict snapshot schema requires `results` after reveal and forbids it before reveal.
  - Change needed: add estimated story schema and ensure strict parsing does not reject valid moderator snapshots.
  - Preserve: pre/post reveal result invariants via `superRefine`.
- `src/features/session/useSessionSocket.ts`
  - Current state: exposes create, join, update story, select deck, start, reveal, and submit vote. Uses Socket.IO timeout acknowledgements and validates ack data through Zod.
  - Change needed: expose `recordEstimate`.
  - Preserve: no optimistic authoritative updates; call `setLatestSnapshot` only after a valid success ack.
- `src/features/session/ModeratorSessionView.tsx`
  - Current state: owns story/deck form, moderator vote buttons, reveal button, grouped results, and participant presence. Multiple command pending flags already exist.
  - Change needed: add final-estimate controls after reveal with pending and error state.
  - Preserve: existing controls, disabled behavior, grouped results, long-text safety, and current quiet work-tool UI style.
- `src/features/session/ParticipantSessionView.tsx`
  - Current state: participant can submit/change vote while active and not revealed; grouped results render after reveal.
  - Change needed: likely no direct change except tests guarding absence of final-estimate UI.
  - Preserve: no moderator controls.
- `tests/e2e/create-session.spec.ts`
  - Current state: has multi-context session coverage from earlier stories.
  - Change needed: extend or add a focused flow for final estimate recording.
  - Preserve: existing create/join/vote/reveal assertions.

### Architecture Compliance

- Live behavior remains Socket.IO command based; do not add REST endpoints for estimate recording. [Source: `_bmad-output/planning-artifacts/architecture.md#api--communication-patterns`]
- Event names are already defined for `estimate:record`; use that event instead of inventing a new one. [Source: `_bmad-output/planning-artifacts/architecture.md#core-events`]
- Socket handlers must validate, authorize, call domain logic, and emit snapshots; they must not mutate session state directly. [Source: `_bmad-output/planning-artifacts/architecture.md#communication-patterns`]
- Final Estimate and live history map to `src/features/results/EstimatedStoriesList.tsx` and `server/domain/session-commands.ts`. [Source: `_bmad-output/planning-artifacts/architecture.md#requirements-to-structure-mapping`]
- Moderator-only data may appear in Moderator snapshots but must stay out of Participant snapshots. [Source: `_bmad-output/planning-artifacts/architecture.md#api--communication-patterns`]
- Do not introduce database storage, Redis, GraphQL, tRPC, OpenAPI, AsyncAPI, Redux, Zustand, Tailwind, charting packages, analytics, export, or account auth for this story. [Source: `_bmad-output/planning-artifacts/architecture.md#technology-decisions`]

### Latest Technical Context

- Socket.IO 4.x supports acknowledgements and `socket.timeout(ms).emit(...)`; keep the existing ack timeout path for `estimate:record` instead of adding polling or fire-and-forget commands. [Source: `https://socket.io/docs/v4/emitting-events/`]
- Socket.IO rooms are server-side channels, and `io.to(room).emit(...)` broadcasts the same event payload to matching sockets. Role-specific snapshot data therefore requires per-viewer emission or a room-safe payload. [Source: `https://socket.io/docs/v4/rooms/`]
- Zod 4 supports `safeParse` and `superRefine`; continue using strict schemas plus cross-field snapshot invariants rather than accepting loose estimate payloads. [Source: `https://zod.dev/api`]
- React 19 `useTransition` can provide pending visual state for non-blocking updates, but this codebase already uses explicit pending booleans for socket commands. Prefer the existing local pending-state pattern unless refactoring all command UI together. [Source: `https://react.dev/reference/react/useTransition`]

## Testing

Expected verification commands:

```sh
cmd.exe /c npm run typecheck
cmd.exe /c npm run test
cmd.exe /c npm run build
cmd.exe /c npm run lint
cmd.exe /c npm run test:e2e
```

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `cmd.exe /c npm run test -- src/shared/schemas/command-schemas.test.ts src/shared/schemas/session-schemas.test.ts server/domain/session-commands.test.ts server/socket/snapshot-mapper.test.ts`
- `cmd.exe /c npm run test -- server/socket/register-session-handlers.test.ts`
- `cmd.exe /c npm run test -- src/features/session/useSessionSocket.test.tsx src/features/session/ModeratorSessionView.test.tsx src/features/session/ParticipantSessionView.test.tsx`
- `cmd.exe /c npm run typecheck`
- `cmd.exe /c npm run test`
- `cmd.exe /c npm run build`
- `cmd.exe /c npm run lint`
- `cmd.exe /c npm run test:e2e`

### Completion Notes List

- Implemented the strict `RecordEstimateCommand` contract and optional moderator-only `EstimatedStorySnapshot` list with Zod validation.
- Added server-side final estimate recording with moderator authorization, post-reveal enforcement, active deck validation, current-story upsert behavior, and live-session-only storage.
- Updated socket snapshot emission to avoid sending moderator-only estimated stories to participant viewers.
- Added moderator final-estimate deck buttons after reveal with ack-based pending/recorded state and readable error messages; participant UI remains free of estimate controls and data.
- Added schema, domain, socket, snapshot mapper, hook, moderator view, participant view, and E2E coverage for final estimate recording.
- Addressed code review findings by preventing unidentified or wrong-room sockets from receiving moderator-shaped acknowledgement snapshots and returning `UNAUTHORIZED` for participant-shaped estimate attempts.

### File List

- `_bmad-output/implementation-artifacts/3-3-moderator-records-final-estimate.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `server/domain/session-commands.test.ts`
- `server/domain/session-commands.ts`
- `server/domain/session-store.ts`
- `server/socket/register-session-handlers.test.ts`
- `server/socket/register-session-handlers.ts`
- `server/socket/snapshot-mapper.test.ts`
- `server/socket/snapshot-mapper.ts`
- `src/features/session/ModeratorSessionView.test.tsx`
- `src/features/session/ModeratorSessionView.tsx`
- `src/features/session/ParticipantSessionView.test.tsx`
- `src/features/session/useSessionSocket.test.tsx`
- `src/features/session/useSessionSocket.ts`
- `src/shared/contracts/errors.ts`
- `src/shared/contracts/snapshots.ts`
- `src/shared/contracts/socket-events.ts`
- `src/shared/schemas/command-schemas.test.ts`
- `src/shared/schemas/command-schemas.ts`
- `src/shared/schemas/session-schemas.test.ts`
- `src/shared/schemas/session-schemas.ts`
- `tests/e2e/create-session.spec.ts`

### Change Log

- 2026-07-06: Implemented Story 3.3 final estimate recording and moved story to review.
- 2026-07-06: Addressed code review findings, completed verification, and moved story to done.
