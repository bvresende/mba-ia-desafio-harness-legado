import { AppError } from '../domain/errors'
import { HealthRepository } from '../repositories/health-repository'

export class HealthService {
  constructor(private health: HealthRepository) {}

  async check() {
    try {
      await this.health.checkDatabase()
      return { status: 'ok', db: 'ok' }
    } catch (err) {
      console.log('health: banco fora', err)
      throw new AppError(503, 'db_unavailable', 'Banco de dados não responde')
    }
  }
}
