---
baseline_commit: 5b18d4266678a5237c5c8f6260ded6f682a91c71
---

# Story 2.1: Moderator Sets Current Story And Deck

Status: ready-for-dev

Completion Note: Ultimate context engine analysis completed - comprehensive developer guide created.

## Story

As a Moderator,
I want to set the current Story and estimation Deck before voting starts,
so that everyone estimates the same work item using the same card options.

## Acceptance Criteria

1. Given the Moderator is in a Session with no active Round, when they enter or update a Story identifier and brief description, then the server stores the current Story for the Session, and Moderator and Participant snapshots show the same Story identifier and description.
2. Given the Moderator is in a Session with no active Round, when they select the T-shirt Deck, then the active Deck contains `XS`, `S`, `M`, `L`, and `XL`, and all joined users see those same card options.
3. Given the Moderator is in a Session with no active Round, when they select the Fibonacci Deck, then the active Deck contains `1`, `2`, `3`, `5`, `8`, `13`, `21`, and `Coffee`, and all joined users see those same card options.
4. Given the Moderator attempts to update the Story or Deck during an active Round, when the command is processed, then the server rejects the change with a stable error code such as `STORY_LOCKED`, and no current Story, Deck, Vote, or Round state is changed.
5. Given a Participant attempts to update the Story or Deck, when the command is processed, then the server rejects the command with `UNAUTHORIZED`, and the Participant UI does not expose Story or Deck editing controls.

## Tasks / Subtasks

- [ ] Add shared command contracts for story/deck updates. (AC: 1-5)
  - [ ] Promote `story:update` payloads to a shared command schema and strict payload type instead of the current inline event payload typing.
  - [ ] Add a strict `deck:select` command schema using the existing `PlanningDeckIdSchema`.
  - [ ] Include `moderatorToken` in both command payloads so authorization stays server-enforced and does not depend on socket identity alone.
  - [ ] Keep acknowledgement shapes as `{ ok: true, data }` or `{ ok: false, error }`; do not introduce ad hoc response formats.
- [ ] Implement server-side domain behavior for story/deck changes. (AC: 1-4)
  - [ ] Add domain commands in `server/domain/session-commands.ts` for story update and deck selection.
  - [ ] Authorize these commands with the stored moderator token and reject invalid tokens with `UNAUTHORIZED`.
  - [ ] Reject story/deck changes when `snapshot.round.active === true` with `STORY_LOCKED`.
  - [ ] Preserve existing votes, round flags, participant list, and estimated stories when changing story/deck outside an active round.
  - [ ] Update `snapshot.story`, `snapshot.deck`, and `snapshot.updatedAt` only through the domain layer.
- [ ] Wire Socket.IO handlers for `story:update` and `deck:select`. (AC: 1-5)
  - [ ] Extend `server/socket/register-session-handlers.ts` to validate, authorize, delegate to domain commands, acknowledge the caller, and emit the resulting sanitized `session:snapshot` to the room.
  - [ ] Keep handlers thin; do not mutate session state directly in the socket layer.
  - [ ] Reuse stable error codes from `src/shared/contracts/errors.ts`; add no new transport channel or REST endpoint.
- [ ] Add Moderator story/deck controls in the session UI. (AC: 1-4)
  - [ ] Update `src/features/session/ModeratorSessionView.tsx` to render an editable current-story form with Story identifier and brief description fields.
  - [ ] Add Deck selection controls that clearly switch between the existing shared Fibonacci and T-shirt decks.
  - [ ] Read the moderator token from `sessionStorage` and send it with `story:update` and `deck:select` commands through `useSessionSocket`.
  - [ ] Show pending/disabled states while acknowledgements are in flight and avoid optimistic authority-sensitive UI updates.
  - [ ] Keep the existing room code, participant presence, and missing-session behavior intact.
- [ ] Keep Participant UI read-only and synchronized. (AC: 1, 2, 3, 5)
  - [ ] Update `src/features/session/ParticipantSessionView.tsx` to display the current Story identifier and description from the server snapshot.
  - [ ] Continue rendering the active deck from `snapshot.deck`; do not add story/deck editing controls to the Participant view.
  - [ ] Ensure Moderator-only tokens, edit actions, and internal metadata remain absent from Participant rendering.
- [ ] Extend the socket client helper to support moderator commands. (AC: 1-5)
  - [ ] Add typed `updateStory` and `selectDeck` helpers to `src/features/session/useSessionSocket.ts`.
  - [ ] Validate successful acknowledgements using shared schemas before updating local caller state.
  - [ ] Preserve existing create/join behavior and the validated `session:snapshot` listener.
