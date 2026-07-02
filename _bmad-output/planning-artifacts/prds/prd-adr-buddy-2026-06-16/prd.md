---
title: "PRD: adr-buddy"
status: final
created: 2026-06-16
updated: 2026-06-16
---

# PRD: adr-buddy

## 0. Document Purpose

This PRD defines the first version of `adr-buddy`, a lightweight internal Planning Poker web application for one agile team. It is written for downstream UX, architecture, story creation, and implementation work. Requirements are grouped by feature with stable functional requirement IDs, and resolved assumptions are noted at the end.

Source inputs:

- `_bmad-output/planning-artifacts/briefs/brief-adr-buddy-2026-06-16/brief.md`
- `_bmad-output/planning-artifacts/briefs/brief-adr-buddy-2026-06-16/addendum.md`
- `_bmad-output/planning-artifacts/briefs/brief-adr-buddy-2026-06-16/.decision-log.md`
- `_bmad-output/planning-artifacts/prds/prd-adr-buddy-2026-06-16/source-extract-brief.md`

## 1. Vision

`adr-buddy` helps one internal agile team estimate user stories together without manual vote coordination, spreadsheet workarounds, or biased verbal estimation. The product creates a simple shared Planning Poker room where a Moderator presents one Story at a time, Participants privately select estimation cards, and everyone sees the group pattern only after the Moderator reveals the round.

The first version should feel faster than explaining the process. A Participant joins with a Room Code and Display Name, sees the active Story, chooses one Card, and waits for the reveal. A Moderator controls the active Story, starts and reveals rounds, can vote alongside the team, selects the Final Estimate from the active Deck, and keeps a live list of Estimated Stories for the session.

The product is intentionally narrow. It is not an agile lifecycle platform, backlog integration layer, analytics product, or organization-wide estimation standard. The goal is to make live team estimation fair, readable, and low-friction.

## 2. Target User

### 2.1 Jobs To Be Done

- As a Moderator, I need to create a shared estimation session quickly so the team can start refinement without setup overhead.
- As a Moderator, I need to control when voting starts, when votes are revealed, and when the final estimate is recorded so the session remains orderly.
- As a Participant, I need to join with minimal friction and understand which Story is being estimated so I can contribute without extra explanation.
- As a Participant, I need to submit my estimate privately so my vote is not biased by earlier visible estimates.
- As a team, we need the reveal to make consensus and outliers obvious so discussion can focus on the Story rather than vote counting.

### 2.2 Non-Users For v1

- Other teams that need multi-team administration, reusable org settings, or cross-team reporting.
- External users, customers, or public communities.
- Scrum masters or managers looking for velocity analytics or historical estimation trends.
- Teams that require direct Jira, GitHub, or GitLab integration in the first version.

### 2.3 Key User Journeys

- **UJ-1. Sofia moderates a live estimation round during refinement.** Sofia, the team facilitator, opens `adr-buddy`, creates a Session, shares the Room Code, enters the current Story identifier and short description, selects the Fibonacci Deck, and starts the Round. Participants submit hidden Votes. Sofia also submits a Vote. When everyone has voted or the team is ready, Sofia reveals the Results, sees Cards grouped by count, discusses outliers with the team, selects the Final Estimate from the active Deck, and moves to the next Story.

- **UJ-2. Marcos joins and votes without setup overhead.** Marcos receives a Room Code during a remote refinement call. He opens the app, enters the Room Code and his Display Name, lands in the active Session, reads the current Story identifier and description, chooses one Card, and sees that his Vote was accepted while other Votes remain hidden. After the Moderator reveals Results, Marcos sees the group distribution and joins the discussion.

- **UJ-3. The Moderator preserves a live list of estimates during the meeting.** After each revealed Round, the Moderator records a Final Estimate. The Session adds that Story to the Estimated Stories list with its identifier, description, Deck, and Final Estimate. During the live meeting, the Moderator can refer back to earlier estimates without using a separate note-taking workaround. The list is not required to survive a browser refresh or later reopening.

## 3. Glossary

