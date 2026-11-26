import { Router } from 'express'
import { HealthService } from '../../services/health-service'
import { asyncHandler } from '../errors'

export function createHealthRoutes(healthService: HealthService) {
  const router = Router()

  router.get(
    '/',
    asyncHandler(async (_req, res) => {
      const status = await healthService.check()
      res.json(status)
    }),
  )

  return router
}
