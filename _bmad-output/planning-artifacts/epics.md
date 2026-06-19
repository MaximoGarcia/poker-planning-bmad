---
stepsCompleted:
  - 1
  - 2
  - 3
  - 4
inputDocuments:
  - "_bmad-output/planning-artifacts/prds/prd-adr-buddy-2026-06-16/prd.md"
  - "_bmad-output/planning-artifacts/prds/prd-adr-buddy-2026-06-16/addendum.md"
  - "_bmad-output/planning-artifacts/prds/prd-adr-buddy-2026-06-16/.decision-log.md"
  - "_bmad-output/planning-artifacts/prds/prd-adr-buddy-2026-06-16/source-extract-brief.md"
  - "_bmad-output/planning-artifacts/prds/prd-adr-buddy-2026-06-16/reconcile-brief.md"
  - "_bmad-output/planning-artifacts/prds/prd-adr-buddy-2026-06-16/review-rubric.md"
  - "_bmad-output/planning-artifacts/architecture.md"
  - "_bmad-output/planning-artifacts/briefs/brief-adr-buddy-2026-06-16/brief.md"
  - "_bmad-output/planning-artifacts/briefs/brief-adr-buddy-2026-06-16/addendum.md"
  - "_bmad-output/planning-artifacts/briefs/brief-adr-buddy-2026-06-16/.decision-log.md"
  - "_bmad-output/planning-artifacts/implementation-readiness-report-2026-06-19.md"
---

# adr-buddy - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for adr-buddy, decomposing the requirements from the PRD, UX Design if it exists, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: A Moderator can create a new Session and receive a Room Code. A new Session has no active Story until the Moderator adds one, exposes a Room Code for Participants, and treats the creator as the Moderator.

FR2: A Participant can join an existing Session by entering a valid Room Code and required Display Name. The system rejects missing Display Names and invalid or inactive Room Codes, allows duplicate Display Names with disambiguation such as `Maxi (2)`, and shows the joined Participant the current Story, Deck, Round state, and their own Vote state.

FR3: The Session shows the Moderator which Participants are currently joined. Presence is limited to Display Names and voting status, so the Moderator can see who has joined and who has submitted a Vote during an active Round without seeing selected Cards.

FR4: The Moderator can enter or update the current Story identifier and brief description before or between Rounds. Participants can see the current Story, and the system blocks Story changes during an active Round until the Moderator resets or ends that Round.

FR5: The Moderator can select either the T-shirt Deck or Fibonacci Deck for the current Round. T-shirt Deck options are `XS`, `S`, `M`, `L`, and `XL`; Fibonacci Deck options are `1`, `2`, `3`, `5`, `8`, `13`, `21`, and `Coffee`; all users see the same Deck during a Round.

FR6: Only the Moderator can start a Round for the current Story. Starting a Round clears prior unrecorded Votes for the current Story, allows Participants to submit Votes, and makes the active Round state visible to all joined users.

FR7: The Moderator can reset the current Round or advance to the next Story after recording a Final Estimate. Resetting clears Votes and hides Results, advancing prepares the Session for a new Story, and prior Estimated Stories remain visible to the Moderator in the live Session list.

FR8: Participants cannot start Rounds, reveal Results, reset Rounds, advance Stories, or record Final Estimates. Participant controls are limited to joining, viewing Session state, and submitting or changing their own Vote while voting is open; unauthorized control attempts are rejected.

FR9: A Participant can select one Card from the active Deck as their Vote. A Participant can have only one active Vote per Round, can change their Vote before reveal, and their selected Card is not visible to other users before reveal.

FR10: The Moderator can submit one Vote in the same Round using the same active Deck. The Moderator Vote follows the same hidden-before-reveal rules as Participant Votes, and the Moderator can reveal Results whether or not they have voted.

FR11: The system keeps selected Cards hidden until the Moderator reveals Results. Before reveal, users may see who has voted but not what each user selected, Results cannot be inferred from grouped counts before reveal, and refresh or reconnect behavior does not need to preserve a hidden Vote beyond the live-session-only constraint.

FR12: Only the Moderator can reveal Results for the active Round. Revealing Results makes submitted Vote Cards visible to the Session, distinguishes Participants who did not vote by Display Name, and blocks new or changed Votes unless the Moderator resets the Round.

