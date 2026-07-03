---
baseline_commit: b2feeab8d78addece55e5e4aeb493258ac8f3d9f
---

# Story 3.1: Moderator Reveals Round Results

Status: done

Completion Note: Ultimate context engine analysis completed - comprehensive developer guide created.

## Story

As a Moderator,
I want to reveal Results for the active Round,
so that the team can discuss estimates only after private voting is complete.

## Acceptance Criteria

1. Given a Round is active, when the Moderator reveals Results, then the server changes the Round state to revealed, and all joined users receive a near-real-time snapshot showing that Results are revealed.
2. Given submitted Votes exist, when Results are revealed, then submitted Card values become visible in post-reveal Session state, and hidden-vote restrictions no longer hide those submitted values for that revealed Round.
3. Given some Participants did not vote, when Results are revealed, then non-voters remain distinguishable by Display Name, and they are not assigned a Card value.
4. Given the Moderator has not submitted a Vote, when the Moderator reveals Results, then the reveal succeeds, and the Results do not include a fabricated Moderator Vote.
5. Given a Participant attempts to reveal Results, when the command is processed, then the server rejects the command with `UNAUTHORIZED`, and the Participant UI does not expose reveal controls.
6. Given Results have already been revealed, when any user attempts to submit or change a Vote, then the server rejects the command with `VOTE_LOCKED`, and no post-reveal Vote is added or changed.

## Tasks / Subtasks

- [x] Confirm dependency readiness before implementation. (AC: 1-6)
  - [x] Verify Story 2.4 Moderator voting is implemented if this branch expects Moderator votes to appear in revealed results.
  - [x] Verify Story 2.5 pre-reveal privacy hardening is implemented, especially the snapshot sanitization boundary. If not, do not implement reveal in a way that exposes hidden values before reveal.
  - [x] Preserve existing Participant voting behavior from Story 2.3 and any Moderator voting behavior from Story 2.4.
- [x] Extend shared reveal and post-reveal contracts. (AC: 1-6)
  - [x] Add `RevealRoundCommandSchema` in `src/shared/schemas/command-schemas.ts` with strict `{ roomCode, moderatorToken }` validation.
  - [x] Export the inferred `RevealRoundCommand` type and wire `CLIENT_EVENTS.roundReveal` to it in `src/shared/contracts/socket-events.ts`.
  - [x] Add an explicit post-reveal snapshot shape to `src/shared/contracts/snapshots.ts`; prefer a `results: RevealedResultsSnapshot | null` field where `results` is `null` before reveal and contains a flat list after reveal.
  - [x] Recommended flat vote shape: `{ participantId, displayName, role, value }`. Do not include non-voters in this list; non-voters remain visible through `participants` with `hasVoted: false`.
  - [x] Update `SessionSnapshotSchema` and related ack/result schemas in `src/shared/schemas/session-schemas.ts` with strict Zod validation for the new post-reveal fields.
  - [x] Keep grouped counts, majority labels, outlier summaries, final estimate, and estimated stories out of this story; they belong to Stories 3.2, 3.3, and 3.5.
- [x] Implement server-authoritative reveal behavior in the domain layer. (AC: 1-6)
  - [x] Add `revealRound(command, deps)` in `server/domain/session-commands.ts`.
  - [x] Use guard order: missing room -> `INVALID_ROOM_CODE`; bad moderator token -> `UNAUTHORIZED`; inactive round -> `ROUND_NOT_ACTIVE`; already revealed may return the current revealed snapshot without mutation or a stable no-op success, but it must not duplicate results or alter votes.
  - [x] On success, set `snapshot.round.revealed = true`, keep `snapshot.round.active = true`, keep `voteCount = session.votes.size`, set/update `snapshot.results` from the current `session.votes`, and update `updatedAt`.
  - [x] Build revealed votes from participant ids in `session.votes`; lookup display name and role from `snapshot.participants`.
  - [x] If a vote key has no matching participant, ignore it or return a stable domain error after investigating why the state is inconsistent; do not fabricate display names.
  - [x] Do not create a Moderator vote if `session.votes` does not contain `session.moderatorParticipantId`.
  - [x] Leave `session.votes` intact after reveal so post-reveal snapshots can represent submitted values and `submitVote` can reject changes with `VOTE_LOCKED`.
