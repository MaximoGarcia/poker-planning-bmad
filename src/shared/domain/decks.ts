export const PLANNING_DECK_ID_VALUES = ['fibonacci', 'tshirt'] as const

export type PlanningDeckId = (typeof PLANNING_DECK_ID_VALUES)[number]

export interface PlanningDeck {
  id: PlanningDeckId
  label: string
  values: readonly string[]
}

export const PLANNING_DECKS = {
  fibonacci: {
    id: 'fibonacci',
    label: 'Fibonacci',
    values: ['1', '2', '3', '5', '8', '13', '21', 'Coffee'],
  },
  tshirt: {
    id: 'tshirt',
    label: 'T-shirt',
    values: ['XS', 'S', 'M', 'L', 'XL'],
  },
} as const satisfies Record<PlanningDeckId, PlanningDeck>

export const DEFAULT_DECK_ID: PlanningDeckId = 'fibonacci'
