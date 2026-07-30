---
baseline_commit: 5e94a0e5671d08f836fab7ae5aae179e665e3a37
---

# Story 1.4: Moderator Sees Participant Presence

Status: done

Completion Note: Ultimate context engine analysis completed - comprehensive developer guide created.

## Story

As a Moderator,
I want to see who has joined the Session,
so that I can confirm the team is present before estimation begins.

## Acceptance Criteria

1. Given Participants have joined a Session, when the Moderator session view receives a Session snapshot, then the Moderator sees a participant presence list with display names, and duplicate Display Names appear with their disambiguated labels.
2. Given a Round has not started, when the Moderator views participant presence, then each joined Participant is visible, and no selected Card values are shown.
3. Given a Participant joins after the Moderator is already in the Session, when the join command is accepted, then the Moderator receives a near-real-time snapshot update, and the new Participant appears without the Moderator refreshing the page.

## Tasks / Subtasks

- [x] Confirm Story 1.3 join behavior and snapshot contract before coding. (AC: 1-3)
  - [x] Re-read `_bmad-output/implementation-artifacts/1-3-participant-joins-a-session.md` Dev Agent Record and Review Findings before implementation.
  - [x] Verify current `session:join` already emits `SERVER_EVENTS.sessionSnapshot` to `io.to(roomCode)` after an accepted join.
  - [x] Verify `SessionSnapshot.participants` already contains token-free `displayName`, `role`, `connected`, and `hasVoted` fields.
  - [x] Do not add a separate presence transport, REST endpoint, polling loop, or duplicate client store.
- [x] Add Moderator presence UI driven by the latest server snapshot. (AC: 1, 2)
  - [x] Update `src/features/session/ModeratorSessionView.tsx` to render a participant presence section from the selected `SessionSnapshot`.
  - [x] Show Participant display names using their already-disambiguated `snapshot.participants[].displayName` values.
  - [x] Exclude or clearly separate the Moderator identity from the Participant presence list; the story requirement is joined Participants.
  - [x] Show an empty/waiting state when no Participants with `role === 'participant'` have joined.
  - [x] For each Participant, show joined/connected presence and voting status only, using `connected` and `hasVoted`.
  - [x] Do not render selected Card values, capability tokens, raw socket ids, participant tokens, moderator tokens, or internal identity metadata.
  - [x] Preserve existing room code copy behavior, missing-session behavior, route-state fallback, and latest-snapshot preference.
- [x] Keep the UI responsive and accessible. (AC: 1-3)
  - [x] Use semantic headings/list markup or equivalent accessible structure for the presence list.
  - [x] Ensure duplicate and long display names wrap or truncate cleanly without overlapping on mobile widths.
  - [x] Ensure voting status is understandable as text and does not rely on color alone.
  - [x] Keep controls as real buttons where controls exist; this story should not add Moderator command controls.
- [x] Add focused automated coverage. (AC: 1-3)
  - [x] Update `src/features/session/ModeratorSessionView.test.tsx` to cover an empty participant presence state.
  - [x] Add component coverage showing multiple Participants, including duplicate labels such as `Maxi` and `Maxi (2)`.
  - [x] Add component coverage proving selected Card values, Moderator/Participant tokens, and Moderator-only hidden data are not rendered.
  - [x] Add component coverage proving the view prefers a newer `latestSnapshot` over the route-state snapshot when both match the room.
  - [x] Update Playwright coverage in `tests/e2e/create-session.spec.ts` or add a focused presence spec proving a Participant joining after the Moderator page is open appears on the Moderator page without refresh.
- [x] Verify the story end to end. (AC: 1-3)
  - [x] Run `npm run typecheck`.
  - [x] Run `npm run test`.
  - [x] Run `npm run build`.
  - [x] Run `npm run lint`.
  - [x] Run `npm run test:e2e` after e2e coverage is added or updated.
  - [x] Confirm no unchecked tasks remain before moving the story to review.

### Review Findings