- [x] Preserve privacy boundaries while making revealed values visible. (AC: 2, 3, 6)
  - [x] If `server/socket/snapshot-mapper.ts` exists from Story 2.5, add reveal-aware mapping there instead of returning raw domain state directly.
  - [x] Before reveal, `results` must be `null` or omitted and no selected card values, grouped counts, or vote distributions may appear in room-wide snapshots.
  - [x] After reveal, selected card values may appear only in the explicit post-reveal results field.
  - [x] Never include capability tokens in any snapshot or UI-visible state.
  - [x] Do not log raw command payloads, `session.votes`, capability tokens, or selected values before reveal.
- [x] Wire the Socket.IO `round:reveal` command. (AC: 1, 5)
  - [x] Register `CLIENT_EVENTS.roundReveal` in `server/socket/register-session-handlers.ts`.
  - [x] Keep the handler thin: validate with Zod, authorize/delegate through `revealRound`, acknowledge, then broadcast the sanitized `session:snapshot`.
  - [x] Preserve ack-before-broadcast ordering already used by `story:update`, `deck:select`, `round:start`, and `vote:submit`.
  - [x] Return `UNAUTHORIZED` for a parsed reveal command with an invalid or Participant-held token in `moderatorToken`.
  - [x] Do not broadcast on validation, authorization, inactive-round, or thrown-error failures.
- [x] Add frontend reveal command support. (AC: 1, 5, 6)
  - [x] Add `revealRound(command)` to `src/features/session/useSessionSocket.ts`, using `CLIENT_EVENTS.roundReveal`, `SessionSnapshotAckSchema`, `ACK_TIMEOUT_MS`, and the existing success path that updates `latestSnapshot`.
  - [x] Add unit coverage for successful reveal ack parsing, `latestSnapshot` update, failure ack behavior, and connection-unavailable behavior.
- [x] Add Moderator reveal controls and post-reveal display. (AC: 1-6)
  - [x] Update `src/features/session/ModeratorSessionView.tsx` to render a reveal button only for the Moderator.
  - [x] Enable reveal only when a round is active, not revealed, a Moderator token exists, and no reveal command is pending.
  - [x] Show pending and readable error states derived from the server acknowledgement; do not optimistically set revealed state before the server ack/snapshot.
  - [x] Show revealed vote values after reveal using the explicit results field; non-voters should remain visible in the existing participant list as `Not voted`.
  - [x] If grouped display is tempting, defer it to Story 3.2. For this story, a flat accessible list of revealed votes is enough to prove the reveal contract.
  - [x] Preserve existing Story/Deck editing, Start Round, participant presence, and pre-reveal privacy behavior.
- [x] Update Participant session rendering after reveal. (AC: 1-3, 5, 6)
  - [x] Keep Participant UI free of reveal controls.
  - [x] Continue disabling vote buttons when `snapshot.round.revealed` is true.
  - [x] Render revealed vote values after reveal from the same explicit results field used by the Moderator view.
  - [x] Preserve the current pre-reveal behavior where Participants see only voting status and their local accepted selection state.
- [x] Add automated coverage. (AC: 1-6)
  - [x] Schema tests: valid reveal command, missing token, short token, extra fields, and invalid room code.
  - [x] Domain tests in `server/domain/session-commands.test.ts`: successful reveal with Participant votes, successful reveal without Moderator vote, non-voters not assigned values, invalid room, invalid Moderator token, inactive round, idempotent already-revealed handling, and post-reveal `submitVote` returns `VOTE_LOCKED` without mutation.
  - [x] Snapshot/schema tests: pre-reveal snapshots contain no `results.votes`; post-reveal snapshots contain only submitted votes; non-voters remain in `participants` without selected card fields.
  - [x] Socket handler tests in `server/socket/register-session-handlers.test.ts`: valid reveal ack and broadcast, malformed payload validation, invalid token `UNAUTHORIZED`, inactive round failure, no broadcast on failures, ack-before-broadcast ordering, and no token leakage.
  - [x] Hook tests in `src/features/session/useSessionSocket.test.tsx`: `revealRound` emits `round:reveal`, validates ack data, updates `latestSnapshot`, and handles timeout/unavailable connection.
  - [x] Moderator component tests: reveal button availability, pending state, hidden from Participants, error message behavior, revealed vote list rendering, and no optimistic reveal.
  - [x] Participant component tests: no reveal control, vote controls disabled after reveal, revealed vote values shown only after reveal, non-voters readable.
  - [x] E2E coverage across two browser contexts: Moderator starts a round, at least one Participant votes, another user remains a non-voter, Moderator reveals, both browsers show revealed state and submitted values, non-voter is labeled without a card, and later vote attempts are locked.