- **Card**: A selectable estimation option shown as part of a Deck.
- **Deck**: A configured set of Cards used for one Round. v1 Decks are T-shirt and Fibonacci.
- **Display Name**: The required name a Participant or Moderator uses inside a Session. Duplicate Display Names are allowed and disambiguated for display with a numeric suffix.
- **Estimated Story**: A Story that has a recorded Final Estimate within the live Session.
- **Final Estimate**: The Moderator-selected final value for a Story, chosen from the active Deck after Results are revealed.
- **Fibonacci Deck**: The Deck containing `1`, `2`, `3`, `5`, `8`, `13`, `21`, and `Coffee`.
- **Moderator**: The user who creates or manages a Session and controls Story, Round, reveal, and Final Estimate actions.
- **Participant**: A user who joins a Session by Room Code and submits one Vote per Round.
- **Result**: The revealed Round outcome, grouped or ordered by Vote count.
- **Room Code**: The short join code used to enter a Session.
- **Round**: One estimation cycle for one Story: start, hidden voting, reveal, discussion, and Final Estimate capture.
- **Session**: A live Planning Poker room containing the current Story, Participants, Round state, Votes, Results, and Moderator-only Estimated Stories list.
- **Story**: The work item being estimated, represented by an identifier and brief description.
- **T-shirt Deck**: The Deck containing `XS`, `S`, `M`, `L`, and `XL`.
- **Vote**: One hidden Card selection by a Moderator or Participant during a Round.

## 4. Features

### 4.1 Session Creation And Join

**Description:** The product lets a Moderator create a live Session and share a Room Code with Participants. Participants join by entering the Room Code and required Display Name. The first version prioritizes frictionless access over account management. v1 does not require user accounts or authentication.

**Functional Requirements:**

#### FR-1: Create Session

A Moderator can create a new Session and receive a Room Code.

**Consequences:**

- A new Session has no active Story until the Moderator adds one.
- A new Session exposes a Room Code that Participants can use to join.
- The creator is treated as the Moderator for that Session.

#### FR-2: Join Session

A Participant can join an existing Session by entering a valid Room Code and required Display Name. Realizes UJ-2.

**Consequences:**

- The system rejects missing Display Names.
- The system rejects invalid or inactive Room Codes.
- If a Display Name is already present in the Session, the system allows the duplicate and disambiguates it for display, for example `Maxi (2)`.
- A joined Participant can see the current Story, Deck, Round state, and their own Vote state.

#### FR-3: Show Participant Presence

The Session shows the Moderator which Participants are currently joined. Presence is limited to Display Names and voting status; v1 does not require full online/offline diagnostics.

**Consequences:**

- The Moderator can tell who has joined before starting a Round.
- The Moderator can tell who has submitted a Vote during an active Round without seeing the selected Card.

### 4.2 Story And Deck Setup

**Description:** The Moderator defines the Story being estimated and selects the Deck used for the Round. Story management stays intentionally lightweight and session-local.

**Functional Requirements:**

#### FR-4: Set Current Story

The Moderator can enter or update the current Story identifier and brief description before or between Rounds. Realizes UJ-1.

**Consequences:**

- Participants can see the current Story identifier and description.
- Updating the current Story before a Round changes what Participants see.
- The system blocks Story changes during an active Round until the Moderator resets or ends that Round.

#### FR-5: Select Deck

The Moderator can select either the T-shirt Deck or Fibonacci Deck for the current Round.

**Consequences:**

- T-shirt Deck options are `XS`, `S`, `M`, `L`, and `XL`.
- Fibonacci Deck options are `1`, `2`, `3`, `5`, `8`, `13`, `21`, and `Coffee`.
- Participants and Moderator see the same Deck during a Round.

### 4.3 Round Control

**Description:** The Moderator controls Round state so the team estimates one Story at a time. Participants cannot start, reveal, or finalize Rounds.

**Functional Requirements:**

#### FR-6: Start Round

Only the Moderator can start a Round for the current Story. Realizes UJ-1.

**Consequences:**

- Starting a Round clears prior unrecorded Votes for the current Story.
- Participants can submit Votes only after a Round has started.
- The system makes the active Round state visible to all joined users.

