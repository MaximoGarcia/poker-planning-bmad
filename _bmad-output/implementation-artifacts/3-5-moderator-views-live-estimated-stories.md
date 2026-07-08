---
baseline_commit: 3c0cbc240d768c1721669effee85d31e0ee0b0bf
created_at: 2026-07-08T11:55:05.4566858-03:00
---

# Story 3.5: Moderator Views Live Estimated Stories

Status: ready-for-dev

Completion Note: Ultimate context engine analysis completed - comprehensive developer guide created.

## Story

As a Moderator,
I want to see the live list of Estimated Stories during the meeting,
so that I can refer back to recorded estimates without a separate notes workaround.

## Acceptance Criteria

1. Given the Moderator records a Final Estimate for a Story, when the server emits the next Moderator snapshot, then the Estimated Stories list includes that Story's identifier, brief description, Deck, and Final Estimate, and the list is visible in the Moderator session view.
2. Given multiple Stories have recorded Final Estimates, when the Moderator views the Estimated Stories list, then each entry remains visible for the live Session, and entries are readable at common desktop and mobile widths.
3. Given a Participant snapshot is emitted, when it contains Session state, then it does not include the Estimated Stories list, and the Participant UI does not expose Moderator-only history.
4. Given the browser refreshes or the Session is later reopened, when v1 live-session-only behavior applies, then the system is not required to restore Estimated Stories from durable storage, and no database, export, analytics, or long-term history feature is introduced for this requirement.
5. Given Estimated Stories are displayed, when the Moderator navigates the list with keyboard or assistive technology, then Story identifiers, descriptions, Decks, and Final Estimates are available as readable text, and the list remains understandable without relying on color alone.

## Tasks / Subtasks

- [ ] Build the moderator-only estimated-history component in `src/features/results`. (AC: 1, 2, 5)
  - [ ] Create `src/features/results/EstimatedStoriesList.tsx` to render `sessionSnapshot.estimatedStories ?? []` from the shared snapshot contract instead of introducing local duplicate state.
  - [ ] Render every entry with all required fields: story identifier, brief description, deck label, and final estimate.
  - [ ] Use stable data-backed React keys such as `estimatedStory.storyId`; do not key by array index or generated values.
  - [ ] Keep the component understandable without color alone by rendering explicit field labels or headers in visible text.
  - [ ] Handle the empty state with a small moderator-facing message such as "No estimates recorded yet." rather than hiding the section entirely; this keeps the history affordance discoverable during a live meeting.

- [ ] Integrate the list into the moderator session flow without breaking existing controls. (AC: 1, 2, 5)
  - [ ] Update `src/features/session/ModeratorSessionView.tsx` to render `EstimatedStoriesList` in the main moderator layout, not inside the reveal-only or final-estimate-only subsection.
  - [ ] Ensure the list remains visible after `recordEstimate` acknowledgement and still remains visible after `advanceStory` clears the active story.
  - [ ] Preserve the existing `currentEstimatedStory` lookup that drives the "Recorded estimate" state for the current story; the new list is additive, not a replacement for the per-story final-estimate controls.
  - [ ] Keep the existing server-authoritative pattern: render list updates from acknowledged snapshots and follow-up `session:snapshot` events only, with no optimistic local history mutations.

- [ ] Add responsive and accessible presentation styles in the existing app stylesheet. (AC: 2, 5)
  - [ ] Extend `src/app/styles.css` with a dedicated estimated-stories section that visually fits the current session/results cards instead of introducing a disconnected design language.
  - [ ] Ensure long story identifiers and descriptions wrap safely on narrow widths using the same defensive overflow patterns already used for room codes and revealed-vote names.
  - [ ] Preserve keyboard accessibility and readable text labels; do not rely on hover-only disclosure, icon-only labels, or color-only status cues.
  - [ ] If a table-like layout is introduced, keep semantic headers/cells intact; if a card/list layout is used, keep field labels explicit in text. Prefer whichever option best preserves the repo's existing card/list UI patterns while staying readable on mobile.

