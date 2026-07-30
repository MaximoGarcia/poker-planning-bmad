---
baseline_commit: dde150de9ac052c0361d65bf6123ea870a9cce9d
---

# Story 3.2: Users Read Grouped Vote Results

Status: done

Completion Note: Ultimate context engine analysis completed - comprehensive developer guide created.

## Story

As a team member,
I want revealed Votes grouped or ordered by count,
so that consensus and outliers are obvious without manual counting.

## Acceptance Criteria

1. Given Results are revealed for a Round, when the Results view renders, then selected Cards are grouped or ordered by number of Votes, and the most common selected Cards are easiest to identify.
2. Given Votes include more than one selected Card, when the Results view renders, then outlier selections remain visible, and each group identifies which users selected that Card.
3. Given the active Deck is T-shirt, when Results are grouped, then the view supports `XS`, `S`, `M`, `L`, and `XL` values, and no unsupported Card value appears.
4. Given the active Deck is Fibonacci, when Results are grouped, then the view supports `1`, `2`, `3`, `5`, `8`, `13`, `21`, and `Coffee`, and `Coffee` is treated as a valid Card.
5. Given users view Results on desktop or mobile widths, when the Results view renders, then grouped Results remain readable and usable, and no result labels, user names, or card values overlap incoherently.
6. Given the Results view uses visual emphasis, when a user reads the distribution, then the majority and outlier information is understandable without relying on color alone, and screen-reader-readable text labels are available for the grouped Results.

## Tasks / Subtasks

- [x] Confirm dependency readiness and shape from Story 3.1. (AC: 1-6)
  - [x] Verify Story 3.1 is implemented before starting this story, or implement this story against the exact Story 3.1 contract if both are completed together.
  - [x] Confirm `SessionSnapshot` has `results: RevealedResultsSnapshot | null`, with `results === null` before reveal and `results.votes` after reveal.
  - [x] Confirm each revealed vote has stable identity and value fields equivalent to `{ participantId, displayName, role, value }`.
  - [x] Do not infer hidden vote values from `participants`, `round.voteCount`, local selected state, or socket events before reveal.
- [x] Add deterministic result grouping logic. (AC: 1-4, 6)
  - [x] Add a pure helper under `src/features/results` such as `group-revealed-votes.ts`, or under `src/shared/domain/result-aggregation.ts` if both client and server need it.
  - [x] Input should be the active `PlanningDeck` and the revealed votes from `snapshot.results.votes`.
  - [x] Validate group values against `snapshot.deck.values`; unsupported values must not render as valid groups. Prefer filtering plus a defensive test rather than throwing in the UI path.
  - [x] Preserve deck order as the secondary ordering so ties are stable and predictable.
  - [x] Sort groups by vote count descending first so majority groups are easiest to identify.
  - [x] Mark all groups tied for highest count as majority when count is greater than zero.
  - [x] Mark groups with lower counts as outliers when there is more than one selected-card group.
  - [x] Return user display names inside each group sorted by the revealed vote order or by display name; choose one deterministic rule and test it.
- [x] Create reusable grouped results UI. (AC: 1-6)
  - [x] Create `src/features/results/VoteGroupList.tsx` or `ResultsSummary.tsx` using the grouping helper.
  - [x] Render nothing or an explicit empty revealed state when `snapshot.results` is `null`; never render partial pre-reveal distributions.
  - [x] For each card group, show the card value, count, majority/outlier status text, and the display names that selected that card.
  - [x] Include screen-reader-readable labels such as "Majority: 3 votes for 5 by Alex, Sam, Priya" rather than relying on color or position.
  - [x] Use semantic lists or regions with stable React keys based on card value and participant ids, not array indices.
  - [x] Keep the component presentational: it should not emit socket commands, mutate snapshots, or own authoritative state.
- [x] Replace the flat post-reveal display from Story 3.1 in Moderator and Participant views. (AC: 1-6)
  - [x] Update `src/features/session/ModeratorSessionView.tsx` to render the grouped results component when `snapshot.round.revealed` and `snapshot.results` are available.
  - [x] Update `src/features/session/ParticipantSessionView.tsx` to render the same grouped results component after reveal.
  - [x] Preserve Moderator controls: Story/Deck edit, Start Round, Reveal, and participant presence must keep their existing enablement and error behavior.
  - [x] Preserve Participant controls: Participants must not receive reveal, reset, advance, or final-estimate controls.
  - [x] Preserve non-voter visibility through the existing participant list/status; do not assign non-voters a fake card group.
