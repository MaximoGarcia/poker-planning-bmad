---
title: "Sprint Change Proposal: Surgical Readiness Fixes"
project: "adr-buddy"
date: "2026-06-19"
mode: "Batch"
status: "approved"
trigger: "Implementation readiness blockers in Story 1.4, Story 2.4, Story 3.4, and missing setup/operational acceptance criteria"
approved_by: "Maxi"
approved_at: "2026-06-19"
---

# Sprint Change Proposal: Surgical Readiness Fixes

## 1. Issue Summary

The implementation readiness assessment on 2026-06-19 found `adr-buddy` close to implementation-ready but still blocked by story-level issues in `_bmad-output/planning-artifacts/epics.md`.

The issue is not a PRD scope change, architecture pivot, or MVP reduction. The blockers are surgical backlog-quality defects:

- Story 1.4 depends on Epic 2 voting behavior even though Epic 1 must be independently completable.
- Story 2.4 depends on Epic 3 reveal behavior even though Epic 2 should stop at hidden voting.
- Story 3.4 leaves the Deck behavior after advancing to the next Story undefined.
- Story 1.1 does not explicitly capture Azure App Service startup scripts or shared-contract import/build setup.
- CI/CD, Azure App Settings, Application Insights, and log streaming are present in the architecture/inventory but not attached to concrete story acceptance criteria.

Evidence source: `_bmad-output/planning-artifacts/implementation-readiness-report-2026-06-19.md`, especially "Critical Issues Requiring Immediate Action."

## 2. Impact Analysis

### Epic Impact

Epic 1 remains valid but needs cleanup so it can stand alone as "Live Session Access." Story 1.4 should cover joined participant presence before voting behavior exists. Setup/operational readiness should be made explicit in Epic 1 because the first implementation slice establishes the project foundation and deployment path.

Epic 2 remains valid but Story 2.4 should not require reveal behavior. Moderator optional reveal without voting already belongs in Story 3.1, where it is currently present.

Epic 3 remains valid but Story 3.4 must define the Deck rule after `story:advance`. The recommended rule is to retain the selected Deck across Stories unless the Moderator changes it before starting the next Round. This preserves low-friction repeated estimation and avoids implementation discretion.

No new epic is required. No epic should be removed, reordered, or redefined.

### Story Impact

Affected stories:

- Story 1.1: add setup acceptance criteria for shared imports/build config and Azure App Service scripts.
- Story 1.4: narrow to participant presence only; move active-round vote status out of Epic 1.
- Story 2.3 or Story 2.5: receive the active-round `hasVoted`/snapshot privacy behavior moved out of Story 1.4.
- Story 2.4: remove the reveal-without-moderator-vote criterion.
- Story 3.4: make retained Deck behavior explicit.
- New Story 1.5: add operational readiness coverage for CI/CD, Azure App Settings, Application Insights, log streaming, and App Service runtime configuration.

### Artifact Conflicts

PRD impact: none. FR and MVP scope remain unchanged.

Architecture impact: none. The proposed edits align with the existing architecture decisions for Azure App Service, GitHub Actions, shared TypeScript contracts, Application Insights, and server-authoritative Socket.IO state.

UX impact: no separate UX artifact exists. Story acceptance criteria remain the UX source of truth.

Other artifacts: no `sprint-status.yaml` was found, so no status-file change is required at proposal time.

### Technical Impact

These edits reduce implementation ambiguity and prevent downstream agents from guessing cross-epic behavior. They do not introduce new runtime technologies, persistence, authentication, integrations, analytics, or multi-instance infrastructure.

## 3. Recommended Approach

Recommended path: Direct Adjustment.

Rationale:

- Effort: Low. The changes are localized to backlog/story text.
- Risk: Low. No PRD or architecture decision changes are needed.
- Timeline impact: Small. Adding one operational-readiness story may add implementation work, but it records work the architecture already requires rather than expanding MVP product scope.
- Sustainability: High. The edits preserve epic independence, make behavior testable, and improve handoff clarity for implementation agents.

