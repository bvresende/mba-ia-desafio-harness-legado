import cors from 'cors'
import express from 'express'
import { getCorsOrigins } from '../config/env'
import { AttachmentService } from '../services/attachment-service'
import { AuthService } from '../services/auth-service'
import { HealthService } from '../services/health-service'
import { StatsService } from '../services/stats-service'
import { TicketService } from '../services/ticket-service'
import { errorHandler, notFoundHandler } from './errors'
import { createAttachmentRoutes } from './routes/attachments'
import { createAuthRoutes } from './routes/auth'
import { createHealthRoutes } from './routes/health'
import { createStatsRoutes } from './routes/stats'
import { createTicketRoutes } from './routes/tickets'

export interface AppDeps {
  authService: AuthService
  ticketService: TicketService
  attachmentService: AttachmentService
  healthService: HealthService
  statsService: StatsService
}

export function createApp(deps: AppDeps) {
  const app = express()

  app.use(cors({ origin: getCorsOrigins() }))
  app.use(express.json())

  app.use('/api/health', createHealthRoutes(deps.healthService))
  app.use('/api/auth', createAuthRoutes(deps.authService))
  app.use('/api/tickets', createTicketRoutes(deps.ticketService, deps.attachmentService))
  app.use('/api/attachments', createAttachmentRoutes(deps.attachmentService))
  app.use('/api/stats', createStatsRoutes(deps.statsService))

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
