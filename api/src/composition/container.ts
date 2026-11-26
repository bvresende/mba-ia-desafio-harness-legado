import { attachmentRepository } from '../repositories/attachment-repository'
import { healthRepository } from '../repositories/health-repository'
import { replyRepository } from '../repositories/reply-repository'
import { statsRepository } from '../repositories/stats-repository'
import { ticketRepository } from '../repositories/ticket-repository'
import { triageRepository } from '../repositories/triage-repository'
import { userRepository } from '../repositories/user-repository'
import { AttachmentService } from '../services/attachment-service'
import { AuthService } from '../services/auth-service'
import { HealthService } from '../services/health-service'
import { StatsService } from '../services/stats-service'
import { TicketService } from '../services/ticket-service'
import { TriageService } from '../services/triage-service'

export interface AppServices {
  authService: AuthService
  ticketService: TicketService
  attachmentService: AttachmentService
  healthService: HealthService
  statsService: StatsService
  triageService: TriageService
}

export function createServices(): AppServices {
  const authService = new AuthService(userRepository)
  const ticketService = new TicketService(ticketRepository, replyRepository, userRepository)
  const attachmentService = new AttachmentService(attachmentRepository, ticketService)
  const healthService = new HealthService(healthRepository)
  const statsService = new StatsService(statsRepository)
  const triageService = new TriageService(triageRepository)

  return {
    authService,
    ticketService,
    attachmentService,
    healthService,
    statsService,
    triageService,
  }
}