Rejected alternatives:

- Potential Rollback: Not applicable. This is planning refinement, not a failed implementation approach.
- PRD MVP Review: Not needed. MVP goals remain achievable and unchanged.

## 4. Detailed Change Proposals

### Proposal A: Update FR Coverage Map For FR3

Artifact: `_bmad-output/planning-artifacts/epics.md`

OLD:

```md
FR3: Epic 1 - Show Participant Presence
```

NEW:

```md
FR3: Epic 1 - Show joined participant presence; Epic 2 - Show voting status after Vote submission exists
```

Rationale: Moving active-round voting status out of Epic 1 means FR3 is covered across the access and voting slices. This keeps traceability honest.

### Proposal B: Add Setup Acceptance Criteria To Story 1.1

Story: Story 1.1 - Set Up Initial Project From Starter Template

Add after the existing production-build acceptance criterion:

```md
**Given** shared contracts are used by both client and server code
**When** TypeScript build, test, and runtime entry points import shared modules
**Then** the project configuration resolves shared contract imports without duplicate contract definitions
**And** the chosen path aliases, package settings, or build settings work for both Vite client code and the Node server build.

**Given** the app is prepared for Azure App Service deployment
**When** production scripts and startup configuration are inspected
**Then** package scripts build the React client and TypeScript server
**And** the production start script launches the compiled Node server that serves `dist`, exposes `/health`, hosts Socket.IO, and listens on `process.env.PORT`.
```

Rationale: The architecture requires Azure App Service build/start scripts and shared-contract importability. Story 1.1 currently implies the scaffold but does not make these handoff items directly testable.

### Proposal C: Narrow Story 1.4 To Epic 1 Presence Only

Story: Story 1.4 - Moderator Sees Participant Presence

OLD:

```md
As a Moderator,
I want to see who has joined the Session and whether they have voted,
So that I can manage the live estimation round without exposing hidden Vote values.

**Requirements covered:** FR3, NFR2, NFR5
```

NEW:

```md
As a Moderator,
I want to see who has joined the Session,
So that I can confirm the team is present before estimation begins.

**Requirements covered:** FR3 presence foundation, NFR2
```

OLD acceptance criterion to remove:

```md
**Given** a Round is active and Participants submit Votes
**When** the Moderator receives updated snapshots
**Then** the presence list shows which Participants have submitted a Vote
**And** it does not show selected Card values before reveal.
```

OLD acceptance criterion to remove from Story 1.4 and relocate to Epic 2 privacy coverage:

```md
**Given** a Participant snapshot is emitted before reveal
**When** it includes Session state
**Then** it may include Room Code, current Story identifier and description, active Deck, Round state, the Participant's own Vote state, and participant display names with `hasVoted` status
**And** it must not include Moderator-only controls, Estimated Stories, capability tokens, or any selected Card value other than the viewer's own Vote state.
```

Story 1.4 should keep these Epic 1-verifiable criteria:

```md
**Given** Participants have joined a Session
**When** the Moderator session view receives a Session snapshot
**Then** the Moderator sees a participant presence list with display names
**And** duplicate Display Names appear with their disambiguated labels.

**Given** a Round has not started
**When** the Moderator views participant presence
**Then** each joined Participant is visible
**And** no selected Card values are shown.

**Given** a Participant joins after the Moderator is already in the Session
**When** the join command is accepted
**Then** the Moderator receives a near-real-time snapshot update
**And** the new Participant appears without the Moderator refreshing the page.
```

Rationale: Epic 1 should not require active Rounds or Vote submission, which are introduced in Epic 2.

### Proposal D: Move Voting Status And Snapshot Privacy To Epic 2

Recommended target: Story 2.3 - Participants Submit And Change Hidden Votes, plus Story 2.5 - Enforce Pre-Reveal Vote Privacy.

