# Sprint Change Proposal

Date: 2026-07-02
Project: `poker-planning-bmad`
Requested by: Maxi
Workflow mode: Incremental

## 1. Issue Summary

The project needs a course correction to remove cloud-specific implementation and deployment requirements while preserving the planned product behavior and core technical approach.

The issue was identified because the current planning artifacts embed deployment and operational work that the team does not want in scope. The product requirements remain valid; the conflict exists in implementation and operational assumptions.

Evidence found in current artifacts:

- `epics.md` Story 1.1 included deployment-oriented startup language.
- `epics.md` Story 1.5 introduced CI/CD, deployment, and monitoring work that is now out of scope.
- `architecture.md` included deployment and operational guidance beyond local runtime needs.
- `implementation-readiness-report-2026-06-19.md` reinforced the removed operational scope and should now be treated as outdated in that area.

## 2. Impact Analysis

### Epic Impact

- Epic 1 remains valid but requires targeted updates to Story 1.1 and Story 1.5.
- Epic 2 remains valid with no functional scope changes required.
- Epic 3 remains valid with no functional scope changes required.
- No new epic is required.
- No epic becomes obsolete.
- Epic ordering and priority do not need to change.

### Story Impact

- Story 1.1 must remove deployment assumptions and also remove production deployment readiness work from acceptance criteria.
- Story 1.5 must be removed entirely from Epic 1.
- Stories in Epic 2 and Epic 3 do not require scope changes because their behavior is independent of deployment concerns.

### Artifact Conflicts

- PRD conflict: none at the product-behavior level.
- Architecture conflict: current deployment and operational sections exceed the local-only scope and should be removed or reduced.
- Epic/story conflict: Epic 1 contains wording and story scope that no longer match the desired local-only implementation direction.
- UX conflict: none identified. No UX design artifact was present, and no user-flow changes are implied by this correction.

### Technical Impact

- Keep the current application shape: React + TypeScript + Node/Express + Socket.IO.
- Keep local-development runtime assumptions only where needed to implement and run the app during development.
- Remove deployment, CI/CD, and monitoring scope from current planning artifacts.
- Do not introduce new infrastructure such as Redis, managed real-time brokers, durable storage, deployment platforms, or monitoring stacks as part of this correction.

## 3. Recommended Approach

Selected approach: Option 1, Direct Adjustment

Rationale:

- The product scope and functional behavior remain correct.
- The required change is localized to planning and architecture language, not MVP capability design.
- This preserves team momentum and avoids unnecessary rework in unaffected stories.
- The core technical design can remain intact while removing vendor lock-in and non-essential operational scope from planning artifacts.

Effort estimate: Low to Medium

Risk level: Low

Timeline impact:

- Minimal planning impact.
- Potentially positive implementation impact because the team can choose the most convenient hosting path later without conflicting with approved planning artifacts.

Alternatives considered:

- Potential rollback: not recommended because no implementation rollback is needed to correct planning assumptions.
- MVP review: not recommended because MVP scope and user value are unchanged.

## 4. Detailed Change Proposals

### Stories

#### Story 1.1: Set Up Initial Project From Starter Template

Section: Acceptance Criteria

OLD:

- "And the server is configured to listen on `process.env.PORT` for cloud-host compatibility."

NEW:

- "And the server is configured to run locally with the expected application port configuration for development."

OLD:

- "Given the app is built for production"
- "When the Node server starts"
- "Then it can serve the Vite build output"
- "And it provides an SPA fallback for React Router."

NEW:

- Remove this acceptance criterion.

OLD:

- "Given the app is prepared for deployment"
- "When production scripts and startup configuration are inspected"
- "Then package scripts build the React client and TypeScript server"
- "And the production start script launches the compiled Node server that serves `dist`, exposes `/health`, hosts Socket.IO, and listens on `process.env.PORT`."

NEW:

- "Given the project is initialized for implementation ... it includes the Vite React TypeScript client, the Node/Express/Socket.IO server scaffold, shared contracts, and test setup"
- "And it does not assume any cloud-vendor-specific hosting or deployment scripts as a product requirement."
- Remove this acceptance criterion.

Justification:

- Preserves the implementation foundation while narrowing the story to local development setup only.

#### Story 1.5: Prepare CI/CD And Operational Readiness

Section: Story existence and scope

OLD:

- Full story exists as a scoped planning item under Epic 1.

NEW:

- Remove Story 1.5 entirely.

Justification:

- Deployment, CI, CD, and monitoring are explicitly out of scope for the current effort.

### Architecture

Section: Deployment decision and infrastructure assumptions

OLD:

- "Decision: Deploy as one Node.js app in a hosted runtime, single instance for MVP."

NEW:

- Remove or substantially reduce this deployment decision section so the document only preserves local runtime assumptions needed for development and implementation.

OLD:

- "A hosted runtime is assumed for that shape."

NEW:

- Remove deployment-specific rationale that is no longer in scope.

OLD:

- Deployment, CI/CD, and monitoring bullets that are no longer in scope.

NEW:

- Remove deployment-platform, CI/CD, and monitoring guidance from current architecture scope.

Justification:

- Aligns the architecture artifact with the updated scope: local implementation only, no deployment or operational planning work.

### PRD

No PRD text change is currently recommended.

Justification:

- The PRD describes product behavior and scope, which remain valid without deployment planning.

## 5. Implementation Handoff

Scope classification: Moderate

Reasoning:

- This is more than a minor wording fix because multiple planning artifacts need coordinated updates.
- It does not require a fundamental replan because MVP scope, core epics, and product behavior remain stable.

Recommended handoff:

- Product Owner / Developer

Responsibilities:

- Product Owner or planning owner updates `epics.md` to remove Story 1.5 and trim Story 1.1 to local development setup.
- Architecture owner updates `architecture.md` to remove deployment, CI/CD, and monitoring guidance from current scope.
- Developer implements against the revised technical direction without introducing unnecessary infrastructure or operational work.

Success criteria:

- Story 1.5 is removed from Epic 1.
- Story 1.1 is limited to local implementation foundation work.
- Architecture no longer includes deployment or broader operational planning as in-scope work.
- PRD remains unchanged unless later product scope changes emerge.
- Functional implementation work remains focused on the product itself rather than delivery infrastructure.

## Checklist Summary

- 1.1 Triggering story: [x] Done
- 1.2 Core problem: [x] Done
- 1.3 Evidence: [x] Done
- 2.1 Current epic viability: [x] Done
- 2.2 Required epic-level changes: [x] Done
- 2.3 Remaining epic review: [x] Done
- 2.4 New or obsolete epics: [x] Done
- 2.5 Epic order or priority: [x] Done
- 3.1 PRD conflict review: [x] Done
- 3.2 Architecture conflict review: [x] Done
- 3.3 UX conflict review: [N/A] Skip
- 3.4 Other artifact impact: [x] Done
- 4.1 Direct adjustment: [x] Viable
- 4.2 Potential rollback: [x] Not viable
- 4.3 PRD MVP review: [x] Not viable
- 4.4 Recommended path: [x] Done
- 5.1 Issue summary: [x] Done
- 5.2 Epic and artifact impact summary: [x] Done
- 5.3 Recommended path rationale: [x] Done
- 5.4 PRD MVP impact and action plan: [x] Done
- 5.5 Agent handoff plan: [x] Done

## Notes On Sprint Status

`sprint-status.yaml` may need an update after final approval because Story 1.5 is being removed from the approved story inventory.
