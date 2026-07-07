---
baseline_commit: e76a7759c7ea7b2241410156961d3e98dca19def
created_at: 2026-07-07T17:49:29.4782533-03:00
---

# Story 3.4: Moderator Resets Or Advances The Round

Status: review

Completion Note: Ultimate context engine analysis completed - comprehensive developer guide created.

## Story

As a Moderator,
I want to reset the current Round or advance to the next Story after recording a Final Estimate,
so that I can keep the estimation session moving through multiple Stories.

## Acceptance Criteria

1. Given a Round exists for the current Story, when the Moderator resets the Round, then the server clears Votes and hides Results, and the Session returns to a state where voting can start again for the current Story.
2. Given Results were previously revealed, when the Moderator resets the Round, then selected Card values are no longer visible in pre-reveal snapshots, and the next voting cycle preserves hidden-vote privacy.
3. Given a Final Estimate has been recorded for the current Story, when the Moderator advances to the next Story, then the server prepares the Session for a new Story, and prior Estimated Stories remain available to the Moderator.
4. Given the Moderator advances to the next Story, when the new Session state is emitted, then current Story fields, Votes, Results, and selected Final Estimate controls are cleared or returned to their next-story starting state, and the selected Deck remains unchanged for the next Story unless the Moderator changes it before starting the next Round.
5. Given a Participant attempts to reset or advance the Round, when the command is processed, then the server rejects the command with `UNAUTHORIZED`, and the Participant UI does not expose reset or advance controls.
6. Given reset or advance is pending, when the Moderator view waits for acknowledgement, then the relevant control shows a pending or disabled state, and the UI does not optimistically clear or advance the Session before the server snapshot arrives.

## Tasks / Subtasks

- [x] Extend the shared command contract for reset and advance. (AC: 1-6)
  - [x] Add strict `RoundResetCommandSchema` and `AdvanceStoryCommandSchema` exports in `src/shared/schemas/command-schemas.ts`; both must include `{ roomCode, moderatorToken }` and use the existing room-code and capability-token rules.
  - [x] Export `RoundResetCommand` and `AdvanceStoryCommand` types and use them in `src/shared/contracts/socket-events.ts` instead of the current inline placeholder payloads for `round:reset` and `story:advance`.
  - [x] Add a stable error code such as `FINAL_ESTIMATE_REQUIRED` in `src/shared/contracts/errors.ts` for advance attempts made before the current story has a recorded estimate; do not overload `VALIDATION_FAILED` for a normal business-rule failure.
  - [x] Keep acknowledgement shapes unchanged: `{ ok: true, data }` or `{ ok: false, error }`.

- [x] Implement server-domain reset and advance state transitions. (AC: 1-4)
  - [x] Add `resetRound(command, deps)` and `advanceStory(command, deps)` to `server/domain/session-commands.ts`, following the same typed result pattern as `startRound`, `revealRound`, and `recordEstimate`.
  - [x] `resetRound` must validate room existence and moderator authorization, then clear `session.votes`, reset every participant `hasVoted` flag to `false`, set `round` back to `{ active: false, revealed: false, voteCount: 0 }`, set `results` to `null`, unlock the current story, keep the same story id/title, keep the same deck, and update `updatedAt` via injected `now()`.
  - [x] `resetRound` should return `ROUND_NOT_ACTIVE` when there is no round to reset; it must not mutate session state on failure.
  - [x] `advanceStory` must validate room existence and moderator authorization, require a current story, and require that `session.estimatedStories` already contains an entry for the current story id before advancing.
  - [x] `advanceStory` must preserve `session.estimatedStories`, preserve the currently selected deck, clear `session.votes`, reset participant `hasVoted` flags, clear `results`, set `round` back to the inactive default, set `story` to `null`, and update `updatedAt`.
  - [x] Do not add durable persistence, new stores, or session-history databases; stay inside the existing in-memory `SessionStore`.
  - [x] Preserve Story 3.3 upsert behavior so a later re-recorded estimate for the same story can still overwrite the prior estimated-story entry.

