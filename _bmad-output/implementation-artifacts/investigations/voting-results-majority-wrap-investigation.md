# Investigation: Voting results majority label wraps excessively

## Hand-off Brief

1. **What happened.** The revealed-votes UI renders the `Majority` status inside a pill that can shrink too narrowly, and the surrounding result styles allow aggressive word breaking, so the label can wrap across multiple lines.
2. **Where the case stands.** Active; the rendering surface and the likely CSS interaction have been identified in `src/features/results/VoteGroupList.tsx` and `src/app/styles.css`, and the next step is to verify the minimal layout fix.
3. **What's needed next.** Adjust the status-pill layout CSS without changing business logic, then verify the revealed-results screen across responsive viewports and result combinations.

## Case Info

| Field            | Value                                                                 |
| ---------------- | --------------------------------------------------------------------- |
| Ticket           | N/A                                                                   |
| Date opened      | 2026-07-08                                                            |
| Status           | Active                                                                |
| System           | Windows workspace, React/Vite frontend, responsive browser UI         |
| Evidence sources | User defect report, source code, component tests, E2E test coverage   |

## Problem Statement

When revealing votes, the `Majority` label in the voting results screen appears inside a text box that is too narrow, causing the word to wrap across multiple lines and reducing readability.

## Evidence Inventory

| Source                                  | Status    | Notes                                                                                         |
| --------------------------------------- | --------- | --------------------------------------------------------------------------------------------- |
| `src/features/results/VoteGroupList.tsx`| Available | Confirms the `Majority` label is rendered in `.vote-group-status`.                            |
| `src/app/styles.css`                    | Available | Confirms the results list item allows aggressive wrapping and the status pill uses fit-content. |
| `src/features/results/VoteGroupList.test.tsx` | Available | Confirms the label is rendered, but does not yet verify responsive status-pill layout.       |
| Manual browser reproduction             | Partial   | User provided deterministic reproduction steps and observed symptom.                           |

## Investigation Backlog

| # | Path to Explore                                  | Priority | Status      | Notes                                                           |
| - | ------------------------------------------------ | -------- | ----------- | --------------------------------------------------------------- |
| 1 | Verify status-pill CSS interaction               | High     | In Progress | Check whether pill shrink/wrapping comes from `fit-content` and inherited wrapping behavior. |
| 2 | Apply minimal results-screen style fix           | High     | Open        | Preserve current business logic and existing results semantics. |
| 3 | Verify across viewports and result combinations  | High     | Open        | Reuse unit/E2E coverage and run responsive validation.          |
| 4 | Check for revealed-results visual regressions    | Medium   | Open        | Confirm outlier/result labels and voter lists still render cleanly. |

## Timeline of Events

| Time       | Event                                                                  | Source                     | Confidence |
| ---------- | ---------------------------------------------------------------------- | -------------------------- | ---------- |
| 2026-07-08 | Bug report identifies `Majority` label wrapping across multiple lines. | User report                | Confirmed  |
| 2026-07-08 | Results UI found in `VoteGroupList.tsx` using `.vote-group-status`.    | `src/features/results/VoteGroupList.tsx` | Confirmed  |
| 2026-07-08 | Results styles found in `styles.css` using `overflow-wrap:anywhere` on revealed-result items and `width: fit-content` on `.vote-group-status`. | `src/app/styles.css` | Confirmed |

## Confirmed Findings

### Finding 1: The `Majority` label is rendered inside the results detail area

**Evidence:** `src/features/results/VoteGroupList.tsx`

**Detail:** The revealed-results component renders the status text `Majority`, `Outlier`, or `Result` inside a `span.vote-group-status`.

### Finding 2: The results item styles combine aggressive wrapping with a shrink-to-fit status pill

**Evidence:** `src/app/styles.css`

**Detail:** The revealed-results list items use `overflow-wrap: anywhere`, and the status pill uses `width: fit-content`, which can allow the pill to collapse into a very narrow width in constrained layouts.

## Deduced Conclusions

### Deduction 1: The visual defect is rooted in CSS layout rules, not vote-grouping logic

**Based on:** Finding 1, Finding 2

**Reasoning:** The defect concerns only the display of the status label after results are already computed and rendered. The vote-grouping logic and label content are stable; the symptom arises from how the label container sizes and wraps text.

**Conclusion:** A minimal CSS adjustment should fix the bug without modifying business logic.

## Hypothesized Paths

### Hypothesis 1: `fit-content` plus aggressive wrapping lets the status pill collapse below the label's readable width

**Status:** Open

**Theory:** In narrower layouts or certain result combinations, `.vote-group-status` shrinks to a width that allows `Majority` to break over multiple lines because its parent context permits very aggressive wrapping.

**Supporting indicators:** The label is a short, unbroken word; wrapping it into many lines implies the container is being allowed to get narrower than the word's natural readable width.

**Would confirm:** A CSS change that keeps the pill at least max-content width or prevents status-word breaking removes the wrapping across responsive viewports.

**Would refute:** The wrapping persists even when the pill keeps its intrinsic width and the word is protected from breaking.

**Resolution:** Pending implementation and verification.

## Missing Evidence

| Gap                                   | Impact                                              | How to Obtain                                   |
| ------------------------------------- | --------------------------------------------------- | ----------------------------------------------- |
| Responsive verification after the fix | Confirms the fix works across supported screen sizes | Run automated tests and targeted viewport checks |

## Source Code Trace

| Element       | Detail                                              |
| ------------- | --------------------------------------------------- |
| Error origin  | `src/features/results/VoteGroupList.tsx`, `.vote-group-status` styling in `src/app/styles.css` |
| Trigger       | Moderator reveals grouped vote results              |
| Condition     | The results detail area constrains the status pill width too aggressively |
| Related files | `src/features/results/VoteGroupList.test.tsx`, `tests/e2e/create-session.spec.ts` |

## Conclusion

**Confidence:** Medium

The current evidence points to a presentation-layer bug in the revealed-results styles. The most likely cause is the interaction between aggressive wrapping on revealed-result items and the pill sizing rule on `.vote-group-status`. Verification after a minimal CSS change is still required.

## Recommended Next Steps

### Fix direction

Keep the status pill at its intrinsic readable width and prevent the status word from breaking unnaturally in constrained layouts.

### Diagnostic

Verify the component after the CSS change across desktop and narrow mobile widths, plus different majority/outlier/result combinations.

## Reproduction Plan

Create a moderator room, join from multiple sessions, submit votes, reveal results, and inspect the revealed status pill at desktop and narrow widths. Confirm the `Majority` label stays readable on one line unless the entire layout legitimately stacks for mobile.

## Side Findings

- Existing tests cover result semantics and accessibility labels well, but they do not directly assert responsive presentation of the status pill.

## Follow-up: 2026-07-08

### New Evidence

### Additional Findings

### Updated Hypotheses

### Backlog Changes

### Updated Conclusion
