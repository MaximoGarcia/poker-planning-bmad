## Deferred from: code review of 1-4-moderator-sees-participant-presence (2026-07-30)

- Reject stale same-room snapshots. `ModeratorSessionView` prefers any same-room `latestSnapshot`, and `useSessionSocket` accepts snapshots without monotonic timestamp checks; this predates Story 1.4 and should be addressed as part of snapshot-streaming consistency work.
