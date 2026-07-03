import { z } from 'zod'
import { DEFAULT_DECK_ID, PLANNING_DECK_ID_VALUES } from '../domain/decks.js'

export const DISPLAY_NAME_MAX_LENGTH = 80

export const RoomCodeSchema = z
  .string()
  .trim()
  .regex(/^[A-Z0-9]{4,12}$/, 'Room code must be 4-12 uppercase letters or digits')

export const DisplayNameSchema = z.string().trim().min(1).max(DISPLAY_NAME_MAX_LENGTH)

export const PlanningDeckIdSchema = z.enum(PLANNING_DECK_ID_VALUES)
const CapabilityTokenSchema = z.string().trim().min(32).max(256).regex(/^[A-Za-z0-9_-]+$/)

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
    moderatorToken: CapabilityTokenSchema,
    storyId: z.string().trim().min(1).max(120),
    title: z.string().trim().min(1).max(240),
  })
  .strict()

export const SelectDeckCommandSchema = z
  .object({
    roomCode: RoomCodeSchema,
    moderatorToken: CapabilityTokenSchema,
    deckId: PlanningDeckIdSchema,
  })
  .strict()

export const StartRoundCommandSchema = z
  .object({
    roomCode: RoomCodeSchema,
    moderatorToken: CapabilityTokenSchema,
  })
  .strict()

export const SubmitVoteCommandSchema = z
  .object({
    roomCode: RoomCodeSchema,
    participantId: z.string().trim().min(1).max(120),
    participantToken: CapabilityTokenSchema,
    value: z.string().trim().min(1).max(40),
  })
  .strict()

export type CreateSessionCommand = z.infer<typeof CreateSessionCommandSchema>
export type JoinSessionCommand = z.infer<typeof JoinSessionCommandSchema>
export type UpdateStoryCommand = z.infer<typeof UpdateStoryCommandSchema>
export type SelectDeckCommand = z.infer<typeof SelectDeckCommandSchema>
export type StartRoundCommand = z.infer<typeof StartRoundCommandSchema>
export type SubmitVoteCommand = z.infer<typeof SubmitVoteCommandSchema>