- [x] Wire the socket handlers without regressing moderator-only snapshot safety. (AC: 1-5)
  - [x] Import the new domain commands and schemas into `server/socket/register-session-handlers.ts`.
  - [x] Register the already-defined `CLIENT_EVENTS.roundReset` and `CLIENT_EVENTS.storyAdvance` events through the same acknowledgement-first flow used by existing moderator commands.
  - [x] Keep direct acknowledgements and room snapshot emission routed through `sanitizedSnapshot()` and `emitSessionSnapshots()`; do not reintroduce a room-wide single-payload broadcast that would leak moderator-only `estimatedStories`.
  - [x] Participant-shaped or missing-token reset/advance attempts must return `UNAUTHORIZED`, not a schema-shaped validation error that hides the authorization intent.
  - [x] Preserve existing rate-limited create/join behavior and the current per-socket identity handling added in Story 3.3.

- [x] Add Moderator reset and advance controls in the existing session view. (AC: 1-4, 6)
  - [x] Extend `src/features/session/useSessionSocket.ts` with `resetRound(command)` and `advanceStory(command)` using the existing `socket.timeout(5000).emit(...)` acknowledgement path and `SessionSnapshotAckSchema`.
  - [x] Update `src/features/session/ModeratorSessionView.tsx` to show a reset action when a round is active and an advance action only when the current story has a recorded estimate and the round is revealed.
  - [x] Reuse the current pending-state pattern already used for story save, deck select, round start, reveal, vote submit, and final estimate record; do not add optimistic UI or a second source of truth.
  - [x] Map the new failure code for missing final estimate to a readable moderator message such as "Record a final estimate before advancing to the next story."
  - [x] After a successful reset, the moderator view must stop showing revealed vote groups and final-estimate controls until the next reveal.
  - [x] After a successful advance, the moderator view must show the existing empty-story state, preserve the deck label/options, and clear local story form inputs. Prefer the existing keyed `StoryDeckEditor` reset pattern over manual DOM resets. [Source: `https://react.dev/learn/preserving-and-resetting-state`]

- [x] Keep Participant UI and snapshots strictly non-moderator. (AC: 2, 5)
  - [x] Do not add reset or advance controls to `src/features/session/ParticipantSessionView.tsx`.
  - [x] After reset, participant pages must return to the existing "Waiting" round state with no revealed results and no lingering selected-card visibility.
  - [x] After advance, participant pages must show the no-active-story state until the moderator saves the next story.
  - [x] Preserve pre-reveal privacy rules from Story 2.5: no selected Card values, grouped counts, or moderator-only fields in participant snapshots before reveal.

- [x] Preserve estimated-story continuity without overbuilding Story 3.5. (AC: 3-4)
  - [x] Do not clear `estimatedStories` on reset or advance.
  - [x] Keep moderator-only `estimatedStories` available in the moderator snapshot after advance so Story 3.5 can render the full live list on top of stable data.
  - [x] Do not build a participant-visible history or any durable history surface.
  - [x] If a minimal `EstimatedStoriesList` component is introduced now to make AC 3 observable, keep it small and reusable under `src/features/results`, and treat Story 3.5 as the owner of the polished moderator history UI.

- [x] Add automated coverage across domain, socket, hook, UI, and browser flows. (AC: 1-6)
  - [x] Command-schema tests: accept the new moderator reset/advance payloads and reject extra or malformed fields.
  - [x] Domain tests: reset clears votes/results and unlocks the story; reset preserves deck and estimated stories; reset fails with `ROUND_NOT_ACTIVE` when appropriate; advance requires a recorded estimate; advance clears story/round/results/votes while preserving deck and estimated stories; participant or bad-token attempts fail without mutation.
  - [x] Socket tests: `round:reset` and `story:advance` acknowledge before broadcasting, return stable failures, and keep `estimatedStories` moderator-only in both acknowledgements and emitted snapshots.
  - [x] Hook tests: `useSessionSocket` exposes `resetRound` and `advanceStory` and updates `latestSnapshot` only after validated success acknowledgements.
  - [x] Moderator view tests: reset and advance buttons render in the right states, pending buttons disable correctly, reset removes revealed results without optimistic clearing, advance returns to the empty-story state, and deck selection persists after advance.
  - [x] Participant view tests: no reset/advance controls, revealed results disappear after reset, and empty-story state appears after advance.
  - [x] E2E coverage: one flow proves reset clears revealed results and restores hidden-vote privacy for the next round; one flow proves advance after final estimate clears the active story while preserving the deck and keeping moderator-only history out of participant pages.

