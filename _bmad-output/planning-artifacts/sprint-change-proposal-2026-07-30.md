# Sprint Change Proposal

Date: 2026-07-30
Project: adr-buddy
Requested by: Maxi
Workflow mode: Batch (assumed from "move on")

## 1. Issue Summary

The team wants the project to run in a simpler, reproducible way using Docker containers and Docker Compose, so setup and execution are consistent across environments.

Trigger context:
- The current implementation can run locally via npm scripts, but there is no standardized containerized workflow.
- A one-command startup path is now desired for development and verification.

Issue type:
- New requirement emerged from stakeholders (delivery/runtime workflow requirement).

Evidence:
- Current README documents script-based startup only.
- No Dockerfile or compose file exists in the repository at this time.
- User explicitly requested "all these projects using docker containers and also docker compose to run it more simple".

## 2. Impact Analysis

### Epic Impact

- Existing Epic 1-3 product behavior remains valid.
- Add a new implementation epic for containerization and orchestration.
- No existing epic becomes obsolete.
- Existing epic completion status should remain intact; new work should be tracked as additive scope.

### Story Impact

- All completed stories 1.1 through 3.5 remain functionally valid.
- New stories are needed to introduce container build/runtime, compose orchestration, and docs/test verification.

### Artifact Conflicts

- PRD conflict: no direct functional conflict; PRD should be extended with a runtime/developer-operability NFR to formalize the new requirement.
- Architecture conflict: architecture should add a deployment/runtime topology section for containers and compose service boundaries.
- UX conflict: none required.

### Technical Impact

- Add Dockerfiles and .dockerignore rules.
- Add docker-compose for at least one standard flow (recommended: local production-like run).
- Optionally add compose override for hot-reload development.
- Update environment variable handling and service port mappings.
- Add healthcheck wiring and startup dependency ordering in compose.
- Update docs and smoke-test steps.

## 3. Recommended Approach

Selected approach: Hybrid of Option 1 (Direct Adjustment) and Option 3 (PRD MVP Review, minimal)

Rationale:
- Product behavior does not need redesign, so no rollback is needed.
- The new requirement is operational/developer-facing and should be represented in planning artifacts for traceability.
- Additive epic/stories preserve velocity while making the runtime path consistent and easier to run.

Effort estimate: Medium
Risk level: Medium
Timeline impact: Low to Medium (mostly implementation and verification work, low product-design disruption)

Alternatives considered:
- Potential rollback: Not viable; no benefit to reverting completed product features.
- Pure direct adjustment without PRD note: Possible but weaker traceability; not recommended.

## 4. Detailed Change Proposals

### 4.1 PRD Changes

Section: 5. Cross-Cutting Non-Functional Requirements

OLD:
- NFR-1 through NFR-6 only

NEW:
- Add NFR-7 Reproducible Runtime:
  - The application must provide a containerized runtime path using Docker and Docker Compose so contributors can start the system with a minimal command sequence and consistent dependencies.

Rationale:
- Captures the new stakeholder expectation as a first-class requirement.

Section: 7. MVP Scope

OLD:
- In-scope list does not mention containerized runtime.

NEW:
- Add in-scope item:
  - Provide Docker and Docker Compose assets for local run and verification.

Rationale:
- Ensures implementation scope and acceptance stay aligned with requested operating model.

### 4.2 Architecture Changes

Section: Runtime and Deployment Topology (new section)

OLD:
- No container topology section tied to Docker/Compose.

NEW:
- Add a section defining:
  - Service model for compose (recommended baseline):
    - app service: Node server serving built client and Socket.IO
  - Optional developer override profile:
    - client service (Vite dev server)
    - server service (Node/TS watch)
  - Network model, exposed ports, and container-to-container communication.
  - Healthcheck contract using /health.
  - Environment variable contract for containerized execution.
  - Build strategy and caching guidance.

Rationale:
- Prevents ad-hoc container setups and gives an agreed, supportable topology.

Section: Operational Constraints (update)

OLD:
- Local scripts are primary run path.

NEW:
- Define Docker Compose as the standard quick-start path; npm scripts remain valid for non-container workflows.

Rationale:
- Aligns architecture with usability objective while preserving flexibility.