FR13: The Results view groups or orders selected Cards by number of Votes. The most common selected Cards are easiest to identify, outlier selections remain visible, and the view supports both T-shirt and Fibonacci Decks, including `Coffee`.

FR14: The Moderator can select a Final Estimate from the active Deck after Results are revealed. The Moderator cannot enter a custom Final Estimate, the Final Estimate must be one of the active Deck Cards, and recording it adds or updates the Story in the Estimated Stories list.

FR15: The Session shows a live list of Estimated Stories during the active meeting. Each Estimated Story includes Story identifier, brief description, Deck, and Final Estimate; the list is Moderator-only and does not need to survive browser refresh or later reopening.

### NonFunctional Requirements

NFR1: Joining and voting must require minimal input: Room Code, Display Name, and Card selection.

NFR2: Session state changes must appear promptly across Moderator and Participant views during a live meeting. Near-real-time browser updates are required, but no formal latency SLA is needed for v1.

NFR3: Core controls and Cards must be usable with keyboard navigation and readable text labels.

NFR4: The app must support common desktop and mobile browser widths because Participants may join from laptops or phones.

NFR5: Hidden Votes must not be displayed or exposed in normal UI before reveal.

NFR6: v1 only needs live Session state; no durable storage is required for Session history, user identity, or analytics.

### Additional Requirements