- [x] Run verification.
  - [x] `cmd.exe /c npm run typecheck`
  - [x] `cmd.exe /c npm run test`
  - [x] `cmd.exe /c npm run build`
  - [x] `cmd.exe /c npm run lint`
  - [x] `cmd.exe /c npm run test:e2e`

### Review Findings

- [x] [Review][Patch] Enforce snapshot `results` consistency with `round.revealed` [src/shared/schemas/session-schemas.ts:57]
- [x] [Review][Patch] Add real socket-handler coverage for inactive-round reveal failure [server/socket/register-session-handlers.test.ts:1293]

## Dev Notes

### Current Repository State

- The current sprint file marks `2-4-moderator-votes-in-the-round` and `2-5-enforce-pre-reveal-vote-privacy` as `ready-for-dev`, not `done`. Story 3.1 depends on their behavior. Implementing reveal before those stories are actually complete risks either missing Moderator votes or leaking pre-reveal values.
- `src/shared/contracts/socket-events.ts` already defines `CLIENT_EVENTS.roundReveal` as `round:reveal` and includes placeholder payload/ack types, but the payload currently lacks `moderatorToken` and no server/client handler exists.
- `src/shared/contracts/snapshots.ts` currently defines `SessionSnapshot` with `roomCode`, `deck`, `story`, `participants`, `round`, and `updatedAt`. There is no post-reveal result field yet.
- `src/shared/schemas/session-schemas.ts` uses strict Zod schemas. Any new `results` field must be represented there or the client hook will reject successful reveal acknowledgements.
- `server/domain/session-store.ts` stores authoritative live state in memory with `votes: Map<string, string>`, `moderatorParticipantId`, `moderatorToken`, participant tokens, and `snapshot`.
- `server/domain/session-commands.ts` currently implements create, join, story update, deck select, start round, and participant vote submission. There is no `revealRound` command.
- `submitVote` already rejects changes when `session.snapshot.round.revealed` is true with `VOTE_LOCKED`; reveal must set this flag for AC6 to work.
- `server/socket/register-session-handlers.ts` uses a shared thin command-handler pattern for Moderator-like commands and the vote command. Add reveal through the same validation -> domain -> ack -> broadcast flow.
- `src/features/session/useSessionSocket.ts` has no `revealRound` method yet, but it already has the reusable `emitValidatedCommand` path needed for it.
- `ModeratorSessionView.tsx` currently has Story/Deck editing, Start Round, presence, and read-only deck options. There is no reveal button or results display.
- `ParticipantSessionView.tsx` already disables vote buttons when `snapshot.round.revealed` is true through `canSubmitVote`, but it has no revealed results display.
- There is no `src/features/results` directory in the current source. The architecture names it for reveal/grouped results, but this story can either add a small reusable results component there or keep the first flat display in session views. Grouped result components belong to Story 3.2.

### Recommended Snapshot Shape

Use an explicit field rather than attaching selected values to participants:

```ts
interface RevealedVoteSnapshot {
  participantId: string
  displayName: string
  role: ParticipantRole
  value: string
}

interface RevealedResultsSnapshot {
  votes: RevealedVoteSnapshot[]
}

interface SessionSnapshot {
  roomCode: string
  deck: PlanningDeck
  story: StorySnapshot | null
  participants: ParticipantSnapshot[]
  round: RoundSnapshot
  results: RevealedResultsSnapshot | null
  updatedAt: string
}
```

Before reveal, `results` should be `null`. After reveal, `results.votes` should contain one item per submitted vote. This keeps non-voters represented by `participants` only and gives Story 3.2 a clean source for grouped display.

### Domain Guidance

Reveal should be a state transition, not a result aggregation feature. A conservative implementation:

