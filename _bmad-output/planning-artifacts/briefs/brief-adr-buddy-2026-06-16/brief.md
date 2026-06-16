---
title: "Product Brief: Planning Poker Application"
status: draft
created: 2026-06-16
updated: 2026-06-16
---

# Product Brief: Planning Poker Application

## Executive Summary

This product is a lightweight internal Planning Poker application for one team to estimate user stories collaboratively. It gives a moderator control over the active story and estimation flow, while participants join by room code and submit hidden estimates using predefined card sets.

The first version should focus on making estimation sessions simple, fair, and readable. The core value is not broad agile process management; it is helping a team quickly align on story size without one participant anchoring the others. The moderator presents a story, starts a round, participants choose cards, and the estimates remain hidden until reveal.

The tool is intended to be standalone for now. Integrations, custom card artwork, and broader organization administration are future possibilities, but they should not distract from the initial workflow.

## The Problem

Teams need a simple way to estimate user stories together during refinement or planning. Without a shared tool, estimation can become informal, inconsistent, or biased by the first estimate spoken aloud. Remote or hybrid sessions add friction: people need to know which story is being discussed, submit estimates privately, and see results clearly at the same moment.

For this internal team, the cost of the status quo is not a market-sized business problem. It is day-to-day workflow drag: manual coordination, unclear voting state, less structured moderation, and slower convergence on a final estimate.

## The Solution

Build a web-based Planning Poker session tool with two access types:

- **Moderator**: creates or manages the session, sets the current story identifier and short description, selects the estimation configuration, starts the round, submits their own estimate, reveals results, and records the final estimate.
- **Participant**: joins the session by room code, sees the current story, selects one estimation card, and waits for the moderator to reveal the results.

Votes remain hidden until reveal. After reveal, the result view should make the group pattern obvious by grouping or ordering selected cards by vote count, so consensus and outliers are easy to spot.

## Who This Serves

The primary users are members of one internal agile team estimating user stories together. The moderator is likely a scrum master, product owner, tech lead, or any team member facilitating refinement. Participants are the team members contributing estimates.

Success for the moderator means they can run an estimation flow without juggling external notes, manual vote counting, or unclear state. Success for participants means they can join quickly, understand the active story, and submit an estimate without extra explanation.

## First-Version Scope

In scope:

- Create or manage an estimation session.
- Join a session by room code.
- Support moderator and participant access.
- Let the moderator set the current story identifier and brief description.
- Let the moderator choose an estimation configuration.
- Support T-shirt sizes: XS, S, M, L, XL.
- Support Fibonacci values. [ASSUMPTION] The initial deck should use a common compact sequence such as 1, 2, 3, 5, 8, 13, 21 unless the team prefers a different variant.
- Let only the moderator start an estimation round.
- Let participants select one card per round.
- Let the moderator also select one card per round.
- Keep votes hidden before reveal.
- Reveal results on moderator action.
- Show revealed cards grouped or ordered by number of votes.
- Let the moderator record the final estimate for the current story.
- Preserve a list of estimated stories within the session.
- Reset or advance the flow for the next story. [ASSUMPTION] This is needed for a complete session, even if story management stays minimal.

Out of scope for version 1:

- Jira, Azure DevOps, GitHub, or other backlog integrations.
- Company-wide administration or multi-team management.
- Public signup, monetization, or external launch positioning.
- Custom card images, visual themes, or decorative decks.
- Advanced reports, historical analytics, or velocity tracking.
- Built-in chat, async discussion threads, or meeting summaries.

## Success Criteria

The first version is successful if one internal team can run an estimation session without a separate voting workaround.

Useful signals:

- A moderator can create a session and share a room code quickly.
- Participants can join and vote without account setup. [ASSUMPTION]
- Votes are hidden until reveal, preventing early anchoring.
- The result screen makes consensus and outliers clear without manual counting.
- The moderator can record the final estimate for each story.
- The session keeps a usable list of estimated stories for the meeting.
- The team chooses to use the tool repeatedly during refinement instead of reverting to manual process.

## Product Principles

- **Low friction over completeness**: joining and voting should be faster than explaining the tool.
- **Moderator-led flow**: one person controls round state so the session remains orderly.
- **Fair estimation**: participants vote independently before results are visible.
- **Readable outcomes**: the reveal should support discussion, not just display raw votes.
- **Expandable but narrow**: leave room for custom decks and themes later, but keep version 1 focused.

## Open Questions

- Should participants enter only a display name, or should names be optional? [ASSUMPTION] Display names are useful for seeing who has voted.
- Should the final estimate be selected from the deck only, or can the moderator enter a custom value?
- What exact Fibonacci deck should the team use?

## Vision

If the first version works well, the tool can become the team’s lightweight estimation companion: room-based sessions, clean card selection, visible team alignment, and enough history to carry final estimates into downstream planning.

Future expansion could include custom card sets, themed cards, custom images, reusable sessions, simple history, export, and eventually backlog integrations if the team’s workflow justifies the added complexity.