- Product scope is a lightweight internal Planning Poker application for one internal agile team.
- The core workflow is Moderator creates a Session, Participants join by Room Code and Display Name, Moderator sets the active Story and Deck, voting occurs privately, Moderator reveals Results, the team discusses, Moderator records the Final Estimate, and the Session advances to the next Story.
- MVP scope includes live Session creation, Room Code join, Moderator and Participant access, current Story setup, two predefined Decks, hidden voting, reveal, Final Estimate capture, live Estimated Stories list, reset/advance behavior, and responsive browser usage.
- MVP excludes persistent Sessions, durable history after refresh, authentication, user accounts, backlog integrations, custom Deck creation, multi-session dashboards, team administration, analytics, reports, exports, velocity calculations, built-in chat, async discussion, meeting summaries, AI facilitation, public signup, monetization, custom card images, visual themes, and decorative Deck builder functionality.
- Room Code access without authentication is accepted for v1 under internal trust assumptions.
- Display Names are required. Duplicate Display Names are allowed and disambiguated with numeric suffixes.
- Moderator voting is optional; the Moderator can reveal Results without voting.
- Final Estimates must be selected from the active Deck only.
- Estimated Stories are Moderator-only.
- Story changes are blocked during an active Round until the Moderator resets or ends that Round.
- Participants can change Votes before reveal, but Votes are locked after reveal unless the Moderator resets the Round.
- Non-voters remain distinguishable by Display Name after reveal.
- Refresh and reconnect recovery are not required for v1.
- Starter template: Architecture specifies Vite React TypeScript plus a custom TypeScript Node/Express/Socket.IO backend. The first implementation story must initialize the Vite React TypeScript app with `npm create vite@latest . -- --template react-ts` and add the Node/Socket.IO server scaffold, shared types, test setup, and Azure App Service startup scripts.
- Use TypeScript for frontend, backend, and shared contracts.
- Use React for UI components and Vite for frontend development and production builds.
- Add a custom Node.js backend that can serve the built React app, expose HTTP endpoints, and host Socket.IO.
- Use Express 5.x for HTTP concerns: static frontend serving, health endpoint, SPA fallback, and minimal metadata endpoints such as `/health` or `/api/version`.
- Use Socket.IO 4.x for all live Session behavior, room broadcasts, acknowledgements, reconnect behavior, and server-pushed snapshots.
- Treat Socket.IO client events as validated commands rather than direct mutations.
- Use acknowledgement responses in the shape `{ ok: true, data }` or `{ ok: false, error: { code, message, details? } }`.
- Emit sanitized `session:snapshot` events after accepted commands.
- Never include hidden Vote values in public snapshots before reveal.
- Keep Moderator-only data, including Estimated Stories and command availability, out of Participant snapshots.
- Use stable Socket.IO command events: `session:create`, `session:join`, `story:update`, `deck:select`, `round:start`, `vote:submit`, `round:reveal`, `round:reset`, `estimate:record`, `story:advance`, and `session:leave`.
- Use server events: `session:snapshot`, `session:error`, and `session:closed`.
- Use stable machine-readable error codes such as `INVALID_ROOM_CODE`, `UNAUTHORIZED`, `ROUND_NOT_ACTIVE`, `VOTE_LOCKED`, and `STORY_LOCKED`.
- Use shared TypeScript contracts and Zod 4 schemas for command payloads, acknowledgements, errors, snapshots, Decks, Session types, and validation.
- Keep Socket.IO handlers thin: validate payloads, authorize requests, call domain logic, and emit snapshots.
- Keep all authoritative Session state transitions in the domain layer, independent of transport handlers.
- Use an in-memory authoritative `SessionStore` for MVP live Sessions, keyed by generated Room Code.
- Introduce a `SessionStore` abstraction immediately so future Redis or durable adapters can replace the in-memory implementation without rewriting domain commands.
- Keep v1 Session lifecycle ephemeral with inactivity cleanup and no database migrations or persistent storage.
- Model domain transitions for create Session, join, set Story, select Deck, start Round, submit Vote, reveal, reset, record Final Estimate, and advance Story.
- Use capability-token authorization without user accounts: Session creation returns a `moderatorToken`; Participant join returns a `participantToken`; Moderator-only commands require the valid `moderatorToken`; Participant Vote updates require that Participant's valid `participantToken`.
- Store capability tokens in browser `sessionStorage`, not `localStorage`.
- Do not log capability tokens or hidden Vote values before reveal.
- Use HTTPS/WSS in Azure production.
- Use Helmet for Express security headers.
- Use restrictive CORS: deployed Azure origin in production and configured localhost origins in development.
- Use basic rate limiting on create/join endpoints and Socket.IO command bursts.
- Use React Router in SPA mode with routes for `/`, `/session/:roomCode/moderator`, and `/session/:roomCode`.
- Use server-snapshot-driven frontend state through a `useSessionSocket` hook that owns connection lifecycle, command sending, acknowledgements, and snapshot updates.
- Avoid authority-sensitive optimistic UI updates; wait for server acknowledgement and snapshot for Moderator commands, Vote submission, reveal, reset, and Final Estimate recording.
- Use React Context plus `useReducer` only for client session UI state; avoid Redux or Zustand in v1.
- Use CSS Modules and CSS custom properties for v1 styling.
- Cards must be real buttons or radio-style controls with readable labels.
- Round controls must expose disabled states and status text.
- Result grouping must be readable without relying on color alone.
- Keyboard navigation must be first-class for Card and core control interactions.
- Follow the architecture's project structure: client code under `src`, server code under `server`, shared contracts under `src/shared`, unit/component tests co-located, and Playwright tests under `tests/e2e`.
- Use the prescribed folder areas: `src/app`, `src/features/session`, `src/features/cards`, `src/features/results`, `src/shared/contracts`, `src/shared/domain`, `src/shared/schemas`, `server/domain`, `server/security`, `server/socket`, and `server/http`.
- Use naming conventions from the architecture: component files in PascalCase, hooks with `use` prefix, non-component modules as kebab-case or domain nouns, Socket.IO events as lowercase namespace plus action, error codes as uppercase snake case, and JSON fields as camelCase.
- Add Vitest for domain state-machine and validation tests.
- Add React Testing Library for component interaction tests.
- Add Playwright end-to-end tests covering Moderator/Participant browser flows and hidden-vote privacy across two browser contexts.
- Deploy as one Node.js app on Azure App Service for Linux, single instance for MVP, because in-memory Session state is authoritative.
- The Node server must listen on `process.env.PORT`.
- Enable App Service Web sockets, HTTPS Only, and Always On for non-free production tiers.
- Keep App Service session affinity enabled if more than one instance is ever tested before introducing shared state.
- Use GitHub Actions for CI/CD, preferably with OpenID Connect to Azure, and build/test before deployment.
- Use Azure App Settings for runtime environment variables.
- Use Application Insights and App Service log streaming for server-side monitoring and operational troubleshooting.
- Do not introduce Redis, Azure Web PubSub, Azure SQL, Cosmos DB, Azure Storage, authentication, durable storage, analytics, export, or backlog integrations in MVP unless scope changes and architecture is updated first.
- Configure TypeScript path aliases or package/build settings so shared contracts can be imported safely by both client and server code.
- Existing implementation-readiness assessment found the prior `epics.md` incomplete: Epic 2 and Epic 3 had no detailed story breakdowns, and FR4-FR15 were not traceable to complete stories.
- Story-level traceability must cover every PRD FR, NFR, and relevant architecture requirement before implementation readiness can pass.
- Story 1.4 should replace or supplement the phrase "allowed Session state" with explicit Participant snapshot fields from the architecture snapshot contract.

