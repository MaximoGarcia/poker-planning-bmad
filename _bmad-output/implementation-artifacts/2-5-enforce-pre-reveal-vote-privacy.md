---
baseline_commit: 8f4f99870a727f64cc739126d60dd75ea5c9953d
---

# Story 2.5: Enforce Pre-Reveal Vote Privacy

Status: done

## Story

As a team member,
I want submitted Cards to remain hidden until the Moderator reveals Results,
So that estimation stays fair and unbiased during the voting round.

## Acceptance Criteria

1. Participant snapshots before reveal include only the viewer's own Vote state plus voting status for other users; no other selected Card value is present.
2. Participant snapshots may include Room Code, current Story id/description, active Deck, Round state, viewer's own Vote state, and participant display names with `hasVoted`; they must not include Moderator-only controls, Estimated Stories, capability tokens, grouped result counts, or a selected Card value other than the viewer's own Vote state.
3. Moderator snapshots before reveal may show who has voted; they must not include selected Card values for Participants or Moderator before reveal.
4. Server logs must not include capability tokens or hidden selected Card values.
5. Snapshot inspection before reveal must not expose grouped counts, vote distribution, or selected Card values; only `hasVoted`-style status is visible.
6. An invalid or mismatched capability token on a vote command returns `UNAUTHORIZED` and no Vote is recorded or changed.
7. Automated tests verify sanitized snapshots omit hidden Votes and end-to-end hidden-vote privacy across Moderator and Participant browser contexts.

## Tasks / Subtasks

- [x] Define the pre-reveal snapshot privacy contract.
  - [x] Keep the shared public `SessionSnapshot` status-only unless a viewer-specific snapshot type is introduced.
  - [x] If the viewer's selected card value is added, expose it only through a viewer-specific participant snapshot or direct acknowledgement to that participant socket, never through a room-wide broadcast.
  - [x] Explicitly allow only `roomCode`, `deck`, current `story`, `round.active`, `round.revealed`, total `round.voteCount`, participant display/connection/role data, and `hasVoted` before reveal.
  - [x] Explicitly prohibit capability tokens, `votes`, selected card values for other users, grouped result counts, vote distributions, `estimatedStories`, and Moderator-only controls in Participant snapshots.
- [x] Add a dedicated snapshot sanitization boundary.
  - [x] Prefer `server/socket/snapshot-mapper.ts`, matching the architecture artifact, or a similarly named local module if the implemented structure has changed.
  - [x] Map from `SessionState` plus viewer context to a sanitized snapshot instead of reusing mutable domain state directly at Socket.IO boundaries.
  - [x] Preserve `round.voteCount` as only the total number of submitted votes, not grouped counts by card value.
- [x] Route every Socket.IO snapshot emission and success acknowledgement through the mapper.
  - [x] Cover create session, join session, set story, select deck, start round, and submit vote flows.
  - [x] Ensure room-wide `session:snapshot` emissions never include hidden selected values before reveal.
  - [x] Keep create/join capability tokens only in the direct command acknowledgement/result shape, outside any snapshot.
- [x] Preserve vote authorization and no-mutation behavior.
  - [x] Invalid participant IDs, mismatched participant tokens, and moderator/participant token mixups must return `UNAUTHORIZED`.
  - [x] Failed vote commands must not insert, replace, or clear any existing vote.
- [x] Guard logs and diagnostics.
  - [x] Do not log raw command payloads, snapshots, capability tokens, or selected vote values.
  - [x] If new logging is added, log only non-sensitive identifiers and status metadata.
- [x] Add automated coverage for privacy boundaries.
  - [x] Add mapper or socket tests proving pre-reveal Moderator snapshots show `hasVoted` only and no selected card values.
  - [x] Add Participant snapshot tests proving a viewer cannot inspect another user's selected card value.
  - [x] Add regression tests proving no capability tokens, `estimatedStories`, grouped counts, `votes`, or result distributions appear in Participant snapshots before reveal.
  - [x] Add unauthorized vote tests proving `UNAUTHORIZED` and unchanged vote state.
  - [x] Add or extend Playwright coverage across Moderator and Participant browser contexts for hidden-vote privacy before reveal.
- [x] Run verification.
  - [x] `cmd.exe /c npm run typecheck`
  - [x] `cmd.exe /c npm run test`
  - [x] `cmd.exe /c npm run test:e2e`

### Review Findings

- [x] [Review][Patch] Allowlist deck fields in the socket snapshot mapper [server/socket/snapshot-mapper.ts:18]
- [x] [Review][Patch] Derive sanitized snapshot voteCount from authoritative votes [server/socket/snapshot-mapper.ts:36]

## Dev Notes

### Current Implementation Baseline