Add to Story 2.3:

```md
**Given** a Round is active and Participants submit Votes
**When** the Moderator receives updated snapshots
**Then** the presence list shows which Participants have submitted a Vote
**And** it does not show selected Card values before reveal.
```

Add to Story 2.5:

```md
**Given** a Participant snapshot is emitted before reveal
**When** it includes Session state
**Then** it may include Room Code, current Story identifier and description, active Deck, Round state, the viewer's own Vote state, and participant display names with `hasVoted` status
**And** it must not include Moderator-only controls, Estimated Stories, capability tokens, grouped result counts, or any selected Card value other than the viewer's own Vote state.
```

Rationale: Story 2.3 owns Vote submission behavior. Story 2.5 owns pre-reveal privacy and sanitized snapshot rules. Together they preserve FR3/FR11 coverage without making Epic 1 depend on Epic 2.

### Proposal E: Remove Forward Dependency From Story 2.4

Story: Story 2.4 - Moderator Votes In The Round

OLD acceptance criterion to remove:

```md
**Given** the Moderator has not voted
**When** the Moderator reveals Results in a later story
**Then** the system allows the reveal because Moderator voting is optional
**And** no Moderator Vote is fabricated or required.
```

No new text is required in Story 2.4. Story 3.1 already contains the correct reveal-stage criterion:

```md
**Given** the Moderator has not submitted a Vote
**When** the Moderator reveals Results
**Then** the reveal succeeds
**And** the Results do not include a fabricated Moderator Vote.
```

Rationale: Optional Moderator voting should be verified in Story 2.4 only up to submission/replacement/privacy. Reveal authorization belongs to Story 3.1.

### Proposal F: Make Story 3.4 Deck Behavior Explicit

Story: Story 3.4 - Moderator Resets Or Advances The Round

OLD:

```md
**Given** the Moderator advances to the next Story
**When** the new Session state is emitted
**Then** current Story fields, Votes, Results, and selected Final Estimate controls are cleared or returned to their next-story starting state
**And** the selected Deck behavior follows the implementation's documented default or retained-deck rule.
```

NEW:

```md
**Given** the Moderator advances to the next Story
**When** the new Session state is emitted
**Then** current Story fields, Votes, Results, and selected Final Estimate controls are cleared or returned to their next-story starting state
**And** the selected Deck remains unchanged for the next Story unless the Moderator changes it before starting the next Round.
```

Rationale: Retaining the Deck matches low-friction live estimation because teams usually estimate multiple Stories with the same Deck. It also makes the acceptance criterion independently testable.

### Proposal G: Add Operational Readiness Story

Recommended location: Epic 1 after Story 1.4, as Story 1.5.

NEW story:

```md
### Story 1.5: Prepare CI/CD And Operational Readiness

As a Developer,
I want the application foundation to include CI/CD and operational configuration,
So that the MVP can be built, deployed, and monitored consistently on Azure App Service.

**Requirements covered:** Architecture operational requirements, NFR2, NFR6

**Acceptance Criteria:**

**Given** the repository is prepared for continuous integration
**When** the GitHub Actions workflow runs
**Then** it installs dependencies, type-checks or builds the TypeScript client and server, runs configured tests, and produces the deployable Node app output
**And** deployment credentials are not checked into the repository.

**Given** the app is configured for Azure App Service
**When** deployment documentation or configuration is reviewed
**Then** it identifies required App Service settings for Node runtime, `process.env.PORT`, Web sockets, HTTPS Only, Always On for non-free production tiers, and single-instance MVP operation
**And** it notes that session affinity should remain enabled if more than one instance is tested before shared state is introduced.

**Given** runtime configuration is required
**When** `.env.example` or deployment documentation is reviewed
**Then** required Azure App Settings and environment variables are documented without secret values
**And** local development origins and production origin expectations for restrictive CORS are clear.

**Given** the server runs in production
**When** operational telemetry is configured
**Then** Application Insights can collect server-side health, error, and request telemetry
**And** App Service log streaming can be used for troubleshooting without logging capability tokens or hidden Vote values before reveal.
```