### UX Design Requirements

No UX Design document was found in the planning artifacts, so no separate UX-DR requirements were extracted.

### FR Coverage Map

FR1: Epic 1 - Create Session

FR2: Epic 1 - Join Session

FR3: Epic 1 - Show Participant Presence

FR4: Epic 2 - Set Current Story

FR5: Epic 2 - Select Deck

FR6: Epic 2 - Start Round

FR7: Epic 3 - Reset Or Advance Round

FR8: Epic 2 - Restrict Round Controls To Moderator

FR9: Epic 2 - Submit Vote

FR10: Epic 2 - Moderator Vote

FR11: Epic 2 - Preserve Vote Privacy Before Reveal

FR12: Epic 3 - Reveal Results

FR13: Epic 3 - Group Results By Vote Count

FR14: Epic 3 - Record Final Estimate

FR15: Epic 3 - Show Estimated Stories List

## Epic List

### Epic 1: Live Session Access

Moderators can create a Planning Poker Session, receive a Room Code, and Participants can join with required Display Names while the Moderator sees who is present.

**FRs covered:** FR1, FR2, FR3

### Epic 2: Hidden Voting Round

The Moderator can set the active Story and Deck, start a Round, and the team can submit hidden Votes with Moderator-only control enforcement.

**FRs covered:** FR4, FR5, FR6, FR8, FR9, FR10, FR11

### Epic 3: Reveal Results And Capture Estimates

The Moderator can reveal vote distribution, read consensus/outliers, record a Final Estimate, reset or advance the flow, and maintain a Moderator-only live list of Estimated Stories.

**FRs covered:** FR7, FR12, FR13, FR14, FR15

## Epic 1: Live Session Access

Moderators can create a Planning Poker Session, receive a Room Code, and Participants can join with required Display Names while the Moderator sees who is present.

### Story 1.1: Set Up Initial Project From Starter Template

As a Moderator,
I want a runnable Planning Poker application foundation,
So that live session creation and joining can be built on a consistent client, server, and shared contract structure.

**Requirements covered:** FR1 foundation, NFR2, NFR3, NFR4, NFR5, NFR6

**Acceptance Criteria:**

**Given** a fresh project workspace
**When** the developer initializes the application foundation
**Then** the project uses Vite React TypeScript for the client and a TypeScript Node/Express/Socket.IO server scaffold
**And** shared TypeScript contract folders exist for acknowledgements, errors, socket events, snapshots, decks, session types, and command schemas.

**Given** the server is running locally
**When** a request is made to the health endpoint
**Then** the server returns a successful health response
**And** the server is configured to listen on `process.env.PORT` for Azure App Service compatibility.

**Given** the project is prepared for future live-session stories
**When** tests are run
**Then** Vitest is configured for unit tests, React Testing Library is available for component tests, and Playwright configuration exists for future e2e flows.

**Given** the application is built for production
**When** the Node server starts
**Then** it can serve the Vite build output
**And** it provides an SPA fallback for React Router.

### Story 1.2: Moderator Creates A Session

As a Moderator,
I want to create a new Planning Poker Session and receive a Room Code,
So that I can invite the team into a shared estimation room quickly.

**Requirements covered:** FR1, NFR1, NFR2, NFR5, NFR6

**Acceptance Criteria:**

**Given** the Moderator is on the entry view
**When** they choose to create a Session
**Then** the server creates a new live Session with a generated Room Code
**And** the creator is treated as the Moderator for that Session.

**Given** a Session is created successfully
**When** the server returns the creation result
**Then** the response includes the Room Code and a Moderator capability token
**And** the Moderator token is stored in browser `sessionStorage`, not `localStorage`.

**Given** a newly created Session exists
**When** the Moderator lands in the Moderator session view
**Then** no active Story is shown until the Moderator adds one
**And** the Room Code is visible so it can be shared with Participants.

**Given** Session creation fails validation or rate limiting
**When** the Moderator attempts to create a Session
**Then** the UI shows a readable error derived from a stable error code
**And** no invalid local Session state is created.