- [ ] Keep participant-visible state strictly unchanged. (AC: 3, 4)
  - [ ] Do not add estimated-history UI to `src/features/session/ParticipantSessionView.tsx`.
  - [ ] Do not widen participant snapshot contracts, socket payloads, or sanitized snapshot output; participant snapshots must continue omitting `estimatedStories`.
  - [ ] Do not add persistence, export, analytics, or replay features. The story only surfaces existing live-session-only moderator data.

- [ ] Add focused automated coverage for list rendering, privacy, and responsive behavior. (AC: 1-5)
  - [ ] Add `src/features/results/EstimatedStoriesList.test.tsx` for empty state, single-entry rendering, multiple-entry rendering, and readable field labels.
  - [ ] Extend `src/features/session/ModeratorSessionView.test.tsx` to verify the list appears after a recorded estimate, renders multiple entries, and remains visible after `advanceStory` clears the active story.
  - [ ] Keep or extend `src/features/session/ParticipantSessionView.test.tsx` assertions that participant routes never render estimated history even if malformed route state includes `estimatedStories`.
  - [ ] Extend `src/app/styles.test.ts` or add equivalent style assertions for overflow wrapping in the new estimated-history selectors if new classes are introduced.
  - [ ] Extend `tests/e2e/create-session.spec.ts` so an end-to-end moderator flow proves the estimated list appears after recording an estimate, remains moderator-only, and survives advancing to the next story within the same live session.

- [ ] Run verification. (AC: 1-5)
  - [ ] `cmd.exe /c npm run typecheck`
  - [ ] `cmd.exe /c npm run test`
  - [ ] `cmd.exe /c npm run build`
  - [ ] `cmd.exe /c npm run lint`
  - [ ] `cmd.exe /c npm run test:e2e`

## Dev Notes

### Current Repository State

- Baseline commit for this story context is `3c0cbc240d768c1721669effee85d31e0ee0b0bf` (`feat: implement moderator reset and advance functionality for session rounds`).
- The working tree currently includes an unrelated untracked folder at `_bmad-output/implementation-artifacts/investigations/`; leave it alone.
- Story 3.4 already implemented moderator-only `estimatedStories` data flow and confirmed that history survives reset/advance inside the live in-memory session.
- The main missing piece for Story 3.5 is UI rendering: `src/features/results/EstimatedStoriesList.tsx` does not exist yet, and `src/features/session/ModeratorSessionView.tsx` only surfaces the current story's recorded estimate, not the cumulative live list.
- No `project-context.md` file was found under the project root during activation, and no `docs/` directory currently exists.

### Story Requirements Source

- Epic 3 requires the Moderator to maintain a moderator-only live list of Estimated Stories during the session. [Source: `_bmad-output/planning-artifacts/epics.md#epic-3-reveal-results-and-capture-estimates`]
- Story 3.5 requires the Moderator view to show identifier, description, Deck, and Final Estimate after the next moderator snapshot. [Source: `_bmad-output/planning-artifacts/epics.md#story-35-moderator-views-live-estimated-stories`]
- PRD FR-15 defines the list contents and explicitly keeps the list moderator-only and live-session-only. [Source: `_bmad-output/planning-artifacts/prds/prd-adr-buddy-2026-06-16/prd.md#fr-15-show-estimated-stories-list`]
- PRD UJ-3 frames the business value: the Moderator should not need a separate note-taking workaround during the meeting. [Source: `_bmad-output/planning-artifacts/prds/prd-adr-buddy-2026-06-16/prd.md#uj-3-the-moderator-preserves-a-live-list-of-estimates-during-the-meeting`]
- NFR-3 and NFR-4 require readable text labels and responsiveness on common desktop/mobile widths. [Source: `_bmad-output/planning-artifacts/prds/prd-adr-buddy-2026-06-16/prd.md#5-cross-cutting-non-functional-requirements`]

### Previous Story Intelligence

