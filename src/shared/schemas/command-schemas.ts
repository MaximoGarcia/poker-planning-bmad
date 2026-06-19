import { z } from 'zod'
import { DEFAULT_DECK_ID, PLANNING_DECK_ID_VALUES } from '../domain/decks.js'

export const RoomCodeSchema = z
  .string()
  .trim()
  .regex(/^[A-Z0-9]{4,12}$/, 'Room code must be 4-12 uppercase letters or digits')

export const DisplayNameSchema = z.string().trim().min(1).max(80)

export const PlanningDeckIdSchema = z.enum(PLANNING_DECK_ID_VALUES)

export const CreateSessionCommandSchema = z
  .object({
    moderatorName: DisplayNameSchema,
    deckId: PlanningDeckIdSchema.default(DEFAULT_DECK_ID),
  })
  .strict()

export const JoinSessionCommandSchema = z
  .object({
    roomCode: RoomCodeSchema,
    displayName: DisplayNameSchema,
  })
  .strict()

export const UpdateStoryCommandSchema = z
  .object({
    roomCode: RoomCodeSchema,
    storyId: z.string().trim().min(1).max(120),
    title: z.string().trim().min(1).max(240),
  })
  .strict()

export const SubmitVoteCommandSchema = z
  .object({
    roomCode: RoomCodeSchema,
    value: z.string().trim().min(1).max(40),
  })
  .strict()

export type CreateSessionCommand = z.infer<typeof CreateSessionCommandSchema>
export type JoinSessionCommand = z.infer<typeof JoinSessionCommandSchema>
export type UpdateStoryCommand = z.infer<typeof UpdateStoryCommandSchema>
export type SubmitVoteCommand = z.infer<typeof SubmitVoteCommandSchema>
