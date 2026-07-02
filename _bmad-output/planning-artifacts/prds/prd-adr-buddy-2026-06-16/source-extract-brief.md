# Source Extract: Product Brief

Source files:

- `_bmad-output/planning-artifacts/briefs/brief-adr-buddy-2026-06-16/brief.md`
- `_bmad-output/planning-artifacts/briefs/brief-adr-buddy-2026-06-16/addendum.md`
- `_bmad-output/planning-artifacts/briefs/brief-adr-buddy-2026-06-16/.decision-log.md`

## Product Signal

- Product: lightweight internal Planning Poker application.
- Audience: one internal agile team.
- Primary value: make estimation sessions simple, fair, readable, and faster than manual voting workarounds.
- Core workflow: moderator creates/manages a session, participants join by room code, moderator sets active story and starts a round, everyone votes privately, moderator reveals results, team discusses, moderator records final estimate, session advances to the next story.
- Form factor: web-based session tool.

## Confirmed Scope From Brief

- Moderator and Participant access types.
- Room-code join.
- Current story identifier and short description.
- T-shirt and Fibonacci estimation configurations.
- Moderator-only start and reveal controls.
- Hidden votes until reveal.
- Moderator can also vote.
- Revealed results grouped or ordered by vote count.
- Moderator records final estimate.
- Session preserves a list of estimated stories.
- Reset/advance for next story.

## Explicit Non-Goals

- Backlog integrations with Jira, GitHub, GitLab, or similar tools.
- Company-wide administration or multi-team management.
- Public signup, monetization, or external launch positioning.
- Custom card images, visual themes, or decorative decks in v1.
- Advanced reports, historical analytics, or velocity tracking.
- Built-in chat, async discussion, or meeting summaries.

## Concerns To Carry Into PRD

- Low-friction entry: participants should join and vote without setup.
- Real-time shared session state: moderator and participant views must stay coherent during a round.
- Fair estimation: votes must remain hidden before reveal.
- Moderator authority: only the moderator controls round state and final estimate capture.
- Readable reveal: consensus and outliers must be obvious without manual counting.
- Lightweight persistence: session-level estimated story history matters, but long-term analytics do not.
- Deck clarity: exact Fibonacci deck and final estimate rules remain open.
- Identity/name handling: display name requirement remains open.

## Open Source Questions

- Should participants enter a display name, or can names be optional?
- Should final estimates be selected from the active deck only, or can the moderator enter a custom value?
- What exact Fibonacci sequence should v1 use?
