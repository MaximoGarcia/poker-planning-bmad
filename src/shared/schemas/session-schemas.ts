import { z } from 'zod'
import { PARTICIPANT_ROLES } from '../domain/session-types.js'
import { PlanningDeckIdSchema, RoomCodeSchema } from './command-schemas.js'

export const ParticipantSnapshotSchema = z
  .object({
    id: z.string().min(1),
    displayName: z.string().min(1),
    role: z.enum(PARTICIPANT_ROLES),
    connected: z.boolean(),
    hasVoted: z.boolean(),
  })
  .strict()

export const StorySnapshotSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    locked: z.boolean(),
  })
  .strict()

export const RoundSnapshotSchema = z
  .object({
    active: z.boolean(),
    revealed: z.boolean(),
    voteCount: z.number().int().nonnegative(),
  })
  .strict()

export const RevealedVoteSnapshotSchema = z
  .object({
    participantId: z.string().min(1),
    displayName: z.string().min(1),
    role: z.enum(PARTICIPANT_ROLES),
    value: z.string().min(1),
  })
  .strict()

export const RevealedResultsSnapshotSchema = z
  .object({
    votes: z.array(RevealedVoteSnapshotSchema),
  })
  .strict()

export const EstimatedStorySnapshotSchema = z
  .object({
    storyId: z.string().min(1),
    title: z.string().min(1),
    deck: z.object({
      id: PlanningDeckIdSchema,
      label: z.string().min(1),
      values: z.array(z.string().min(1)).readonly(),
    }),
    finalEstimate: z.string().min(1),
  })
  .strict()

export const SessionSnapshotSchema = z
  .object({
    roomCode: RoomCodeSchema,
    deck: z.object({
      id: PlanningDeckIdSchema,
      label: z.string().min(1),
      values: z.array(z.string().min(1)).readonly(),
    }),
    story: StorySnapshotSchema.nullable(),
    participants: z.array(ParticipantSnapshotSchema),
    round: RoundSnapshotSchema,
    results: RevealedResultsSnapshotSchema.nullable().default(null),
    estimatedStories: z.array(EstimatedStorySnapshotSchema).optional(),
    currentStoryHasFinalEstimate: z.boolean().optional(),
    updatedAt: z.string().datetime(),
  })
  .strict()
  .superRefine((snapshot, context) => {
    if (snapshot.round.revealed && !snapshot.results) {
      context.addIssue({
        code: 'custom',
        message: 'Results are required after reveal.',
        path: ['results'],
      })
    }

    if (!snapshot.round.revealed && snapshot.results) {
      context.addIssue({
        code: 'custom',
        message: 'Results must be null before reveal.',
        path: ['results'],
      })
    }
  })

export const CreateSessionResultSchema = z
  .object({
    roomCode: RoomCodeSchema,
    moderatorToken: z.string().min(32).regex(/^[A-Za-z0-9_-]+$/),
    snapshot: SessionSnapshotSchema,
  })
  .strict()
  .refine((result) => result.snapshot.roomCode === result.roomCode, {
    message: 'Snapshot room code must match create result room code',
    path: ['snapshot', 'roomCode'],
  })

export const JoinSessionResultSchema = z
  .object({
    roomCode: RoomCodeSchema,
    participantToken: z.string().min(32).regex(/^[A-Za-z0-9_-]+$/),
    participantId: z.string().min(1),
    displayName: z.string().min(1),
    snapshot: SessionSnapshotSchema,
  })
  .strict()
  .refine((result) => result.snapshot.roomCode === result.roomCode, {
    message: 'Snapshot room code must match join result room code',
    path: ['snapshot', 'roomCode'],
  })
  .refine(
    (result) =>
      result.snapshot.participants.some(
        (participant) =>
          participant.id === result.participantId &&
          participant.displayName === result.displayName &&
          participant.role === 'participant',
      ),
    {
      message: 'Joined participant must be present in snapshot',
      path: ['participantId'],
    },
  )

export const SessionSnapshotAckSchema = SessionSnapshotSchema

export type ParticipantSnapshotData = z.infer<typeof ParticipantSnapshotSchema>
export type RevealedVoteSnapshotData = z.infer<typeof RevealedVoteSnapshotSchema>
export type RevealedResultsSnapshotData = z.infer<typeof RevealedResultsSnapshotSchema>
export type EstimatedStorySnapshotData = z.infer<typeof EstimatedStorySnapshotSchema>
export type SessionSnapshotData = z.infer<typeof SessionSnapshotSchema>
export type CreateSessionResultData = z.infer<typeof CreateSessionResultSchema>
export type JoinSessionResultData = z.infer<typeof JoinSessionResultSchema>
export type SessionSnapshotAckData = z.infer<typeof SessionSnapshotAckSchema>