- [ ] Add focused automated coverage. (AC: 1-5)
  - [ ] Add schema tests for story/deck update payloads and acknowledgement parsing.
  - [ ] Add domain tests for authorized Moderator updates, unauthorized attempts, and `STORY_LOCKED` behavior.
  - [ ] Add socket handler tests proving valid Moderator commands broadcast the room snapshot and invalid/participant commands return stable errors without mutation.
  - [ ] Add component tests for Moderator edit controls, pending states, and Participant read-only rendering.
  - [ ] Add or update Playwright coverage for Moderator editing Story/Deck and Participant near-real-time visibility.
- [ ] Verify the story end to end. (AC: 1-5)
  - [ ] Run `npm run typecheck`.
  - [ ] Run `npm run test`.
  - [ ] Run `npm run build`.
  - [ ] Run `npm run lint`.
  - [ ] Run `npm run test:e2e` after browser coverage is updated.
  - [ ] Confirm no unchecked tasks remain before moving the story to `in-progress` or `review`.

## Dev Notes

### Current Repository State

- Epic 1 is implemented through Story 1.4 and already established the live room foundation, participant presence UI, shared deck definitions, token storage helpers, and server-authoritative snapshot flow.
- `server/domain/session-commands.ts` currently supports `createSession`, `joinSession`, and participant removal only. Story/deck mutation does not exist yet, so Story 2.1 must add it in the domain layer rather than embedding logic in socket handlers or React components.
- `server/socket/register-session-handlers.ts` currently registers `session:create` and `session:join` only. The file already follows the correct pattern for this story: validate input, rate-limit, call domain logic, ack, then emit `SERVER_EVENTS.sessionSnapshot`.
- `src/features/session/ModeratorSessionView.tsx` currently shows room code, an empty "No active story yet" state, and participant presence, but no story/deck editing controls.
- `src/features/session/ParticipantSessionView.tsx` already renders deck values and a placeholder active-story state. It needs current Story identifier/description display but must remain read-only.
- `src/features/session/useSessionSocket.ts` currently exposes only `createSession` and `joinSession`. Story 2.1 should extend this hook rather than introducing a second socket abstraction.

### Story Scope Boundaries

- In scope: Moderator-only story identifier/description updates, Moderator-only deck selection, shared snapshot propagation, round-lock enforcement, authorization enforcement, pending UI, and automated tests.
- Out of scope: starting rounds, vote submission, reveal, final estimate capture, estimated story history, reconnect recovery, disconnect presence transitions, persistence, Redis, analytics, and any change to create/join flows beyond what is required to support moderator commands.
- Do not introduce backlog integration, route changes, new top-level stores, REST endpoints for story/deck changes, or a second realtime channel.
- Do not upgrade libraries just because newer versions exist; this story should use the repo’s installed dependencies unless a blocking defect requires otherwise.

### Architecture Compliance

- Keep Socket.IO as the authoritative live Session API; story/deck changes must be commands over `story:update` and `deck:select`, not REST mutations or client-only state changes. [Source: `_bmad-output/planning-artifacts/architecture.md#api--communication-patterns`]
- Keep all authoritative state transitions in the domain layer. Socket handlers validate, authorize, delegate, and broadcast snapshots only. [Source: `_bmad-output/planning-artifacts/architecture.md#api--communication-patterns`]
- Keep React snapshot-driven. Moderator UI can show pending submission state, but accepted state must come from the acknowledged server snapshot rather than optimistic mutation. [Source: `_bmad-output/planning-artifacts/architecture.md#frontend-architecture`]
- Use capability-token authorization. Moderator-only commands require a valid `moderatorToken`, stored in browser `sessionStorage`, not `localStorage`. [Source: `_bmad-output/planning-artifacts/architecture.md#authentication--security`]
- Preserve v1 ephemerality and the existing `SessionStore` abstraction; do not add database state or durable storage. [Source: `_bmad-output/planning-artifacts/architecture.md#data-architecture`]

### Existing Files To Update Carefully

- `src/shared/schemas/command-schemas.ts`
  - Current state: has `CreateSessionCommandSchema`, `JoinSessionCommandSchema`, `UpdateStoryCommandSchema`, and `SubmitVoteCommandSchema`, but no shared schema for deck selection and no moderator-token-bearing command payloads.
  - Change needed: add or refine shared command schemas for story/deck updates with strict validation and room-code/deck-id reuse.
  - Preserve: existing create/join validation semantics and `PlanningDeckIdSchema`.
- `src/shared/contracts/socket-events.ts`
  - Current state: `story:update` and `deck:select` are typed inline without token-aware shared command types.
  - Change needed: align event payloads and acknowledgement types to the new shared schemas/types.
  - Preserve: stable event names and `session:snapshot` broadcast contract.