Rationale: CI/CD and observability are already architecture requirements. A dedicated story prevents them from being lost as inventory-only requirements and avoids overloading Story 1.1.

## 5. Implementation Handoff

Scope classification: Moderate.

Reason: No PRD or architecture replan is required, but the backlog should be edited and one new story should be added before implementation readiness is rerun.

Recommended owners:

- Product Owner / Developer: apply the `epics.md` story edits and preserve FR traceability.
- Developer agent: implement the revised stories after readiness passes.
- Architect: no action required unless the team rejects retained Deck behavior or the operational story changes infrastructure decisions.

Success criteria:

- Story 1.4 is independently completable within Epic 1.
- Story 2.4 no longer references Epic 3 reveal behavior.
- Story 3.4 has a single explicit Deck-retention rule.
- Story 1.1 includes shared-contract import/build setup and Azure production start criteria.
- Operational readiness is covered by concrete story acceptance criteria.
- Implementation readiness can be rerun without the five named blockers recurring.

## 6. Checklist Completion

### Section 1: Understand Trigger and Context

- [x] 1.1 Triggering story identified: Story 1.4, Story 2.4, Story 3.4, and setup/ops criteria from readiness report.
- [x] 1.2 Core problem defined: story-level readiness defects, not product or architecture change.
- [x] 1.3 Evidence gathered: implementation readiness report and current `epics.md` story text.

### Section 2: Epic Impact Assessment

- [x] 2.1 Current epics can still be completed with targeted story edits.
- [x] 2.2 No epic addition/removal/redefinition required.
- [x] 2.3 Remaining epics reviewed; impacts are localized.
- [x] 2.4 No future epic invalidated.
- [x] 2.5 Epic order remains unchanged.

### Section 3: Artifact Conflict and Impact Analysis

- [x] 3.1 PRD has no conflict and MVP remains achievable.
- [x] 3.2 Architecture has no conflict; edits align with existing decisions.
- [N/A] 3.3 UX spec not found; stories remain the UI/UX source of truth.
- [x] 3.4 Other artifacts considered; `sprint-status.yaml` not found.

### Section 4: Path Forward Evaluation

- [x] 4.1 Direct Adjustment is viable; effort low, risk low.
- [N/A] 4.2 Rollback is not applicable.
- [N/A] 4.3 PRD MVP Review is not needed.
- [x] 4.4 Recommended path selected: Direct Adjustment.

### Section 5: Sprint Change Proposal Components

- [x] 5.1 Issue summary created.
- [x] 5.2 Epic impact and artifact adjustment needs documented.
- [x] 5.3 Recommended path forward documented.
- [x] 5.4 PRD MVP impact and action plan documented.
- [x] 5.5 Handoff plan established.

### Section 6: Final Review and Handoff

- [x] 6.1 Checklist reviewed.
- [x] 6.2 Proposal reviewed for consistency and clarity.
- [x] 6.3 User approval received on 2026-06-19.
- [N/A] 6.4 `sprint-status.yaml` was not found.
- [x] 6.5 Next steps and handoff plan confirmed.

## 7. Approval And Routing

Approved by Maxi on 2026-06-19.

Change scope classification: Moderate.

Route to: Product Owner / Developer agents.

Handoff deliverables:

- Approved Sprint Change Proposal.
- Backlog reorganization plan captured in Detailed Change Proposals.
- Concrete `epics.md` edits for Story 1.1, Story 1.4, Story 2.3, Story 2.4, Story 2.5, Story 3.4, and new Story 1.5.

Next steps:

1. Apply the approved edits to `_bmad-output/planning-artifacts/epics.md`.
2. Rerun implementation readiness validation.
3. If readiness passes, route revised stories to Developer agent for implementation.