- [x] [Review][Patch] Component presence test does not assert statuses within each participant row [`src/features/session/ModeratorSessionView.test.tsx`:109]
- [x] [Review][Patch] E2E presence status assertions are not scoped to the joined participant row [`tests/e2e/create-session.spec.ts`:47]
- [x] [Review][Patch] Announce live presence changes to assistive technologies — the dynamically updated participant list has no `aria-live` or equivalent announcement mechanism, so screen-reader users are not notified when someone joins or their presence status changes. [`src/features/session/ModeratorSessionView.tsx`:86]
- [x] [Review][Patch] Add component coverage for live snapshot updates — the presence tests render only static mocked snapshots and do not verify the component reflects a changed `latestSnapshot` after initial render. [`src/features/session/ModeratorSessionView.test.tsx`:117-155]
- [x] [Review][Patch] Assert the moderator is excluded from the participant list — both presence tests include a moderator fixture but do not assert the moderator name is absent from the rendered participant list, leaving the participant-only contract under-protected. [`src/features/session/ModeratorSessionView.test.tsx`:~75; tests/e2e/create-session.spec.ts:47-53]

## Dev Notes

### Current Repository State

- Story 1.3 is `done` and implemented the Participant join flow.
- Current join flow already creates Participant identities, disambiguates duplicate Display Names, stores Participant tokens internally, and keeps public snapshots token-free.
- `server/socket/register-session-handlers.ts` already emits `io.to(domainResult.data.roomCode).emit(SERVER_EVENTS.sessionSnapshot, domainResult.data.snapshot)` after successful `session:join`. Story 1.4 should use that existing room broadcast path for near-real-time Moderator updates.
- `src/features/session/useSessionSocket.ts` now uses a `SessionSocketProvider` with one live socket across route navigation. `ModeratorSessionView` consumes `latestSnapshot` from this provider and falls back to the snapshot in route state.
- `src/features/session/ModeratorSessionView.tsx` currently shows the room code and the empty active-story state, but does not render joined Participants.
- `src/features/session/ParticipantSessionView.tsx` already renders a Participant room from route state/latest snapshot and hides Moderator-only controls.
- Existing e2e coverage creates a Moderator Session and has a separate Participant join flow, but it does not yet assert that the Moderator page updates with the joined Participant without refresh.

### Story Scope Boundaries

- In scope: Moderator-visible participant presence list, display names including duplicate disambiguated labels, joined/connected status, `hasVoted` status text, empty state, live update from `session:snapshot`, responsive/accessibility polish, and tests.
- Out of scope: starting Rounds, submitting Votes, selected Card display, online/offline diagnostics beyond the current `connected` flag, reconnect recovery, leave/disconnect presence transitions, Moderator command authorization changes, persistence, Redis, database storage, analytics, and full voting-status semantics beyond the current `hasVoted` snapshot field.
- This story must not expose hidden Vote values. Story 2.3 and Story 2.5 will deepen voting status and hidden-vote privacy later.
- Do not alter the join command contract unless tests reveal a genuine defect. Presence should be derived from `SessionSnapshot.participants`.

### Architecture Compliance

- Keep Socket.IO as the authoritative live Session API; do not add REST endpoints or polling for presence. [Source: `_bmad-output/planning-artifacts/architecture.md#api-communication-patterns`]
- Keep the server-authoritative snapshot model. React renders the latest `session:snapshot`; UI components do not mutate Session state. [Source: `_bmad-output/planning-artifacts/architecture.md#frontend-architecture`]
- Keep public snapshots free of capability tokens and hidden Vote values. [Source: `_bmad-output/planning-artifacts/architecture.md#api-communication-patterns`]
- Keep Moderator-only data out of Participant snapshots; this story reads Moderator UI from the existing snapshot shape and must not create a second private data channel. [Source: `_bmad-output/planning-artifacts/architecture.md#api-communication-patterns`]
- Preserve folder boundaries: UI in `src/features/session`, shared contracts in `src/shared`, transport handling in `server/socket`, and domain state in `server/domain`. [Source: `_bmad-output/planning-artifacts/architecture.md#project-structure-boundaries`]
- Do not introduce persistence. v1 Session lifecycle remains live and ephemeral. [Source: `_bmad-output/planning-artifacts/prds/prd-adr-buddy-2026-06-16/prd.md#cross-cutting-non-functional-requirements`]

### Existing Files To Update Carefully

- `src/features/session/ModeratorSessionView.tsx`
  - Current state: selects a snapshot from `latestSnapshot` first, then route state; renders room code copy and no-active-story state.
  - Change needed: add a presence section derived from `snapshot.participants.filter((p) => p.role === 'participant')`.
  - Preserve: missing-session guard, moderator token check via `readModeratorToken`, room code copy behavior with guarded Clipboard API, route-state fallback, and no token rendering.