#### FR-7: Reset Or Advance Round

The Moderator can reset the current Round or advance to the next Story after recording a Final Estimate.

**Consequences:**

- Resetting a Round clears Votes and hides Results.
- Advancing prepares the Session for a new Story.
- Prior Estimated Stories remain visible to the Moderator in the live Session list.

#### FR-8: Restrict Round Controls To Moderator

Participants cannot start Rounds, reveal Results, reset Rounds, advance Stories, or record Final Estimates.

**Consequences:**

- Participant controls are limited to joining, viewing Session state, and submitting or changing their own Vote while voting is open.
- Unauthorized control attempts are rejected.

### 4.4 Hidden Voting

**Description:** During an active Round, each Moderator and Participant can select one Card from the active Deck. Votes remain hidden until the Moderator reveals Results.

**Functional Requirements:**

#### FR-9: Submit Vote

A Participant can select one Card from the active Deck as their Vote. Realizes UJ-2.

**Consequences:**

- A Participant can have only one active Vote per Round.
- A Participant can change their Vote before reveal to recover from accidental misclicks without affecting fairness.
- The selected Card is not visible to other users before reveal.

#### FR-10: Moderator Vote

The Moderator can submit one Vote in the same Round using the same active Deck. Realizes UJ-1.

**Consequences:**

- The Moderator Vote follows the same hidden-before-reveal rules as Participant Votes.
- The Moderator can reveal Results whether or not they have voted.

#### FR-11: Preserve Vote Privacy Before Reveal

The system keeps selected Cards hidden until the Moderator reveals Results.

**Consequences:**

- Before reveal, users may see who has voted but not what each user selected.
- Results cannot be inferred from grouped counts before reveal.
- Refresh or reconnect behavior does not need to preserve a hidden Vote beyond the live-session-only constraint.

### 4.5 Reveal And Result Reading

**Description:** The Moderator reveals Results when the team is ready. Results must make consensus and outliers obvious without manual counting.

**Functional Requirements:**

#### FR-12: Reveal Results

Only the Moderator can reveal Results for the active Round. Realizes UJ-1.

**Consequences:**

- Revealing Results makes submitted Vote Cards visible to the Session.
- Participants who did not vote are distinguishable by Display Name from users who submitted a Card.
- After reveal, new or changed Votes are blocked unless the Moderator resets the Round.

#### FR-13: Group Results By Vote Count

The Results view groups or orders selected Cards by number of Votes.

**Consequences:**

- The most common selected Cards are easiest to identify.
- Outlier selections remain visible.
- The view supports both T-shirt and Fibonacci Decks, including `Coffee`.

### 4.6 Final Estimate Capture And Live Story History

**Description:** After discussion, the Moderator records the Final Estimate for the Story from the active Deck. The Session preserves a live list of Estimated Stories for the meeting, but v1 does not require persistence after refresh or reopening.

**Functional Requirements:**

#### FR-14: Record Final Estimate

The Moderator can select a Final Estimate from the active Deck after Results are revealed. Realizes UJ-1 and UJ-3.

**Consequences:**

- The Moderator cannot enter a custom Final Estimate.
- The Final Estimate must be one of the active Deck Cards.
- Recording a Final Estimate adds or updates the Story in the Estimated Stories list.

#### FR-15: Show Estimated Stories List

The Session shows a live list of Estimated Stories during the active meeting. Realizes UJ-3.

**Consequences:**

- Each Estimated Story includes Story identifier, brief description, Deck, and Final Estimate.
- The list is visible to the Moderator only.
- The list does not need to survive browser refresh or later reopening.

## 5. Cross-Cutting Non-Functional Requirements