- [x] Style results for responsive readability. (AC: 5, 6)
  - [x] Add styles in `src/app/styles.css` unless the codebase has already introduced scoped CSS for results by the time this story is implemented.
  - [x] Use stable layout dimensions or wrapping rules so long display names, `Coffee`, and T-shirt labels do not overlap at mobile widths.
  - [x] Use visual emphasis for majority groups, but pair it with text labels or accessible names so meaning is not color-only.
  - [x] Keep the app's current quiet work-tool visual language; do not add decorative charting libraries or marketing-style cards.
- [x] Add automated coverage. (AC: 1-6)
  - [x] Grouping helper tests: count sorting, stable tie ordering by deck order, multiple majority tie, outlier identification, unsupported value filtering, Fibonacci `Coffee`, and T-shirt values.
  - [x] Results component tests: majority label, outlier label, users listed per group, accessible labels present, empty/null pre-reveal state does not expose groups.
  - [x] Moderator view tests: grouped results render after reveal and do not break existing Moderator controls.
  - [x] Participant view tests: grouped results render after reveal and no Moderator-only controls are exposed.
  - [x] Snapshot/schema regression tests if Story 3.1 result types are adjusted while implementing this story.
  - [x] E2E coverage with at least two browser contexts: multiple users submit different votes, Moderator reveals, both Moderator and Participant see the same grouped distribution and user names.
- [x] Run verification.
  - [x] `cmd.exe /c npm run typecheck`
  - [x] `cmd.exe /c npm run test`
  - [x] `cmd.exe /c npm run build`
  - [x] `cmd.exe /c npm run lint`
  - [x] `cmd.exe /c npm run test:e2e`

### Review Findings

- [x] [Review][Patch] Empty revealed state is misleading when all submitted votes are unsupported [src/features/results/VoteGroupList.tsx:25]

## Dev Notes

### Current Repository State

- Sprint status currently marks `3-1-moderator-reveals-round-results` as `ready-for-dev`, not `done`. This story depends on that implementation. If Story 3.1 is not complete, implement `3.1` first or complete both stories in a single coordinated branch without exposing grouped data before reveal.
- Sprint status also marks `2-4-moderator-votes-in-the-round` and `2-5-enforce-pre-reveal-vote-privacy` as `ready-for-dev`, not `done`. Grouped results must account for Moderator votes only if Story 2.4 has added them to the revealed vote source, and it must preserve Story 2.5 privacy boundaries.
- The current source has no `src/features/results` directory and no `server/domain/result-aggregation.ts`. This story is the right place to introduce the results feature folder and a small pure grouping helper.
- The current checked source still has `SessionSnapshot` without `results`, and `ParticipantSnapshot` has only `id`, `displayName`, `role`, `connected`, and `hasVoted`. Do not add selected card values to `ParticipantSnapshot`.
- `src/shared/domain/decks.ts` already defines the only valid MVP deck values: Fibonacci `1`, `2`, `3`, `5`, `8`, `13`, `21`, `Coffee`; T-shirt `XS`, `S`, `M`, `L`, `XL`.
- `src/features/session/ParticipantSessionView.tsx` disables vote buttons when `snapshot.round.revealed` is true. Keep that behavior.
- `src/features/session/ModeratorSessionView.tsx` currently renders participant status and story/deck controls. If Story 3.1 has added reveal controls and a flat result display, replace only the flat result rendering with the grouped component.
- `src/features/session/useSessionSocket.ts` owns snapshot updates. This story should consume snapshots; it should not add new socket events or REST endpoints.
- `src/app/styles.css` is the active global style file in the current app. The architecture mentions CSS Modules, but the codebase currently uses global app CSS, so follow the repository pattern unless a prior story has changed it.

### Required Result Contract From Story 3.1

This story should build on an explicit revealed-results snapshot, not on hidden state:

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

Before reveal, `results` must be `null`. After reveal, `results.votes` contains only submitted votes. Non-voters remain represented in `participants` with `hasVoted: false`.

### Recommended Group Shape

Use a simple typed model that is easy for tests and UI to consume:

```ts
interface VoteResultGroup {
  value: string
  count: number
  voters: Array<{
    participantId: string
    displayName: string
    role: ParticipantRole
  }>
  isMajority: boolean
  isOutlier: boolean
}
```