- `server/domain/session-commands.ts`
  - Current state: owns session creation/join and snapshot updates for those flows.
  - Change needed: add pure, testable story/deck mutation commands with authorization and `STORY_LOCKED` checks.
  - Preserve: token-free snapshots, shared deck definitions from `src/shared/domain/decks.ts`, and `updatedAt` handling.
- `server/socket/register-session-handlers.ts`
  - Current state: only create/join handlers are implemented.
  - Change needed: register `story:update` and `deck:select` using the same ack/broadcast pattern as existing handlers.
  - Preserve: thin handlers, rate limiting style, stable error acknowledgements, and room-scoped snapshot broadcasts.
- `src/features/session/useSessionSocket.ts`
  - Current state: one provider owns the socket connection, validated snapshot listener, and create/join command helpers.
  - Change needed: add typed helpers for Moderator story/deck commands and keep the same timeout/validation behavior.
  - Preserve: single shared socket, validated snapshot parsing, and connection-unavailable fallback ack.
- `src/features/session/ModeratorSessionView.tsx`
  - Current state: reads moderator token and selected snapshot; displays room code, no-active-story placeholder, and participant presence.
  - Change needed: add editable current story form, deck selector, pending/disabled command UX, and readable error feedback.
  - Preserve: room code copy behavior, missing-session guard, latest-snapshot preference, and participant presence rendering.
- `src/features/session/ParticipantSessionView.tsx`
  - Current state: shows current deck, round state, own vote state, and no-active-story placeholder.
  - Change needed: render the current Story identifier and description from shared snapshot data while keeping the view read-only.
  - Preserve: absence of Moderator controls, route-state fallback, and deck rendering from `snapshot.deck`.

### Files Expected To Remain Unchanged Unless A Defect Is Found

- `src/shared/domain/decks.ts`
  - Current shared deck definitions already satisfy the required card sets for Fibonacci and T-shirt decks.
  - Reuse `PLANNING_DECKS`, `PLANNING_DECK_ID_VALUES`, and `DEFAULT_DECK_ID`; do not create duplicate deck constants in the UI or server.
- `src/shared/contracts/snapshots.ts`
  - Current snapshot shape already carries `story`, `deck`, `participants`, `round`, and `updatedAt`.
  - Only change this file if implementation reveals a missing field that is truly required by the acceptance criteria.
- `src/features/session/session-storage.ts`
  - Current helpers already store and read moderator/participant capability tokens from `sessionStorage`.
  - Reuse `readModeratorToken`; do not move tokens into URLs, route state, local storage, or snapshots.

### Implementation Guidance

- Prefer command payloads like:

```ts
type UpdateStoryCommand = {
  roomCode: string
  moderatorToken: string
  storyId: string
  title: string
}

type SelectDeckCommand = {
  roomCode: string
  moderatorToken: string
  deckId: PlanningDeckId
}
```

- Story update should map into the existing snapshot `story` shape:

```ts
story: {
  id: storyId,
  title,
  locked: false,
}
```

- When a round is active, reject both story and deck changes before mutation. This should leave `snapshot.story`, `snapshot.deck`, `round`, `votes`, and `updatedAt` unchanged except where the command is accepted.
- If the round is inactive, keep `story.locked` aligned with actual round state. The simplest implementation is:
  - `locked: false` when round inactive.
  - Later stories can flip this during round start/reset transitions.
- Do not infer Moderator authority from React route alone. Always authorize on the server using the stored moderator token.
- Do not add hidden vote data, moderator tokens, or participant tokens to `session:snapshot`.

### Cross-Story Intelligence

- Story 1.3 established the participant/session token storage pattern and room snapshot emission on join; Story 2.1 should follow the same “store token locally, keep snapshot token-free” rule.
- Story 1.4 established the current Moderator room layout and snapshot preference rules. Story 2.1 should extend that screen instead of replacing it.
- Existing domain and socket tests already use the harness pattern in `server/socket/register-session-handlers.test.ts`; reuse that style for new story/deck command coverage.
- Existing component tests already mock `useSessionSocket`; reuse that pattern for Moderator and Participant UI coverage rather than standing up a real socket.

### Git Intelligence

- Recent commits show the implementation pattern to follow:
  - `5b18d42 Add participant presence to moderator session view`
  - `5e94a0e feat: implement participant session functionality and UI`
  - `ef77066 feat: complete moderator session creation story`
  - `3908877 feat: update last_updated timestamp and change participant join story status to ready-for-dev`
  - `500c4a8 feat: update session creation story status to in-progress and add review findings`