- **NFR-1 Low friction:** Joining and voting must require minimal input: Room Code, Display Name, and Card selection.
- **NFR-2 Real-time coherence:** Session state changes must appear promptly across Moderator and Participant views during a live meeting. Near-real-time browser updates are required, but no formal latency SLA is needed for v1.
- **NFR-3 Accessibility:** Core controls and Cards must be usable with keyboard navigation and readable text labels.
- **NFR-4 Responsive web:** The app must support common desktop and mobile browser widths because Participants may join from laptops or phones.
- **NFR-5 Privacy by behavior:** Hidden Votes must not be displayed or exposed in normal UI before reveal.
- **NFR-6 Session-local persistence:** v1 only needs live Session state; no durable storage is required for Session history, user identity, or analytics.

## 6. Non-Goals

- No Jira, GitHub, GitLab, or backlog integration in v1.
- No company-wide administration, multi-team management, or shared organization settings.
- No public signup, monetization, external launch funnel, or customer-facing marketing scope.
- No custom card art, custom images, custom themes, or decorative Deck builder in v1.
- No advanced reporting, velocity tracking, historical analytics, or export.
- No built-in chat, async discussion threads, meeting summaries, or AI-generated facilitation.
- No durable Session reopening after refresh or later access in v1.

## 7. MVP Scope

### 7.1 In Scope

- Create a live Planning Poker Session.
- Join a Session by Room Code and required Display Name.
- Support Moderator and Participant access.
- Let the Moderator define the current Story identifier and brief description.
- Let the Moderator choose T-shirt or Fibonacci Deck.
- Let only the Moderator start, reveal, reset, advance, and record Final Estimate.
- Let Participants and Moderator submit one hidden Vote per Round.
- Keep Votes hidden before reveal.
- Reveal Results grouped or ordered by Vote count.
- Let the Moderator select the Final Estimate from the active Deck only.
- Preserve a live Estimated Stories list during the meeting.
- Support responsive browser usage.

### 7.2 Out Of Scope For MVP

- Persistent saved Sessions or durable history after refresh.
- Authentication and user account management. Internal trust plus Room Code access is sufficient for v1.
- Integrations with external backlog tools.
- Custom Deck creation beyond the two predefined Decks.
- Multi-session dashboard or team-level administration.
- Analytics, reports, exports, or velocity calculations.

## 8. Success Metrics

**Primary**

- **SM-1: Completed live estimation session.** One internal team can estimate multiple Stories in one live Session without a separate voting workaround. Validates FR-1 through FR-15.
- **SM-2: Fair voting behavior.** Votes remain hidden until Moderator reveal in every Round. Validates FR-9, FR-10, FR-11, and FR-12.
- **SM-3: Readable reveal.** Team members can identify the majority estimate and outliers without manual counting. Validates FR-13.

**Secondary**

- **SM-4: Low join friction.** Participants can join with Room Code and Display Name only. Validates FR-2.
- **SM-5: Session continuity during meeting.** The Moderator can record Final Estimates for multiple Stories and see them in the live Estimated Stories list. Validates FR-14 and FR-15.

**Counter-metrics**

- **SM-C1: Feature creep avoided.** The MVP must not require backlog integration, account management, analytics, or custom card theming to be usable. Counterbalances SM-1.
- **SM-C2: Moderator burden stays low.** The Moderator must not need to manually count Votes or maintain a separate notes list for estimated Stories. Counterbalances SM-5.

## 9. Risks And Mitigations

- **Risk: Live Session state becomes confusing if users refresh or reconnect.** Mitigation: communicate v1 live-session-only behavior clearly and avoid promising durable recovery.
- **Risk: Room Code without authentication allows accidental wrong-room access.** Mitigation: keep the tool internal, use non-obvious Room Codes, and treat authentication as a future concern if adoption expands.
- **Risk: Moderator controls become too permissive or unclear.** Mitigation: keep Moderator-only actions visually distinct and reject Participant control attempts.
- **Risk: `Coffee` is ambiguous as an estimate.** Mitigation: treat `Coffee` as a valid Card and Final Estimate option in v1; revisit semantics if the team wants separate "break" or "needs discussion" cards later.

## 10. Open Questions

- No open questions currently blocking UX, architecture, or story creation.

## 11. Assumptions Index

- No unresolved assumptions remain. Previously tagged assumptions were accepted as product decisions on 2026-06-16 and are reflected directly in the requirements above.