**Given** the Session creation command is handled by the server
**When** the command is accepted
**Then** the server emits a sanitized Moderator snapshot
**And** hidden Vote data is not present in the snapshot structure.

### Story 1.3: Participant Joins A Session

As a Participant,
I want to join an existing Session with a Room Code and Display Name,
So that I can enter the team's estimation room without account setup.

**Requirements covered:** FR2, NFR1, NFR2, NFR4, NFR6

**Acceptance Criteria:**

**Given** a Participant is on the entry or join view
**When** they enter a valid Room Code and a non-empty Display Name
**Then** the server joins them to the matching active Session
**And** the response includes a Participant capability token.

**Given** a Participant joins successfully
**When** the client stores join state
**Then** the Participant token is stored in browser `sessionStorage`, not `localStorage`
**And** the Participant lands in the Participant session view for that Room Code.

**Given** a Display Name already exists in the Session
**When** another Participant joins with the same Display Name
**Then** the system allows the join
**And** the duplicate name is disambiguated for display with a numeric suffix such as `Maxi (2)`.

**Given** the Participant submits a missing Display Name, invalid Room Code, or inactive Room Code
**When** the join command is processed
**Then** the server rejects the request with a stable error code such as `INVALID_ROOM_CODE`
**And** the UI shows a readable message without entering the Session.

**Given** a Participant has joined the Session
**When** the Participant session view renders
**Then** it shows the current Story, Deck, Round state, and the Participant's own Vote state when those values exist
**And** it does not show Moderator-only controls or Moderator-only data.

### Story 1.4: Moderator Sees Participant Presence

As a Moderator,
I want to see who has joined the Session and whether they have voted,
So that I can manage the live estimation round without exposing hidden Vote values.

**Requirements covered:** FR3, NFR2, NFR5

**Acceptance Criteria:**

**Given** Participants have joined a Session
**When** the Moderator session view receives a Session snapshot
**Then** the Moderator sees a participant presence list with display names
**And** duplicate Display Names appear with their disambiguated labels.

**Given** a Round has not started
**When** the Moderator views participant presence
**Then** each joined Participant is visible
**And** no selected Card values are shown.

**Given** a Round is active and Participants submit Votes
**When** the Moderator receives updated snapshots
**Then** the presence list shows which Participants have submitted a Vote
**And** it does not show selected Card values before reveal.

**Given** a Participant joins after the Moderator is already in the Session
**When** the join command is accepted
**Then** the Moderator receives a near-real-time snapshot update
**And** the new Participant appears without the Moderator refreshing the page.

**Given** a Participant snapshot is emitted before reveal
**When** it includes Session state
**Then** it may include Room Code, current Story identifier and description, active Deck, Round state, the Participant's own Vote state, and participant display names with `hasVoted` status
**And** it must not include Moderator-only controls, Estimated Stories, capability tokens, or any selected Card value other than the viewer's own Vote state.

## Epic 2: Hidden Voting Round

The Moderator can set the active Story and Deck, start a Round, and the team can submit hidden Votes with Moderator-only control enforcement.

### Story 2.1: Moderator Sets Current Story And Deck

As a Moderator,
I want to set the current Story and estimation Deck before voting starts,
So that everyone estimates the same work item using the same card options.

**Requirements covered:** FR4, FR5, FR8, NFR2, NFR4

**Acceptance Criteria:**

**Given** the Moderator is in a Session with no active Round
**When** they enter or update a Story identifier and brief description
**Then** the server stores the current Story for the Session
**And** Moderator and Participant snapshots show the same Story identifier and description.

**Given** the Moderator is in a Session with no active Round
**When** they select the T-shirt Deck
**Then** the active Deck contains `XS`, `S`, `M`, `L`, and `XL`
**And** all joined users see those same card options.

**Given** the Moderator is in a Session with no active Round
**When** they select the Fibonacci Deck
**Then** the active Deck contains `1`, `2`, `3`, `5`, `8`, `13`, `21`, and `Coffee`
**And** all joined users see those same card options.

**Given** the Moderator attempts to update the Story or Deck during an active Round
**When** the command is processed
**Then** the server rejects the change with a stable error code such as `STORY_LOCKED`
**And** no current Story, Deck, Vote, or Round state is changed.

