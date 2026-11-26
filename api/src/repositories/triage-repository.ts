import { Ticket, TicketCategory, TicketPriority } from '../domain/ticket'
import { prisma } from './prisma'

export interface TriageRepository {
  findPending(limit: number): Promise<Ticket[]>
  markDone(id: string, category: TicketCategory, priority: TicketPriority): Promise<void>
  markFailed(id: string): Promise<void>
  disconnect(): Promise<void>
}

class PrismaTriageRepository implements TriageRepository {
  findPending(limit: number) {
    return prisma.ticket.findMany({
      where: { triageStatus: 'pending' },
      orderBy: { createdAt: 'asc' },
      take: limit,
    })
  }

  async markDone(id: string, category: TicketCategory, priority: TicketPriority) {
    await prisma.ticket.update({
      where: { id },
      data: { category, priority, triageStatus: 'done' },
    })
  }

  async markFailed(id: string) {
    await prisma.ticket.update({
      where: { id },
      data: { triageStatus: 'failed' },
    })
  }

  disconnect() {
    return prisma.$disconnect()
  }
}

export const triageRepository: TriageRepository = new PrismaTriageRepository()