- `src/features/session/ModeratorSessionView.test.tsx`
  - Current state: covers room code/empty story, missing state, and clipboard failure.
  - Change needed: add presence list tests, duplicate-name display, absence of selected Card/token text, and latest-snapshot preference.
  - Preserve: storage setup with `moderatorTokenStorageKey` and router-based rendering.
- `src/app/styles.css`
  - Current state: contains global styles for app shell, create/join, Moderator and Participant room states.
  - Change needed: add styles for the presence list/status chips if needed.
  - Preserve: mobile-safe room-code layout and existing participant join/session styles.
- `tests/e2e/create-session.spec.ts`
  - Current state: has create-session and participant-join flows.
  - Change needed: assert the existing Moderator page shows the Participant after the join without reload, preferably inside the existing multi-context participant join test.
  - Preserve: token storage checks proving Participant token is in `sessionStorage` and `localStorage` is empty.

### Files Expected To Remain Unchanged Unless A Defect Is Found

- `server/socket/register-session-handlers.ts`
  - Current join handler already broadcasts the sanitized snapshot to the room after accepted joins.
  - Only change this file if tests prove the Moderator socket does not receive join snapshots.
- `server/domain/session-commands.ts`
  - Current `joinSession` already appends Participants to `snapshot.participants` with role `participant`, connected `true`, hasVoted `false`, and disambiguated display names.
  - Do not add voting behavior here for Story 1.4.
- `src/shared/contracts/snapshots.ts` and `src/shared/schemas/session-schemas.ts`
  - Current snapshot participant shape is sufficient for presence: `id`, `displayName`, `role`, `connected`, and `hasVoted`.
  - Do not add token fields or selected Card fields to snapshots.
- `src/features/session/useSessionSocket.ts`
  - Current provider listens for `SERVER_EVENTS.sessionSnapshot` and stores a validated `latestSnapshot`.
  - Only change this file if the live update test reveals provider/listener behavior is broken.

### Presence Display Guidance

- Suggested structure:

```tsx
const participants = snapshot.participants.filter((participant) => participant.role === 'participant')
```

- Empty state copy should be direct, for example: `No participants have joined yet.`
- For joined Participants, show display name and status text:
  - Connected: `Joined` or `Present`
  - Disconnected/future state: `Away` only if `connected === false`
  - Vote status: `Voted` when `hasVoted === true`; otherwise `Not voted`
- Until voting stories exist, `Not voted` is acceptable even before a Round starts, but the UI should not imply a selected Card exists.
- Do not show selected Card values in this story. Future voting stories may enrich `hasVoted`; selected values remain hidden until reveal.

### Previous Story Intelligence

- Story 1.3 final implementation added:
  - `JoinSessionResult` and `JoinSessionResultSchema`
  - Participant token helpers in `session-storage.ts`
  - `joinSession` domain behavior behind `SessionStore`
  - Socket.IO `session:join` with ack timeouts, rate limiting, stable errors, and room snapshot emission
  - `ParticipantSessionView`
  - Playwright coverage for Moderator create plus Participant join
- Story 1.3 review fixes are relevant here:
  - The live socket provider must stay mounted across navigation so Moderator and Participant views receive room snapshots.
  - Failed participant joins are rolled back and should not appear as stale presence entries.
  - Duplicate Display Name suffixing is capped to the display-name schema limit.
  - Participant view renders Deck options and hides Moderator-only controls; keep Moderator presence similarly constrained to presence fields only.
- Validation after Story 1.3 review passed: focused Vitest slice, `npm run typecheck`, `npm run test`, `npm run build`, `npm run lint`, and `npm run test:e2e`.

### Git Intelligence

- Recent commits:
  - `5e94a0e feat: implement participant session functionality and UI`
  - `ef77066 feat: complete moderator session creation story`
  - `3908877 feat: update last_updated timestamp and change participant join story status to ready-for-dev`
  - `500c4a8 feat: update session creation story status to in-progress and add review findings`
  - `c0e8f1e feat: implement session creation and management features`
- Current worktree was clean before this story file was generated.

### Latest Technical Notes Checked On 2026-07-02

