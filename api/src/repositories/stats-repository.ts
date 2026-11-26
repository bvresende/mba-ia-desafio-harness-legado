import { TicketCategory, TicketPriority, TicketStatus } from '../domain/ticket'
import { prisma } from './prisma'

interface TicketCountSummary {
  statusRows: Array<{ status: TicketStatus; count: number }>
  categoryRows: Array<{ category: TicketCategory | null; count: number }>
  priorityRows: Array<{ priority: TicketPriority | null; count: number }>
}

export interface StatsRepository {
  getTicketCounts(): Promise<TicketCountSummary>
}

class PrismaStatsRepository implements StatsRepository {
  async getTicketCounts(): Promise<TicketCountSummary> {
    const [statusRows, categoryRows, priorityRows] = await Promise.all([
      prisma.ticket.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.ticket.groupBy({ by: ['category'], _count: { _all: true } }),
      prisma.ticket.groupBy({ by: ['priority'], _count: { _all: true } }),
    ])

    return {
      statusRows: statusRows.map((row) => ({ status: row.status, count: row._count._all })),
      categoryRows: categoryRows.map((row) => ({ category: row.category, count: row._count._all })),
      priorityRows: priorityRows.map((row) => ({ priority: row.priority, count: row._count._all })),
    }
  }
}

export const statsRepository: StatsRepository = new PrismaStatsRepository()