**Given** a Participant attempts to update the Story or Deck
**When** the command is processed
**Then** the server rejects the command with `UNAUTHORIZED`
**And** the Participant UI does not expose Story or Deck editing controls.

### Story 2.2: Moderator Starts A Voting Round

As a Moderator,
I want to start a voting Round for the current Story,
So that the team can begin submitting estimates in a controlled live flow.

**Requirements covered:** FR6, FR8, NFR2

**Acceptance Criteria:**

**Given** the Session has a current Story and selected Deck
**When** the Moderator starts a Round
**Then** the server changes the Round state to active
**And** all joined users receive a near-real-time snapshot showing that voting is open.

**Given** prior unrecorded Votes exist for the current Story
**When** the Moderator starts a new Round
**Then** the server clears those prior unrecorded Votes
**And** no previous selected Card values remain in the active Round state.

**Given** the Session has no current Story
**When** the Moderator attempts to start a Round
**Then** the server rejects the command with a stable error code such as `STORY_REQUIRED`
**And** the UI shows a readable message without changing Round state.

**Given** a Participant attempts to start a Round
**When** the command is processed
**Then** the server rejects the command with `UNAUTHORIZED`
**And** the Participant UI does not expose start controls.

**Given** a start Round command is pending
**When** the Moderator view is waiting for acknowledgement
**Then** the start control shows a pending or disabled state
**And** the UI does not optimistically mark the Round active before the server snapshot arrives.

### Story 2.3: Participants Submit And Change Hidden Votes

As a Participant,
I want to select one Card from the active Deck and change it before reveal,
So that I can submit my estimate privately and recover from misclicks while voting is open.

**Requirements covered:** FR9, FR11, NFR3, NFR4, NFR5

**Acceptance Criteria:**

**Given** a Round is active
**When** a Participant selects a Card from the active Deck
**Then** the server records that Card as the Participant's one active Vote for the Round
**And** the Participant receives confirmation through the next Session snapshot.

**Given** a Participant has already voted in the active Round
**When** they select a different Card before reveal
**Then** the server replaces their prior Vote with the new Card
**And** only one active Vote remains for that Participant.

**Given** a Participant tries to submit a Card that is not in the active Deck
**When** the vote command is processed
**Then** the server rejects the command with a stable validation error
**And** no Vote is recorded or changed.

**Given** no Round is active
**When** a Participant attempts to vote
**Then** the server rejects the command with `ROUND_NOT_ACTIVE`
**And** the UI keeps Card selection disabled or unavailable.

**Given** a Participant has submitted a Vote before reveal
**When** Moderator or Participant snapshots are emitted
**Then** other users may see that the Participant has voted
**And** no other user sees the selected Card value before reveal.

**Given** the Card grid is displayed
**When** the Participant uses keyboard navigation and readable labels
**Then** each Card can be reached and selected without a mouse
**And** the selected state is clear without relying on color alone.

### Story 2.4: Moderator Votes In The Round

As a Moderator,
I want to optionally submit my own Vote using the active Deck,
So that I can contribute an estimate under the same hidden-vote rules as Participants.

**Requirements covered:** FR10, FR11, NFR5

**Acceptance Criteria:**

**Given** a Round is active
**When** the Moderator selects a Card from the active Deck
**Then** the server records one Moderator Vote for the Round
**And** the Moderator Vote uses the same active Deck as Participant Votes.

**Given** the Moderator has already voted in the active Round
**When** they select a different Card before reveal
**Then** the server replaces their prior Vote with the new Card
**And** only one Moderator Vote remains for the Round.

**Given** the Moderator has not voted
**When** the Moderator reveals Results in a later story
**Then** the system allows the reveal because Moderator voting is optional
**And** no Moderator Vote is fabricated or required.

**Given** the Moderator has submitted a Vote before reveal
**When** snapshots are emitted
**Then** users may see that the Moderator has voted if Moderator voting status is shown
**And** no user sees the Moderator's selected Card value before reveal.

**Given** a Moderator vote command is pending
**When** the Moderator view waits for acknowledgement
**Then** the Card selection shows a pending or disabled state
**And** the UI does not optimistically expose or broadcast the selected Card before the server snapshot arrives.

### Story 2.5: Enforce Pre-Reveal Vote Privacy

As a team member,
I want submitted Cards to remain hidden until the Moderator reveals Results,
So that estimation stays fair and unbiased during the voting round.

**Requirements covered:** FR8, FR11, NFR5