- Socket.IO v4 acknowledgements support callback responses and `.timeout(ms).emit(...)`; the existing `useSessionSocket` follows this for create/join commands. Source: https://socket.io/docs/v4/emitting-events/
- Socket.IO rooms are server-side channels; `socket.join(roomCode)` subscribes a socket and `io.to(roomCode).emit(...)` broadcasts to sockets in that room. The client does not manage room membership directly. Source: https://socket.io/docs/v4/rooms/
- MDN documents `sessionStorage` as origin and tab scoped. Presence UI must not move capability tokens into `localStorage`, URLs, snapshots, or visible text. Source: https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage
- Current project dependencies include `react@^19.2.6`, `react-router-dom@^7.18.0`, `socket.io@^4.8.1`, `socket.io-client@^4.8.3`, `zod@^4.1.13`, `vitest@^4.0.16`, and `@playwright/test@^1.57.0`; do not add new dependencies for this story.

### Project Structure Notes

- Expected update locations:

```text
src/features/session/
  ModeratorSessionView.tsx
  ModeratorSessionView.test.tsx
src/app/
  styles.css
tests/e2e/
  create-session.spec.ts
```

- Keep tests co-located for component coverage and under `tests/e2e` for browser flows.
- Do not create new top-level folders, a second socket hook, or a separate presence store.

### References

- `_bmad-output/planning-artifacts/epics.md#story-14-moderator-sees-participant-presence`
- `_bmad-output/planning-artifacts/prds/prd-adr-buddy-2026-06-16/prd.md#fr-3-show-participant-presence`
- `_bmad-output/planning-artifacts/prds/prd-adr-buddy-2026-06-16/prd.md#cross-cutting-non-functional-requirements`
- `_bmad-output/planning-artifacts/architecture.md#api-communication-patterns`
- `_bmad-output/planning-artifacts/architecture.md#frontend-architecture`
- `_bmad-output/planning-artifacts/architecture.md#project-structure-boundaries`
- `_bmad-output/implementation-artifacts/1-3-participant-joins-a-session.md#completion-notes-list`
- `_bmad-output/implementation-artifacts/1-3-participant-joins-a-session.md#review-findings`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-07-02: Resolver fallback used because `python3` is unavailable in the Windows shell; manually loaded workflow customization files.
- 2026-07-02: No `project-context.md` file found from persistent facts glob.
- 2026-07-02: Loaded epics, PRD, architecture, Story 1.3, current Moderator/Participant/socket files, package dependencies, e2e tests, and git history.
- 2026-07-02: Confirmed Story 1.3 review findings were resolved and that `session:join` emits a token-free room snapshot containing participant `displayName`, `role`, `connected`, and `hasVoted`.

### Implementation Plan

- Add failing Moderator presence component tests for empty state, duplicate participant labels, sensitive-data hiding, and latest-snapshot preference.
- Render participant presence from the selected server snapshot without adding transport, polling, REST, or a separate client store.
- Add responsive styles for semantic presence list markup and extend Playwright join coverage to assert live Moderator updates.
- Run the full required validation suite before moving the story to review.

### Completion Notes List

- Created Story 1.4 developer context for Moderator participant presence.
- Included implementation guardrails to reuse existing Story 1.3 join snapshot broadcast and token-free snapshot contract.
- Included testing guidance for component coverage and e2e live update verification.
- Implemented Moderator participant presence from the latest selected `SessionSnapshot`, filtering to `role === 'participant'` and showing only display name, joined/away state, and voted/not-voted text.
- Added empty-state, duplicate-label, sensitive-data hiding, and latest-snapshot preference coverage for `ModeratorSessionView`.
- Extended Playwright coverage so a Participant joining after the Moderator page is already open appears on the Moderator page without refresh.
- Validation passed: `npm run typecheck`, `npm run test`, `npm run build`, `npm run lint`, and `npm run test:e2e`.

### File List

- `_bmad-output/implementation-artifacts/1-4-moderator-sees-participant-presence.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `src/app/styles.css`
- `src/features/session/ModeratorSessionView.test.tsx`
- `src/features/session/ModeratorSessionView.tsx`
- `tests/e2e/create-session.spec.ts`

## Change Log

- 2026-07-02: Created Story 1.4 developer context for Moderator participant presence.
- 2026-07-02: Implemented Moderator participant presence UI, automated coverage, and moved story to review.
