import { prisma } from './prisma'

export interface HealthRepository {
  checkDatabase(): Promise<void>
}

class PrismaHealthRepository implements HealthRepository {
  async checkDatabase() {
    await prisma.$queryRaw`SELECT 1`
  }
}

export const healthRepository: HealthRepository = new PrismaHealthRepository()