- [x] Run verification.
  - [x] `cmd.exe /c npm run typecheck`
  - [x] `cmd.exe /c npm run test`
  - [x] `cmd.exe /c npm run build`
  - [x] `cmd.exe /c npm run lint`
  - [x] `cmd.exe /c npm run test:e2e`

## Dev Notes

### Current Repository State

- Baseline commit for this story context is `e76a7759c7ea7b2241410156961d3e98dca19def` (`Story 3.3 done`).
- The repository was clean at story-creation time; no unrelated working-tree edits needed to be preserved for this story.
- Story 3.3 is complete and already added moderator-only `estimatedStories` plus role-aware snapshot emission. Reset/advance work must build on that behavior, not simplify it away.
- `src/shared/contracts/socket-events.ts` already declares `round:reset` and `story:advance`, but `src/shared/schemas/command-schemas.ts`, `server/domain/session-commands.ts`, `server/socket/register-session-handlers.ts`, `src/features/session/useSessionSocket.ts`, and the Moderator UI do not yet implement those flows.
- `src/features/results/EstimatedStoriesList.tsx` does not exist yet even though the architecture maps FR-14/FR-15 work to that area. Treat Story 3.5 as the main owner of the full history list UI.
- No `project-context.md` file was found under the project root during activation, and no `docs/` directory currently exists.

### Story Requirements Source

- Epic 3 requires the Moderator to reveal, capture final estimates, reset or advance the flow, and maintain a Moderator-only live list of estimated stories. [Source: `_bmad-output/planning-artifacts/epics.md#epic-3-reveal-results-and-capture-estimates`]
- Story 3.4 specifically requires reset to clear votes and hide results, and advance to prepare the next-story state while keeping prior estimated stories available to the Moderator. [Source: `_bmad-output/planning-artifacts/epics.md#story-34-moderator-resets-or-advances-the-round`]
- PRD FR-7 says resetting clears votes and hides results, while advancing prepares the Session for a new Story and prior Estimated Stories remain visible in the live Session list. [Source: `_bmad-output/planning-artifacts/prds/prd-adr-buddy-2026-06-16/prd.md#fr-7-reset-or-advance-round`]
- PRD FR-8 requires participant attempts at round-control actions to be rejected. [Source: `_bmad-output/planning-artifacts/prds/prd-adr-buddy-2026-06-16/prd.md#fr-8-restrict-round-controls-to-moderator`]
- PRD FR-11 requires hidden votes to stay private again after reset until the next reveal. [Source: `_bmad-output/planning-artifacts/prds/prd-adr-buddy-2026-06-16/prd.md#fr-11-preserve-vote-privacy-before-reveal`]
- PRD FR-15 keeps estimated-story history moderator-only and live-session-only. [Source: `_bmad-output/planning-artifacts/prds/prd-adr-buddy-2026-06-16/prd.md#fr-15-show-estimated-stories-list`]

### Previous Story Intelligence

- Story 3.3 already established the correct shape for estimated-story persistence: `session.estimatedStories` lives in the domain store, moderator snapshots may include it, and participant snapshots must omit it.
- Story 3.3 also fixed the room broadcast problem by emitting viewer-specific snapshots per socket. Reset/advance must keep using `emitSessionSnapshots()` instead of `io.to(roomCode).emit(...)` with one shared payload.
- Story 3.2 introduced `VoteGroupList` for post-reveal rendering. After reset, that component should naturally stop rendering because `round.revealed` becomes `false` and `results` becomes `null`.
- Story 2.5 defined the allowlist privacy boundary: pre-reveal participant snapshots must not include hidden selected-card values, grouped counts, or moderator-only fields. Reset is effectively a return to that contract.
- The current `StoryDeckEditor` uses a `key` derived from story id/title, deck id, and `round.active`, which is useful for clearing local form state when the active story is advanced away.

### Existing Files To Update Carefully

- `src/shared/schemas/command-schemas.ts`
  - Current state: create/join/story/deck/start/reveal/vote/estimate commands exist; reset/advance schemas do not.
  - Change needed: add strict reset/advance moderator command schemas and exported types.
  - Preserve: current room-code and capability-token validation rules, max lengths, and strict-object posture.