```ts
export function revealRound(
  command: RevealRoundCommand,
  { store, now = () => new Date() }: ModeratorSessionCommandDependencies,
): ModeratorSessionCommandResult {
  const session = store.get(command.roomCode)
  // guards...
  const results = {
    votes: Array.from(session.votes.entries()).flatMap(([participantId, value]) => {
      const participant = session.snapshot.participants.find((candidate) => candidate.id === participantId)
      return participant ? [{ participantId, displayName: participant.displayName, role: participant.role, value }] : []
    }),
  }
  const snapshot = {
    ...session.snapshot,
    round: { ...session.snapshot.round, revealed: true, voteCount: session.votes.size },
    results,
    updatedAt: now().toISOString(),
  }
  store.set({ ...session, snapshot })
  return { ok: true, data: snapshot }
}
```

Do not clear votes during reveal. Reset behavior belongs to Story 3.4.

### Architecture Compliance

- Live session behavior stays on Socket.IO command events with acknowledgements and sanitized `session:snapshot` broadcasts. [Source: `_bmad-output/planning-artifacts/architecture.md#api--communication-patterns`]
- Socket handlers validate with Zod, authorize, delegate to domain logic, then emit snapshots; handlers must not mutate Session state directly. [Source: `_bmad-output/planning-artifacts/architecture.md#communication-patterns`]
- Server state is authoritative; frontend state is derived from the latest `session:snapshot`; no optimistic updates for reveal. [Source: `_bmad-output/planning-artifacts/architecture.md#frontend-architecture`]
- Hidden vote values must not appear in public snapshots before reveal, and Moderator-only data must stay out of Participant snapshots. [Source: `_bmad-output/planning-artifacts/architecture.md#format-patterns`]
- Result reveal and grouped results map to `src/features/results` and domain result logic, but Story 3.1 only needs the reveal transition and flat post-reveal visibility. [Source: `_bmad-output/planning-artifacts/architecture.md#requirements-to-structure-mapping`]
- No database, Redis, durable storage, analytics, auth, export, or backlog integration should be introduced for this story. [Source: `_bmad-output/planning-artifacts/prds/prd-adr-buddy-2026-06-16/prd.md#6-non-goals`]

### Latest Technical Context

- Socket.IO 4.x supports acknowledgement callbacks for request-response command flows and timeout handling; keep using the existing ack pattern rather than adding REST polling. [Source: `https://socket.io/docs/v4/emitting-events/`]
- Socket.IO rooms are server-side channels; `io.to(roomCode).emit(...)` sends the same payload to every socket in the room, so viewer-specific hidden data must not be placed in room-wide snapshots. [Source: `https://socket.io/docs/v4/rooms/`]
- Zod 4 is stable and supports strict schema parsing with `safeParse`; keep strict command and snapshot schemas so accidental sensitive fields fail validation. [Source: `https://zod.dev/packages/zod`]
- React Router supports dynamic URL segments via route params; preserve the existing `/session/:roomCode/moderator` and `/session/:roomCode` flow. [Source: `https://reactrouter.com/start/declarative/routing`]

### Cross-Story Intelligence

- Story 2.3 established the current participant vote path: strict `SubmitVoteCommandSchema`, `submitVote`, `vote:submit` socket handling, `useSessionSocket.submitVote`, Participant vote buttons, Moderator presence status, and e2e coverage.
- Story 2.4 defines how Moderator votes should use `session.moderatorParticipantId` as the vote key and the same `vote:submit` path while keeping selected values hidden before reveal.
- Story 2.5 defines the privacy boundary: room-wide pre-reveal snapshots must expose only status, not selected values, grouped counts, result distributions, capability tokens, or estimated stories.
- Story 3.2 will group or order revealed votes by count. Do not implement majority/outlier grouping in Story 3.1 unless it is a tiny internal helper needed to render the flat reveal safely.

### Existing Files To Update Carefully

- `src/shared/contracts/snapshots.ts`
  - Current state: no result field and no selected vote values.
  - Change needed: add explicit post-reveal result types and `results: ... | null`.
  - Preserve: participant entries remain status/identity only; do not put selected values on `ParticipantSnapshot`.
- `src/shared/schemas/session-schemas.ts`
  - Current state: strict schemas reject unknown snapshot fields.
  - Change needed: add result schemas and keep all schemas strict.
  - Preserve: token-free create/join result snapshots.
- `src/shared/schemas/command-schemas.ts`
  - Current state: no reveal command schema.
  - Change needed: add strict reveal command with `moderatorToken`.
  - Preserve: existing command schemas and capability token constraints.
