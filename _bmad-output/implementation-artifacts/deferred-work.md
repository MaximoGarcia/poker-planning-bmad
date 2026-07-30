## Deferred from: code review of 1-4-moderator-sees-participant-presence (2026-07-30)

- Reject stale same-room snapshots. `ModeratorSessionView` prefers any same-room `latestSnapshot`, and `useSessionSocket` accepts snapshots without monotonic timestamp checks; this predates Story 1.4 and should be addressed as part of snapshot-streaming consistency work.

## Deferred from: code review of 4-1-containerize-application-runtime (2026-07-30)

- No automated docker build/run test validates AC1/AC2; `server/containerization/dockerfile.test.ts` only asserts static string content in the Dockerfile, it never actually builds an image or starts a container and hits `/health`. Requires CI infrastructure (docker-in-docker or equivalent) beyond this story's scope — candidate for Story 4.3 (Document Docker Workflow And Smoke Checks).
