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
    updatedAt: z.string().datetime(),
  })
  .strict()

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
export type SessionSnapshotData = z.infer<typeof SessionSnapshotSchema>
export type CreateSessionResultData = z.infer<typeof CreateSessionResultSchema>
export type JoinSessionResultData = z.infer<typeof JoinSessionResultSchema>
export type SessionSnapshotAckData = z.infer<typeof SessionSnapshotAckSchema>