Recommended algorithm:

1. Create candidate groups only from `snapshot.deck.values`.
2. Add revealed votes whose `value` is in the active deck.
3. Drop zero-count groups from the rendered output.
4. Sort by `count` descending, then by active deck order.
5. Compute majority as `count === maxCount`; compute outlier as there is more than one group and `count < maxCount`.

Do not add a charting dependency. A semantic grouped list is enough and easier to test.

### Architecture Compliance

- Live Session state remains server-authoritative and is delivered through Socket.IO `session:snapshot`; no polling or REST result endpoint should be added. [Source: `_bmad-output/planning-artifacts/architecture.md#api--communication-patterns`]
- Socket handlers validate, authorize, call domain logic, then emit snapshots; this story should not move result rendering logic into socket handlers. [Source: `_bmad-output/planning-artifacts/architecture.md#communication-patterns`]
- `src/features/results` is the intended home for reveal and grouped result display. [Source: `_bmad-output/planning-artifacts/architecture.md#frontend-architecture`]
- Result grouping must be readable without color alone and keyboard/screen-reader access remains a first-class requirement. [Source: `_bmad-output/planning-artifacts/architecture.md#accessibility-standards`]
- Hidden votes are never included in public snapshots before reveal. [Source: `_bmad-output/planning-artifacts/architecture.md#format-patterns`]
- FR-12 to FR-13 map to `src/features/results` and result aggregation logic. [Source: `_bmad-output/planning-artifacts/architecture.md#requirements-to-structure-mapping`]
- Do not introduce database, Redis, durable storage, analytics, export, account auth, Tailwind, Redux, Zustand, charting packages, GraphQL, tRPC, OpenAPI, or AsyncAPI for this story. [Source: `_bmad-output/planning-artifacts/architecture.md#technology-decisions`]

### Story Requirements Source

- Epic 3 goal: reveal vote distribution, read consensus/outliers, record a Final Estimate, reset or advance flow, and maintain a Moderator-only live list of Estimated Stories. [Source: `_bmad-output/planning-artifacts/epics.md#epic-3-reveal-results-and-capture-estimates`]
- Story 3.2 acceptance requires grouped or ordered votes by count, obvious majority, visible outliers, deck support for T-shirt and Fibonacci including `Coffee`, responsive readability, and non-color-only accessibility. [Source: `_bmad-output/planning-artifacts/epics.md#story-32-users-read-grouped-vote-results`]
- PRD FR-13 requires the Results view to group or order selected Cards by number of Votes, make common selections easiest to identify, keep outliers visible, and support both MVP decks. [Source: `_bmad-output/planning-artifacts/prds/prd-poker-planning-bmad-2026-06-16/prd.md#fr-13-group-results-by-vote-count`]
- Success metric SM-3 says team members should identify the majority estimate and outliers without manual counting. [Source: `_bmad-output/planning-artifacts/prds/prd-poker-planning-bmad-2026-06-16/prd.md#7-success-metrics`]

### Previous Story Intelligence

- Story 3.1 intentionally kept grouped counts, majority labels, outlier summaries, final estimate, and estimated stories out of reveal. This story owns grouped counts and majority/outlier summaries.
- Story 3.1 recommended `results.votes` as the explicit post-reveal source. Reuse that source; do not inspect `session.votes` or client-local selected vote state from the UI.
- Story 3.1 warned that room-wide `io.to(roomCode).emit(...)` sends the same payload to all room members. Any data in `session:snapshot` is visible to all joined users, so pre-reveal grouped counts remain forbidden.
- Story 3.1 expected both Moderator and Participant views to render revealed values after reveal. Story 3.2 should consolidate that rendering into one reusable grouped component so the views cannot drift.

### Existing Files To Update Carefully

- `src/features/results/VoteGroupList.tsx` or `src/features/results/ResultsSummary.tsx`
  - Current state: directory does not exist.
  - Change needed: add reusable grouped results UI.
  - Preserve: presentational-only behavior; no socket commands and no authoritative state mutation.
- `src/features/results/group-revealed-votes.ts` or `src/shared/domain/result-aggregation.ts`
  - Current state: no grouping helper exists.
  - Change needed: add deterministic pure aggregation with unit tests.
  - Preserve: active-deck validation and stable output ordering.
