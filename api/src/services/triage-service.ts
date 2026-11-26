import { classifyTicket } from '../integrations/ai-client'
import { TriageRepository } from '../repositories/triage-repository'

const BATCH_SIZE = 10

export class TriageService {
  constructor(private triage: TriageRepository) {}

  async runOnce() {
    const tickets = await this.triage.findPending(BATCH_SIZE)

    for (const ticket of tickets) {
      try {
        const result = await classifyTicket(ticket)
        await this.triage.markDone(ticket.id, result.category, result.priority)
        console.log(`chamado ${ticket.id} triado: ${result.category}/${result.priority}`)
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        console.log(`falha na triagem do chamado ${ticket.id}: ${message}`)
        await this.triage.markFailed(ticket.id)
      }
    }
  }

  disconnect() {
    return this.triage.disconnect()
  }
}