- The current codebase already uses shared contracts plus test-first slices around domain, socket, component, and Playwright coverage. Story 2.1 should keep that shape rather than landing as an untested UI-only change.

### Latest Technical Notes Checked On 2026-07-02

- Vite’s current docs show `v8.1.2`, the `react-ts` template remains supported, and current Node compatibility remains `20.19+` or `22.12+`. The repo already aligns with that Node floor in `package.json`, so no runtime upgrade is needed for this story. Source: [Vite Getting Started](https://vite.dev/guide/)
- Socket.IO v4 docs still describe acknowledgements and room-based broadcasting exactly in the pattern this repo is already using. Continue using `.timeout(ms).emit(...)` on the client and `io.to(roomCode).emit(...)` on the server. Source: [Socket.IO v4 Docs](https://socket.io/docs/v4/)
- Zod 4 remains the active validation family in the official docs, which matches the repo’s installed `zod@^4.1.13`. Add new command schemas in the same Zod style rather than mixing validators. Source: [Zod Docs](https://zod.dev/)
- The repo currently installs `react-router-dom@^7.18.0`. Even though architecture research previously referenced newer docs, this story should stay on the installed router version and avoid opportunistic upgrades. Inference from local `package.json` plus current official docs.
- Helmet’s docs still recommend `app.use(helmet())` and note that some headers, especially `upgrade-insecure-requests`, may need care in development. This story should not change server security middleware unless story/deck handlers reveal a concrete defect. Source: [Helmet Docs](https://helmetjs.github.io/)

### Project Structure Notes

- Expected update locations:

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
  ParticipantSessionView.test.tsx
  useSessionSocket.ts
  useSessionSocket.test.tsx
tests/e2e/
  create-session.spec.ts
```

- Keep unit/component tests co-located and browser flow tests under `tests/e2e`.
- Avoid new top-level folders, duplicate deck metadata, and duplicate token helpers.

### References

- `_bmad-output/planning-artifacts/epics.md#story-21-moderator-sets-current-story-and-deck`
- `_bmad-output/planning-artifacts/prds/prd-adr-buddy-2026-06-16/prd.md#fr-4-set-current-story`
- `_bmad-output/planning-artifacts/prds/prd-adr-buddy-2026-06-16/prd.md#fr-5-select-deck`
- `_bmad-output/planning-artifacts/prds/prd-adr-buddy-2026-06-16/prd.md#fr-8-restrict-round-controls-to-moderator`
- `_bmad-output/planning-artifacts/prds/prd-adr-buddy-2026-06-16/prd.md#cross-cutting-non-functional-requirements`
- `_bmad-output/planning-artifacts/architecture.md#authentication--security`
- `_bmad-output/planning-artifacts/architecture.md#api--communication-patterns`
- `_bmad-output/planning-artifacts/architecture.md#frontend-architecture`
- `_bmad-output/planning-artifacts/architecture.md#project-structure--boundaries`
- `_bmad-output/implementation-artifacts/1-4-moderator-sees-participant-presence.md`
- `_bmad-output/implementation-artifacts/1-3-participant-joins-a-session.md`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-07-02: Resolver fallback used because the skill’s Python customization script could not run in this Windows workspace; customization was resolved manually from TOML files.
- 2026-07-02: No `project-context.md` file was found from the configured persistent-facts glob.
- 2026-07-02: Loaded epic, PRD, architecture, sprint status, Story 1.4, current socket/domain/shared contract files, session views, session storage helpers, tests, package dependencies, and recent git history.
- 2026-07-02: Confirmed Epic 2 Story 1 is the next backlog item and that Epic 2 must move from `backlog` to `in-progress` when this story file is created.

### Implementation Plan

- Add shared moderator command schemas/types and domain command coverage first.
- Implement socket handlers and `useSessionSocket` support for story/deck commands with stable acknowledgement handling.
- Extend Moderator and Participant session views to render editable/read-only story/deck state with pending/error UX.
- Add domain, socket, component, and Playwright coverage, then run the required verification suite.

### Completion Notes List

- Created Story 2.1 developer context for Moderator-only current Story and deck selection.
- Included authorization, round-lock, snapshot-sanitization, and UI/state-management guardrails tied to the current codebase.
- Included implementation and testing guidance covering shared schemas, domain logic, socket handlers, Moderator UI, Participant UI, and browser-flow verification.

### File List

- `_bmad-output/implementation-artifacts/2-1-moderator-sets-current-story-and-deck.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Change Log

- 2026-07-02: Created Story 2.1 developer context and marked it ready for development.