- `src/features/session/ModeratorSessionView.tsx`
  - Current state: current source has no results rendering; Story 3.1 should add flat revealed rendering.
  - Change needed: render the grouped component after reveal.
  - Preserve: Moderator command controls and existing participant presence.
- `src/features/session/ParticipantSessionView.tsx`
  - Current state: vote controls disable when revealed; no grouped display in current source.
  - Change needed: render the grouped component after reveal.
  - Preserve: no Moderator controls and no pre-reveal selected values for other users.
- `src/shared/contracts/snapshots.ts`
  - Current state in current source: no `results` field. Story 3.1 should add it.
  - Change needed: only adjust if Story 3.1 contract is incomplete.
  - Preserve: selected vote values stay out of `ParticipantSnapshot`.
- `src/shared/schemas/session-schemas.ts`
  - Current state in current source: strict snapshot schema without `results`. Story 3.1 should add it.
  - Change needed: only adjust if the grouping implementation needs a contract correction.
  - Preserve: strict Zod validation so unexpected sensitive fields are rejected.
- `src/app/styles.css`
  - Current state: global session, presence, and vote-card styles.
  - Change needed: add responsive grouped-result styles.
  - Preserve: mobile readability and existing session layout.

### Latest Technical Context

- Socket.IO 4.x supports acknowledgement callbacks and per-emit timeouts. Keep using the existing ack/snapshot flow from `useSessionSocket`; grouped results do not need a new event. [Source: `https://socket.io/docs/v4/emitting-events/`]
- Socket.IO rooms are server-side broadcast channels. A room broadcast sends the same snapshot to all sockets in the room, so grouped result data must only exist after reveal. [Source: `https://socket.io/docs/v4/rooms/`]
- Zod 4 is stable and its schemas support `safeParse`. Keep strict snapshot parsing so result shapes are validated before UI state updates. [Source: `https://zod.dev/packages/zod`]
- React list rendering should use stable keys from data, not generated or index keys, especially because grouped results are sorted and may reorder. [Source: `https://react.dev/learn/rendering-lists`]

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

- 2026-07-03: Confirmed Story 3.1 snapshot contract exists in `src/shared/contracts/snapshots.ts` and strict schema support exists in `src/shared/schemas/session-schemas.ts`.
- 2026-07-03: Used red-green-refactor for `groupRevealedVotes` and `VoteGroupList`; initial focused tests failed for missing implementation, then passed after implementation.
- 2026-07-03: Full verification passed: `cmd.exe /c npm run typecheck`, `cmd.exe /c npm run test`, `cmd.exe /c npm run build`, `cmd.exe /c npm run lint`, `cmd.exe /c npm run test:e2e`.

### Completion Notes

- Implemented deterministic revealed-vote grouping under `src/features/results`, using active deck values as the valid source, count-descending sort, deck-order tie break, revealed-vote-order voters, majority labels, and outlier labels.
- Added reusable `VoteGroupList` and replaced flat post-reveal rendering in Moderator and Participant views while preserving command controls, participant-only permissions, and non-voter visibility as a separate status list.
- Added responsive result styles with explicit text wrapping for card values and voter names, plus accessible labels that describe majority/outlier meaning without relying on color.
- Added unit, component, view, CSS, and E2E coverage for grouped results across Fibonacci, T-shirt, unsupported values, null pre-reveal state, majority/outlier labels, and live multi-context reveal.

### File List

- `_bmad-output/implementation-artifacts/3-2-users-read-grouped-vote-results.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `src/app/styles.css`
- `src/app/styles.test.ts`
- `src/features/results/VoteGroupList.test.tsx`
- `src/features/results/VoteGroupList.tsx`
- `src/features/results/group-revealed-votes.test.ts`
- `src/features/results/group-revealed-votes.ts`
- `src/features/session/ModeratorSessionView.test.tsx`
- `src/features/session/ModeratorSessionView.tsx`
- `src/features/session/ParticipantSessionView.test.tsx`
- `src/features/session/ParticipantSessionView.tsx`
- `tests/e2e/create-session.spec.ts`

## Change Log

| Date | Version | Description | Author |
| --- | --- | --- | --- |
| 2026-07-03 | 0.1 | Initial story draft from Epic 3 requirements, architecture, current source, previous story context, and current library documentation. | Scrum Master |
| 2026-07-03 | 1.0 | Implemented grouped revealed results, responsive accessible UI, view integration, and automated verification. | Dev Agent |