- Story 3.4 already protected the hard part: `advanceStory` preserves `session.estimatedStories`, and moderator snapshots continue to include that data while participant snapshots omit it.
- Story 3.4 also established the exact user-facing behaviors that matter here: the active story can disappear after advance while the selected deck remains, so the estimated-history list must live outside active-story-only UI.
- The Story 3.4 e2e flow already proves recorded estimates remain hidden from participants and that advancing clears the active story. Story 3.5 should extend that flow instead of creating a disconnected browser path.
- Existing moderator UI uses acknowledged snapshots plus live socket snapshots as the source of truth. Avoid introducing a second client-side history cache for estimated stories.

### Existing Files To Update Carefully

- `src/features/session/ModeratorSessionView.tsx`
  - Current state: renders current story/deck controls, presence, revealed vote groups, final estimate controls, and a single "Recorded estimate" status for the current story.
  - Change needed: import and render `EstimatedStoriesList` in a persistent moderator-visible area that survives active-story resets and advances.
  - Preserve: current pending-state logic, current-estimate controls, existing reset/advance behavior, and snapshot-driven rendering.

- `src/features/results/EstimatedStoriesList.tsx`
  - Current state: file does not exist; architecture explicitly maps FR-14 and FR-15 work to this location.
  - Change needed: create the reusable result/history presentation component here instead of embedding list markup directly inside `ModeratorSessionView`.
  - Preserve: current feature boundary where `src/features/results` owns revealed-result and estimate-history presentation.

- `src/app/styles.css`
  - Current state: contains responsive card/list styling for presence, session summary, deck options, and revealed results, plus mobile adjustments below `640px`.
  - Change needed: add estimated-history styles that match the existing UI language and wrap long values safely.
  - Preserve: current responsive breakpoints, card spacing, accessible text contrast, and non-color-only affordances.

- `src/app/styles.test.ts`
  - Current state: asserts overflow wrapping for room codes and revealed-vote content.
  - Change needed: add similar assertions if the estimated-history UI introduces new selectors that must wrap long story identifiers or descriptions.
  - Preserve: lightweight CSS regression style of the test file.

- `src/features/session/ModeratorSessionView.test.tsx`
  - Current state: covers story/deck controls, vote/reveal/reset/advance flows, recorded final estimate state, and some moderator-only snapshot behavior.
  - Change needed: add assertions for list visibility, entry content, persistence after advance, and multiple-entry rendering.
  - Preserve: mocked `useSessionSocket` flow, no direct token rendering, and snapshot-driven expectations.

- `src/features/session/ParticipantSessionView.tsx`
  - Current state: does not render moderator-only controls or recorded-estimate history.
  - Change needed: likely none besides regression awareness.
  - Preserve: participant-only view stays free of estimated-history UI.

- `src/features/session/ParticipantSessionView.test.tsx`
  - Current state: already asserts participants do not see final-estimate history or moderator controls.
  - Change needed: keep or extend coverage for malformed route-state data containing `estimatedStories`.
  - Preserve: participant privacy boundary.

- `src/shared/contracts/snapshots.ts`
  - Current state: already defines `EstimatedStorySnapshot` and optional `estimatedStories` on `SessionSnapshot`.
  - Change needed: likely none.
  - Preserve: shared contract shape; do not fork or duplicate types in the UI layer.

- `src/shared/schemas/session-schemas.ts`
  - Current state: already validates optional moderator-only `estimatedStories`.
  - Change needed: likely none.
  - Preserve: optionality, strict validation, and current field names.

- `server/socket/snapshot-mapper.ts`
  - Current state: already includes `estimatedStories` only for moderator viewers.
  - Change needed: likely none unless a regression is found while testing.
  - Preserve: participant snapshots must not expose `estimatedStories`.

- `tests/e2e/create-session.spec.ts`
  - Current state: already covers final-estimate recording plus reset/advance behavior, and explicitly asserts participants do not see recorded-estimate UI text.
  - Change needed: extend the integrated moderator flow to assert the cumulative estimated-history list appears and persists across story advancement.
  - Preserve: multi-context privacy assertions and the current session lifecycle flow.