**Acceptance Criteria:**

**Given** one or more users have voted and Results have not been revealed
**When** the server emits Participant snapshots
**Then** each Participant snapshot includes only the viewer's own Vote state plus voting status for others
**And** it does not include any other user's selected Card value.

**Given** one or more users have voted and Results have not been revealed
**When** the server emits Moderator snapshots
**Then** the Moderator snapshot may show who has voted
**And** it does not include selected Card values for Participants or Moderator before reveal.

**Given** Results have not been revealed
**When** the system logs command handling, errors, or snapshots
**Then** logs do not include capability tokens or hidden selected Card values.

**Given** a user attempts to infer grouped results before reveal through client state
**When** the snapshot is inspected
**Then** grouped counts, vote distribution, and selected Card values are absent before reveal
**And** only `hasVoted` style status is available.

**Given** a vote command is submitted with an invalid or mismatched capability token
**When** the server authorizes the command
**Then** the command is rejected with `UNAUTHORIZED`
**And** no Vote is recorded or changed.

**Given** pre-reveal privacy is implemented
**When** automated tests run
**Then** unit or contract tests verify sanitized snapshots omit hidden Votes
**And** an e2e test covers hidden-vote privacy across Moderator and Participant browser contexts.

## Epic 3: Reveal Results And Capture Estimates

The Moderator can reveal vote distribution, read consensus/outliers, record a Final Estimate, reset or advance the flow, and maintain a Moderator-only live list of Estimated Stories.

### Story 3.1: Moderator Reveals Round Results

As a Moderator,
I want to reveal Results for the active Round,
So that the team can discuss estimates only after private voting is complete.

**Requirements covered:** FR10, FR12, NFR2, NFR5

**Acceptance Criteria:**

**Given** a Round is active
**When** the Moderator reveals Results
**Then** the server changes the Round state to revealed
**And** all joined users receive a near-real-time snapshot showing that Results are revealed.

**Given** submitted Votes exist
**When** Results are revealed
**Then** submitted Card values become visible in post-reveal Session state
**And** hidden-vote restrictions no longer hide those submitted values for that revealed Round.

**Given** some Participants did not vote
**When** Results are revealed
**Then** non-voters remain distinguishable by Display Name
**And** they are not assigned a Card value.

**Given** the Moderator has not submitted a Vote
**When** the Moderator reveals Results
**Then** the reveal succeeds
**And** the Results do not include a fabricated Moderator Vote.

**Given** a Participant attempts to reveal Results
**When** the command is processed
**Then** the server rejects the command with `UNAUTHORIZED`
**And** the Participant UI does not expose reveal controls.

**Given** Results have already been revealed
**When** any user attempts to submit or change a Vote
**Then** the server rejects the command with `VOTE_LOCKED`
**And** no post-reveal Vote is added or changed.

### Story 3.2: Users Read Grouped Vote Results

As a team member,
I want revealed Votes grouped or ordered by count,
So that consensus and outliers are obvious without manual counting.

**Requirements covered:** FR13, NFR3, NFR4

**Acceptance Criteria:**

**Given** Results are revealed for a Round
**When** the Results view renders
**Then** selected Cards are grouped or ordered by number of Votes
**And** the most common selected Cards are easiest to identify.

**Given** Votes include more than one selected Card
**When** the Results view renders
**Then** outlier selections remain visible
**And** each group identifies which users selected that Card.

**Given** the active Deck is T-shirt
**When** Results are grouped
**Then** the view supports `XS`, `S`, `M`, `L`, and `XL` values
**And** no unsupported Card value appears.

**Given** the active Deck is Fibonacci
**When** Results are grouped
**Then** the view supports `1`, `2`, `3`, `5`, `8`, `13`, `21`, and `Coffee`
**And** `Coffee` is treated as a valid Card.

**Given** users view Results on desktop or mobile widths
**When** the Results view renders
**Then** grouped Results remain readable and usable
**And** no result labels, user names, or card values overlap incoherently.

**Given** the Results view uses visual emphasis
**When** a user reads the distribution
**Then** the majority and outlier information is understandable without relying on color alone
**And** screen-reader-readable text labels are available for the grouped Results.

### Story 3.3: Moderator Records Final Estimate

As a Moderator,
I want to select a Final Estimate from the active Deck after reveal,
So that the Session records the team's decision for the current Story.