- `src/shared/contracts/socket-events.ts`
  - Current state: reset/advance event names exist, but their payloads are inline placeholders rather than shared command types.
  - Change needed: point those payloads at the new shared command types.
  - Preserve: existing event names; do not rename `round:reset` or `story:advance`.

- `src/shared/contracts/errors.ts`
  - Current state: includes `ROUND_NOT_ACTIVE`, `RESULTS_NOT_REVEALED`, `STORY_LOCKED`, and `UNAUTHORIZED`; no dedicated advance-without-estimate code exists.
  - Change needed: add a stable business-rule error code for advance-before-estimate if the implementation needs one.
  - Preserve: machine-readable uppercase snake case and readable message mapping on the client.

- `server/domain/session-commands.ts`
  - Current state: `startRound` clears votes and resets participant voting flags; `revealRound` makes results visible; `recordEstimate` persists moderator-only estimated stories without clearing active story state.
  - Change needed: add reset and advance transitions using the same authorization and immutable-update style.
  - Preserve: injected `now()`, in-memory-only session state, hidden-vote privacy, and no direct transport concerns.

- `server/socket/register-session-handlers.ts`
  - Current state: moderator flows go through `handleModeratorCommand`; estimate recording has a special unauthorized short-circuit for participant-shaped payloads; snapshot emission is per-socket and role-aware.
  - Change needed: register `round:reset` and `story:advance`, preserve ack-before-broadcast behavior, and keep unauthorized failures stable.
  - Preserve: `sanitizedSnapshot()`, `emitSessionSnapshots()`, and the identity-aware acknowledgement viewer logic.

- `server/socket/snapshot-mapper.ts`
  - Current state: reveals results only when `round.revealed` is true and includes `estimatedStories` only for moderator viewers.
  - Change needed: likely no structural change, but verify reset/advance commands continue to produce the expected moderator and participant snapshots.
  - Preserve: allowlisted deck/story/participant/round/result fields and omission of hidden votes before reveal.

- `src/features/session/useSessionSocket.ts`
  - Current state: exposes `updateStory`, `selectDeck`, `startRound`, `revealRound`, `submitVote`, and `recordEstimate`.
  - Change needed: add `resetRound` and `advanceStory` with the same validated acknowledgement path and `setLatestSnapshot` behavior.
  - Preserve: 5-second Socket.IO ack timeout, schema-validated success payloads, and connection-unavailable fallback.

- `src/features/session/ModeratorSessionView.tsx`
  - Current state: owns story/deck editing, round start, reveal, moderator voting, grouped results, and final estimate recording.
  - Change needed: add reset and advance controls, pending/error states, and success-state transitions back to pre-round or no-story views.
  - Preserve: existing quiet work-tool UI, no optimistic authoritative updates, grouped results placement, and participant presence list.

- `src/features/session/ParticipantSessionView.tsx`
  - Current state: shows story/deck/round/vote status, allows vote submission during active unrevealed rounds, and renders grouped results after reveal.
  - Change needed: mainly regression protection; it should react correctly to reset/advance snapshots without adding new controls.
  - Preserve: no moderator controls and no moderator-only history data.

- `tests/e2e/create-session.spec.ts`
  - Current state: already covers the live path through create, join, start round, vote privacy, reveal, and final estimate recording across multiple browser contexts.
  - Change needed: extend the same integrated flow for reset and advance instead of creating a disconnected browser scenario.
  - Preserve: multi-context privacy assertions and role-specific UI expectations.

### Architecture Compliance

- Live session control remains Socket.IO-command based; do not add REST endpoints for reset or advance. [Source: `_bmad-output/planning-artifacts/architecture.md#api--communication-patterns`]
- Socket handlers must validate, authorize, call domain logic, and emit snapshots; they must not mutate session state directly. [Source: `_bmad-output/planning-artifacts/architecture.md#communication-patterns`]
- Server state remains authoritative and frontend state should continue to wait for acknowledgements and snapshots rather than applying optimistic Moderator changes. [Source: `_bmad-output/planning-artifacts/architecture.md#frontend-architecture`]
- Moderator-only data, including estimated stories, must stay out of participant snapshots. [Source: `_bmad-output/planning-artifacts/architecture.md#api--communication-patterns`]
- Folder structure and ownership remain the same: shared contracts in `src/shared`, domain logic in `server/domain`, socket transport in `server/socket`, and session UI in `src/features/session`. [Source: `_bmad-output/planning-artifacts/architecture.md#project-structure--boundaries`]
- Do not introduce Redis, databases, authentication, analytics, exports, or backlog integrations while implementing this story. [Source: `_bmad-output/planning-artifacts/architecture.md#runtime-assumptions`]