- Baseline commit inspected for this story: `d4307df` (`feat: implement participant vote submission and change functionality`).
- Story 2.4 currently exists as ready-for-dev documentation but is not reflected in the inspected source. If Story 2.5 is implemented before Story 2.4, do not implement Moderator voting here; make the privacy boundary compatible with future Moderator votes. If Story 2.4 is implemented first, include the Moderator vote path in the same pre-reveal privacy rules.
- Current snapshots are status-only:
  - [src/shared/contracts/snapshots.ts](/mnt/c/Endava/EndevLocal/Build/adr-buddy/src/shared/contracts/snapshots.ts) defines `ParticipantSnapshot` with `id`, `displayName`, `role`, `connected`, and `hasVoted`.
  - [src/shared/contracts/snapshots.ts](/mnt/c/Endava/EndevLocal/Build/adr-buddy/src/shared/contracts/snapshots.ts) defines `RoundSnapshot` with `active`, `revealed`, and total `voteCount`.
  - [src/shared/schemas/session-schemas.ts](/mnt/c/Endava/EndevLocal/Build/adr-buddy/src/shared/schemas/session-schemas.ts) uses strict Zod schemas matching those fields.
- Current vote state is held server-side in `SessionState.votes: Map<string, string>` in [server/domain/session-store.ts](/mnt/c/Endava/EndevLocal/Build/adr-buddy/server/domain/session-store.ts).
- Current `submitVote` in [server/domain/session-commands.ts](/mnt/c/Endava/EndevLocal/Build/adr-buddy/server/domain/session-commands.ts) validates the participant token, writes the selected value to `session.votes`, marks the participant `hasVoted`, updates total `voteCount`, and returns the shared snapshot.
- Current Socket.IO handlers in [server/socket/register-session-handlers.ts](/mnt/c/Endava/EndevLocal/Build/adr-buddy/server/socket/register-session-handlers.ts) broadcast the returned snapshot to the whole room with `io.to(roomCode).emit('session:snapshot', snapshot)`.
- Current participant UI in [src/features/session/ParticipantSessionView.tsx](/mnt/c/Endava/EndevLocal/Build/adr-buddy/src/features/session/ParticipantSessionView.tsx) keeps the locally selected value in browser component state after a successful acknowledgement. That local state is not authoritative and must not become a room-wide snapshot field.

### Required Privacy Boundary

Use an allowlist mindset. Pre-reveal snapshots should be built from safe fields, not by cloning a domain object and deleting sensitive fields.

Recommended mapper shape:

```ts
type SnapshotViewer =
  | { role: 'moderator'; participantId: string }
  | { role: 'participant'; participantId: string }

function toPreRevealSessionSnapshot(session: SessionState, viewer: SnapshotViewer): SessionSnapshot {
  // Return only fields allowed by the public snapshot contract.
}
```

If the implementation chooses to include the viewer's own selected card value, introduce a separate viewer-specific snapshot or acknowledgement payload, for example `viewerVote: string | null`, and only emit it directly to that participant's socket. Do not add `viewerVote`, `selectedCard`, `votes`, grouped counts, or result distributions to the room-wide `SessionSnapshot`.

### Socket.IO Guidance

- Socket.IO 4.x acknowledgements are supported and are already used by the project command handlers. Keep success acknowledgements explicit and sanitized.
- Socket.IO rooms are server-only channels. `io.to(roomCode).emit(...)` sends the same payload to every socket in the room, so it must never carry viewer-specific selected card values.
- For viewer-specific data, use a direct socket acknowledgement or direct `socket.emit(...)` to the current socket, not `io.to(roomCode).emit(...)`.

References:

- Socket.IO emitting events and acknowledgements: https://socket.io/docs/v4/emitting-events/
- Socket.IO rooms: https://socket.io/docs/v4/rooms/

### Zod and Contract Guidance

- Keep schemas strict for snapshot payloads. If a new viewer-specific payload is introduced, add an explicit schema in [src/shared/schemas/session-schemas.ts](/mnt/c/Endava/EndevLocal/Build/adr-buddy/src/shared/schemas/session-schemas.ts) and parse it at the client boundary.
- Do not loosen `SessionSnapshotSchema` to pass through unknown fields; unknown sensitive fields should fail during tests rather than silently reach the UI.

Reference:

- Zod 4 API: https://zod.dev/api

### Frontend Guidance

- Keep the UI server-snapshot-driven for shared state.
- It is acceptable for the participant browser to show its own selected value from immediate local command success state, as the current implementation does, but that value must not be inferred from a shared room snapshot.
- If a viewer-specific own-vote field is added, parse it through an explicit schema and render it only for the current participant.
- Use `sessionStorage` for existing per-tab capability token handling; do not introduce durable vote storage.

References:

- React input and form control guidance: https://react.dev/reference/react-dom/components/input
- MDN `sessionStorage`: https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage

### Tests To Update Or Add

- Domain tests in [server/domain/session-commands.test.ts](/mnt/c/Endava/EndevLocal/Build/adr-buddy/server/domain/session-commands.test.ts):
  - Verify unauthorized vote commands leave `session.votes` and `hasVoted` state unchanged.
  - If Moderator vote support exists from Story 2.4, verify Moderator token mismatch returns `UNAUTHORIZED` with no vote mutation.
- Socket tests in [server/socket/register-session-handlers.test.ts](/mnt/c/Endava/EndevLocal/Build/adr-buddy/server/socket/register-session-handlers.test.ts):
  - Verify every emitted `session:snapshot` is produced by the sanitized contract.
  - Verify pre-reveal broadcasts do not contain selected card fields, `votes`, grouped counts, result distributions, `estimatedStories`, or capability tokens.
  - Avoid whole-JSON assertions against card values because `deck.values` legitimately contains card values. Assert against snapshot field paths and participant/round structures instead.
- Mapper tests, if `server/socket/snapshot-mapper.ts` is added:
  - Cover Moderator viewer, Participant viewer, and at least two participants with different submitted votes.
  - Prove participant A cannot see participant B's selected value before reveal.
  - Prove Moderator cannot see any selected value before reveal.
- E2E tests:
  - Add [tests/e2e/hidden-vote-privacy.spec.ts](/mnt/c/Endava/EndevLocal/Build/adr-buddy/tests/e2e/hidden-vote-privacy.spec.ts) or extend [tests/e2e/create-session.spec.ts](/mnt/c/Endava/EndevLocal/Build/adr-buddy/tests/e2e/create-session.spec.ts).
  - Use separate Moderator and Participant browser contexts.
  - Submit at least two distinct votes and inspect the Moderator view plus Participant view before reveal.
  - Confirm visible UI does not expose other users' selected values before reveal.

### Out Of Scope

- Revealed result grouping and result display are out of scope unless already implemented by a prior story.
- Refresh/reconnect recovery is out of scope for the MVP.
- Durable storage, account authentication, and persistent audit logs are out of scope.
- Moderator vote submission belongs to Story 2.4 unless it has already been implemented before this story begins.

## Testing

Expected verification commands:

```sh
cmd.exe /c npm run typecheck
cmd.exe /c npm run test
cmd.exe /c npm run test:e2e
```

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-07-03: Confirmed red phase for `server/socket/snapshot-mapper.test.ts` with missing mapper import.
- 2026-07-03: `cmd.exe /c npm run test -- server/socket/snapshot-mapper.test.ts` passed after mapper implementation.
- 2026-07-03: `cmd.exe /c npm run test -- server/socket/register-session-handlers.test.ts` passed after routing socket outputs through mapper.
- 2026-07-03: `cmd.exe /c npm run test -- server/domain/session-commands.test.ts` passed, covering vote authorization/no-mutation behavior.
- 2026-07-03: Final verification passed: `cmd.exe /c npm run typecheck`, `cmd.exe /c npm run test`, `cmd.exe /c npm run test:e2e`, and `cmd.exe /c npm run lint`.

### Completion Notes

- Added a dedicated allowlist snapshot mapper at the Socket.IO boundary. It maps from `SessionState` plus viewer context to the public `SessionSnapshot` contract and excludes capability tokens, raw `votes`, selected card values, grouped results, result distributions, and `estimatedStories`.
- Routed create session, join session, moderator commands, round start, and vote submit success acknowledgements/broadcasts through the mapper so room-wide `session:snapshot` emissions remain status-only before reveal.
- Preserved the existing status-only public snapshot contract and kept own selected card display as local client state from the command success path; no viewer-specific selected-card snapshot field was introduced.
- No logging was added, so no raw command payloads, snapshots, capability tokens, or vote values are logged by this change.
- Added mapper and socket regression coverage for unsafe stored snapshot fields, moderator/participant pre-reveal privacy, and capability token/result-field exclusion. Existing domain tests cover unauthorized vote no-mutation, including participant and moderator token misuse.

### File List

- _bmad-output/implementation-artifacts/2-5-enforce-pre-reveal-vote-privacy.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- server/socket/register-session-handlers.ts
- server/socket/register-session-handlers.test.ts
- server/socket/snapshot-mapper.ts
- server/socket/snapshot-mapper.test.ts

## Change Log

| Date | Version | Description | Author |
| --- | --- | --- | --- |
| 2026-07-03 | 0.1 | Initial story draft from Epic 2 requirements and current implementation context. | Scrum Master |
| 2026-07-03 | 1.0 | Implemented pre-reveal snapshot privacy mapper, routed Socket.IO outputs through it, and verified privacy/authorization coverage. | Dev Agent |