**Requirements covered:** FR14, NFR2

**Acceptance Criteria:**

**Given** Results have been revealed for the current Round
**When** the Moderator selects a Final Estimate from the active Deck
**Then** the server records that value as the current Story's Final Estimate
**And** the value is one of the active Deck Cards.

**Given** the Moderator attempts to enter or submit a custom Final Estimate
**When** the command is processed
**Then** the server rejects the value with a stable validation error
**And** no Final Estimate is recorded or changed.

**Given** Results have not been revealed
**When** the Moderator attempts to record a Final Estimate
**Then** the server rejects the command with a stable error code such as `RESULTS_NOT_REVEALED`
**And** the UI keeps Final Estimate controls disabled or unavailable.

**Given** a Participant attempts to record a Final Estimate
**When** the command is processed
**Then** the server rejects the command with `UNAUTHORIZED`
**And** the Participant UI does not expose Final Estimate controls.

**Given** a Final Estimate is recorded for a Story that already exists in the Estimated Stories list
**When** the Moderator records a new Final Estimate for that same Story
**Then** the server updates the existing Estimated Story entry
**And** it does not create a duplicate entry for the same Story.

**Given** a Final Estimate command is pending
**When** the Moderator view waits for acknowledgement
**Then** the Final Estimate control shows a pending or disabled state
**And** the UI waits for the server snapshot before showing the estimate as recorded.

### Story 3.4: Moderator Resets Or Advances The Round

As a Moderator,
I want to reset the current Round or advance to the next Story after recording a Final Estimate,
So that I can keep the estimation session moving through multiple Stories.

**Requirements covered:** FR7, FR8, FR11, NFR2, NFR5

**Acceptance Criteria:**

**Given** a Round exists for the current Story
**When** the Moderator resets the Round
**Then** the server clears Votes and hides Results
**And** the Session returns to a state where voting can start again for the current Story.

**Given** Results were previously revealed
**When** the Moderator resets the Round
**Then** selected Card values are no longer visible in pre-reveal snapshots
**And** the next voting cycle preserves hidden-vote privacy.

**Given** a Final Estimate has been recorded for the current Story
**When** the Moderator advances to the next Story
**Then** the server prepares the Session for a new Story
**And** prior Estimated Stories remain available to the Moderator.

**Given** the Moderator advances to the next Story
**When** the new Session state is emitted
**Then** current Story fields, Votes, Results, and selected Final Estimate controls are cleared or returned to their next-story starting state
**And** the selected Deck behavior follows the implementation's documented default or retained-deck rule.

**Given** a Participant attempts to reset or advance the Round
**When** the command is processed
**Then** the server rejects the command with `UNAUTHORIZED`
**And** the Participant UI does not expose reset or advance controls.

**Given** reset or advance is pending
**When** the Moderator view waits for acknowledgement
**Then** the relevant control shows a pending or disabled state
**And** the UI does not optimistically clear or advance the Session before the server snapshot arrives.

### Story 3.5: Moderator Views Live Estimated Stories

As a Moderator,
I want to see the live list of Estimated Stories during the meeting,
So that I can refer back to recorded estimates without a separate notes workaround.

**Requirements covered:** FR15, NFR3, NFR4, NFR6

**Acceptance Criteria:**

**Given** the Moderator records a Final Estimate for a Story
**When** the server emits the next Moderator snapshot
**Then** the Estimated Stories list includes that Story's identifier, brief description, Deck, and Final Estimate
**And** the list is visible in the Moderator session view.

**Given** multiple Stories have recorded Final Estimates
**When** the Moderator views the Estimated Stories list
**Then** each entry remains visible for the live Session
**And** entries are readable at common desktop and mobile widths.

**Given** a Participant snapshot is emitted
**When** it contains Session state
**Then** it does not include the Estimated Stories list
**And** the Participant UI does not expose Moderator-only history.

**Given** the browser refreshes or the Session is later reopened
**When** v1 live-session-only behavior applies
**Then** the system is not required to restore Estimated Stories from durable storage
**And** no database, export, analytics, or long-term history feature is introduced for this requirement.

**Given** Estimated Stories are displayed
**When** the Moderator navigates the list with keyboard or assistive technology
**Then** Story identifiers, descriptions, Decks, and Final Estimates are available as readable text
**And** the list remains understandable without relying on color alone.