### 4.3 Epics and Stories Changes

Artifact: epics.md

OLD:
- Epics 1-3 only; no containerization epic.

NEW:
- Add Epic 4: Containerized Runtime and Compose Orchestration

Proposed stories:

Story 4.1: Containerize Application Runtime
- Add production-oriented Dockerfile(s) and .dockerignore.
- Acceptance criteria:
  - Image builds successfully.
  - Container starts app and exposes configured port.
  - /health endpoint responds successfully in container.

Story 4.2: Compose One-Command Startup
- Add docker-compose baseline for simple startup.
- Acceptance criteria:
  - One command starts required services.
  - Service dependencies and healthchecks are configured.
  - Socket and HTTP behavior work through mapped ports.

Story 4.3: Developer and QA Container Workflow
- Add compose override/profile and documentation for local development/test usage.
- Acceptance criteria:
  - Clear commands for build, start, stop, and logs.
  - Smoke verification steps documented.
  - CI-ready compose smoke command defined.

Rationale:
- Keeps container work explicit, testable, and separable from completed feature epics.

### 4.4 Secondary Artifact Changes

README.md

OLD:
- Script-only run instructions.

NEW:
- Add Docker and Docker Compose quick-start and smoke validation sections.

Rationale:
- Improves onboarding and reduces setup ambiguity.

playwright.config.ts and/or test docs (as needed)

OLD:
- No documented containerized test execution path.

NEW:
- Add optional containerized test invocation guidance if adopted.

Rationale:
- Keeps QA repeatable in environments where node tooling is not preinstalled.

## 5. Implementation Handoff

Scope classification: Moderate

Handoff recipients and responsibilities:

1. Product Owner / PM
- Approve PRD NFR and MVP scope additions.
- Approve Epic 4 and story definitions.

2. Architect
- Update architecture runtime topology and operational constraints.
- Define canonical compose pattern and env contract.

3. Developer
- Implement Dockerfile(s), docker-compose files, ignore rules, and docs.
- Add/adjust smoke checks and verify socket + health behavior.

4. QA/Developer
- Validate one-command startup and core user journey sanity check in containers.

Success criteria:
- Epic 4 and its stories are added and accepted.
- Containerized startup works with Docker Compose.
- Health endpoint and core session flow work in composed runtime.
- Documentation enables a new contributor to run the app with minimal setup.

## 6. Checklist Summary

Section 1: Understand trigger and context
- 1.1 Trigger story: [x] Done (cross-cutting requirement, not a single story defect)
- 1.2 Core problem: [x] Done
- 1.3 Evidence: [x] Done

Section 2: Epic impact assessment
- 2.1 Current epic viability: [x] Done
- 2.2 Required epic changes: [x] Done
- 2.3 Remaining epics review: [x] Done
- 2.4 Obsolete/new epics check: [x] Done (new epic required)
- 2.5 Epic sequencing/priority: [x] Done

Section 3: Artifact conflict analysis
- 3.1 PRD conflict review: [x] Done
- 3.2 Architecture conflict review: [x] Done
- 3.3 UX conflict review: [N/A] Skip
- 3.4 Secondary artifacts impact: [x] Done

Section 4: Path forward evaluation
- 4.1 Direct adjustment: [x] Viable
- 4.2 Potential rollback: [x] Not viable
- 4.3 PRD MVP review: [x] Viable (minimal extension)
- 4.4 Recommended path selected: [x] Done (Hybrid)

Section 5: Proposal components
- 5.1 Issue summary: [x] Done
- 5.2 Epic/artifact impact: [x] Done
- 5.3 Recommendation + rationale: [x] Done
- 5.4 MVP impact + action plan: [x] Done
- 5.5 Agent handoff plan: [x] Done

Section 6: Final review and handoff
- 6.1 Checklist completion review: [x] Done
- 6.2 Proposal quality review: [x] Done
- 6.3 User approval: [!] Action-needed
- 6.4 sprint-status.yaml update: [!] Action-needed (after approval)
- 6.5 Final handoff confirmation: [!] Action-needed (after approval)

## 7. Decision Request

Do you approve this Sprint Change Proposal for implementation? (yes / no / revise)