- `src/shared/contracts/socket-events.ts`
  - Current state: reveal event constants exist but payload is only `{ roomCode: string }`.
  - Change needed: type reveal payload as `RevealRoundCommand`.
  - Preserve: event name `round:reveal` and ack shape `SessionSnapshot`.
- `server/domain/session-commands.ts`
  - Current state: no reveal command; `submitVote` already has revealed guard.
  - Change needed: implement `revealRound` and export it through `server/domain/index.ts`.
  - Preserve: guard behavior and no-mutation-on-failure expectations.
- `server/socket/register-session-handlers.ts`
  - Current state: no `round:reveal` listener.
  - Change needed: add listener using the existing command pattern.
  - Preserve: ack-before-broadcast ordering and room-scoped emits.
- `src/features/session/useSessionSocket.ts`
  - Current state: no `revealRound` method.
  - Change needed: add method and type in `UseSessionSocketResult`.
  - Preserve: ack timeout, `SessionSnapshotAckSchema`, and connection fallback.
- `src/features/session/ModeratorSessionView.tsx`
  - Current state: no reveal control or results display.
  - Change needed: add reveal action and flat revealed vote display.
  - Preserve: Story/Deck/Start Round behavior and Participant presence privacy.
- `src/features/session/ParticipantSessionView.tsx`
  - Current state: vote buttons disable after reveal; no results display.
  - Change needed: show revealed results without exposing reveal controls.
  - Preserve: Participant command scope and local selected-state behavior.
- `src/app/styles.css`
  - Current state: session and vote-card styles exist.
  - Change needed: reuse existing button/list styles where possible.
  - Preserve: responsive layout, readable labels, keyboard-friendly controls.

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

- 2026-07-03: Red phase confirmed focused reveal tests failed on missing reveal schema/domain/socket/hook/UI behavior.
- 2026-07-03: Focused reveal suite passed: 8 files, 149 tests.
- 2026-07-03: Full verification passed: typecheck, Vitest, build, lint, and Playwright E2E.

### Completion Notes

- Implemented server-authoritative round reveal with strict command validation, guard ordering, idempotent already-revealed handling, and post-reveal `VOTE_LOCKED` protection through the existing `submitVote` guard.
- Added explicit `results: RevealedResultsSnapshot | null` contract and Zod schemas; pre-reveal snapshots carry `results: null`, while revealed snapshots expose only flat submitted votes.
- Wired `round:reveal` through Socket.IO with sanitized ack-before-broadcast behavior and no failure broadcasts.
- Added moderator reveal controls with pending/error states and no optimistic reveal; participants have no reveal controls and see the same flat revealed vote list after reveal.
- Added schema, domain, socket, hook, component, snapshot, and E2E coverage for reveal behavior, privacy, non-voters, unauthorized reveal, and post-reveal locked voting.

### File List

- `_bmad-output/implementation-artifacts/3-1-moderator-reveals-round-results.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `server/domain/session-commands.test.ts`
- `server/domain/session-commands.ts`
- `server/socket/register-session-handlers.test.ts`
- `server/socket/register-session-handlers.ts`
- `server/socket/snapshot-mapper.test.ts`
- `server/socket/snapshot-mapper.ts`
- `src/app/styles.css`
- `src/features/session/ModeratorSessionView.test.tsx`
- `src/features/session/ModeratorSessionView.tsx`
- `src/features/session/ParticipantSessionView.test.tsx`
- `src/features/session/ParticipantSessionView.tsx`
- `src/features/session/useSessionSocket.test.tsx`
- `src/features/session/useSessionSocket.ts`
- `src/shared/contracts/snapshots.ts`
- `src/shared/contracts/socket-events.ts`
- `src/shared/schemas/command-schemas.test.ts`
- `src/shared/schemas/command-schemas.ts`
- `src/shared/schemas/session-schemas.test.ts`
- `src/shared/schemas/session-schemas.ts`
- `tests/e2e/create-session.spec.ts`

## Change Log

| Date | Version | Description | Author |
| --- | --- | --- | --- |
| 2026-07-03 | 0.1 | Initial story draft from Epic 3 requirements, architecture, current source, and recent story context. | Scrum Master |
| 2026-07-03 | 1.0 | Implemented moderator round reveal, post-reveal results snapshots, socket/client/UI wiring, and full automated coverage. | Dev Agent |