### Git Intelligence Summary

- `e76a775` - `Story 3.3 done`
- `c5c1d5f` - `Refactor ADR buddy workflows and docs`
- `dde150d` - `feat: add reveal round functionality for moderators`
- `b2feeab` - `feat: update pre-reveal vote privacy story status to done and add review findings`
- `14c3e51` - `feat: implement moderator voting functionality and snapshot management`

Practical takeaway: the recent implementation sequence is tightly incremental. Story 3.4 should extend the established round lifecycle instead of refactoring its architecture.

### Latest Technical Context

- Socket.IO 4.x acknowledgements remain the right request-response pattern for moderator commands, and per-command timeouts with `socket.timeout(ms).emit(...)` are supported in the official docs. Keep reset/advance on the same ack-driven path as the existing commands. [Source: `https://socket.io/docs/v4/emitting-events/`]
- Socket.IO rooms are a server-only broadcast mechanism; `io.to(room).emit(...)` sends one payload to all sockets in the room. Because moderator snapshots include `estimatedStories`, viewer-specific reset/advance snapshots must continue to be emitted per socket rather than as one shared room payload. [Source: `https://socket.io/docs/v4/rooms/`]
- React state can be intentionally reset by changing a component key. The existing keyed `StoryDeckEditor` pattern is a good fit for clearing moderator form state after advancing to the next story. [Source: `https://react.dev/learn/preserving-and-resetting-state`]
- Zod supports strict object schemas that reject unknown keys. Keep reset/advance commands strict so moderator-only payloads do not silently accept extra fields or participant-shaped variants. [Source: `https://zod.dev/api`]

### Project Context Reference

- Persistent facts configured for this workflow pointed to `**/project-context.md`, but no matching file existed in this repository.
- `config.yaml` points `project_knowledge` at `{project-root}/docs`, but that folder is not present today.
- This story therefore relies on the planning artifacts, implementation artifacts, current codebase, and recent git history as the authoritative context set.

### Testing

Expected verification commands:

```sh
cmd.exe /c npm run typecheck
cmd.exe /c npm run test
cmd.exe /c npm run build
cmd.exe /c npm run lint
cmd.exe /c npm run test:e2e
```

### Assumptions To Carry Forward

- Reset preserves the current story and selected deck, but returns the round to the same pre-start state used before Story 2.2 begins a new round.
- Reset does not delete `estimatedStories`; a later `recordEstimate` should continue to upsert the current story entry if the team revotes and changes the estimate.
- Advance requires the current story to have an already recorded final estimate and clears only active-round and active-story state, not moderator-only history or deck choice.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-07-07: Implemented reset/advance shared command contracts, domain transitions, socket handlers, client actions, moderator controls, and regression coverage across unit/UI/e2e surfaces.

### Completion Notes List

- Added strict shared reset/advance command schemas, shared event payload types, and the `FINAL_ESTIMATE_REQUIRED` business-rule error code.
- Implemented moderator-only `resetRound` and `advanceStory` domain/socket flows that preserve deck and estimated-story history while restoring pre-reveal privacy.
- Extended the moderator socket hook and session view with pending-safe reset/advance controls, plus regression coverage across schema, domain, socket, hook, UI, and Playwright flows.

### File List

- _bmad-output/implementation-artifacts/3-4-moderator-resets-or-advances-the-round.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- server/domain/session-commands.test.ts
- server/domain/session-commands.ts
- server/socket/register-session-handlers.test.ts
- server/socket/register-session-handlers.ts
- src/app/styles.test.ts
- src/features/session/ModeratorSessionView.test.tsx
- src/features/session/ModeratorSessionView.tsx
- src/features/session/ParticipantSessionView.test.tsx
- src/features/session/useSessionSocket.test.tsx
- src/features/session/useSessionSocket.ts
- src/shared/contracts/errors.ts
- src/shared/contracts/socket-events.ts
- src/shared/schemas/command-schemas.test.ts
- src/shared/schemas/command-schemas.ts
- tests/e2e/create-session.spec.ts
