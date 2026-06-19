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

export type ParticipantSnapshotData = z.infer<typeof ParticipantSnapshotSchema>
export type SessionSnapshotData = z.infer<typeof SessionSnapshotSchema>