### Architecture Compliance

- Keep this feature in the frontend presentation layer. The shared snapshot contract and server-side moderator-only filtering already exist; Story 3.5 should primarily consume them rather than redesign transport or domain state. [Source: `_bmad-output/planning-artifacts/architecture.md#frontend-architecture`]
- `src/features/results` is the intended home for revealed-result and estimated-history presentation. [Source: `_bmad-output/planning-artifacts/architecture.md#project-structure--boundaries`]
- Moderator-only fields must remain absent from participant snapshots. [Source: `_bmad-output/planning-artifacts/architecture.md#api--communication-patterns`]
- Server state remains authoritative; UI should continue deriving from the latest `session:snapshot` rather than maintaining its own durable state model. [Source: `_bmad-output/planning-artifacts/architecture.md#communication-patterns`]
- Do not introduce persistence, analytics, exports, backlog integrations, or multi-session history. [Source: `_bmad-output/planning-artifacts/architecture.md#runtime-assumptions`]

### Git Intelligence Summary

- `3c0cbc2` - `feat: implement moderator reset and advance functionality for session rounds`
- `e76a775` - `Story 3.3 done`
- `c5c1d5f` - `Refactor ADR buddy workflows and docs`
- `dde150d` - `feat: add reveal round functionality for moderators`
- `b2feeab` - `feat: update pre-reveal vote privacy story status to done and add review findings`

Practical takeaway: the current codebase already contains the domain/socket plumbing for estimated-story history. This story should stay intentionally narrow and finish the moderator presentation layer cleanly.

### Latest Technical Context

- The installed React package is `19.2.6`, and the current React docs also show `v 19.2`. When rendering a live list, keep stable keys from the data itself because React uses keys to track moved, inserted, or deleted items correctly. [Sources: `package.json`, [React Rendering Lists](https://react.dev/learn/rendering-lists)]
- The installed Socket.IO packages are `4.8.x`. The official Socket.IO 4.x docs continue to support per-command acknowledgement timeouts via `socket.timeout(5000).emit(...)`, which matches the existing hook pattern. Story 3.5 should reuse that existing flow rather than invent a new fetch/polling path. [Sources: `package.json`, [Socket.IO Emitting Events](https://socket.io/docs/v4/emitting-events/)]
- W3C WAI guidance treats tabular relationships as accessibility-sensitive content that needs readable structure. If implementation uses a table, keep real headers; if it uses labeled cards/lists, keep each field explicitly labeled in visible text so assistive technology users can understand the content without visual inference. This is an implementation guardrail, not a mandate to use a table. [Source: [W3C WAI Tables Tutorial](https://www.w3.org/WAI/tutorials/tables/)]

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

- `estimatedStories` order should remain the domain order already produced by `recordEstimate` updates; do not add client-side re-sorting unless product requirements change.
- The list should remain visible even when `sessionSnapshot.story` is `null` after `advanceStory`, because the business value is cross-story meeting continuity.
- Story 3.5 is not responsible for adding persistence after refresh; disappearing history after refresh remains acceptable under v1 scope.
- No separate UX document exists, so responsiveness and accessibility guidance must be satisfied from the PRD, architecture, existing styles, and current UI patterns.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-07-08: Story context built from `epics.md`, PRD shards, architecture, Story 3.4 implementation notes, current moderator/participant/result UI files, current CSS/tests, recent git commits, and official React/Socket.IO/W3C references.

### Completion Notes List

- Selected next backlog story automatically from `sprint-status.yaml`: `3-5-moderator-views-live-estimated-stories`.
- Confirmed the backend and shared snapshot contract already expose moderator-only estimated-story data; Story 3.5 is primarily a presentation and regression-coverage story.
- Added explicit guardrails so the estimated-history list survives story advancement, stays out of participant views, remains responsive, and avoids duplicate client state.

### File List

- _bmad-output/implementation-artifacts/3-5-moderator-views-live-estimated-stories.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
