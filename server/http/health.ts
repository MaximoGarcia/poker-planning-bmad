import { Router } from 'express'
import { createSuccessAck } from '../../src/shared/contracts/ack.js'

export const healthRouter = Router()

healthRouter.get('/', (_request, response) => {
  response.status(200).json(
    createSuccessAck({
      service: 'adr-buddy',
      status: 'healthy',
    }),
  )
})
