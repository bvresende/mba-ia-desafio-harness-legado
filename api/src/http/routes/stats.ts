import { Router } from 'express'
import { StatsService } from '../../services/stats-service'
import { asyncHandler } from '../errors'
import { requireAuth, requireRole } from '../middlewares/auth'

export function createStatsRoutes(statsService: StatsService) {
  const router = Router()

  router.get(
    '/',
    requireAuth,
    requireRole('admin'),
    asyncHandler(async (_req, res) => {
      const stats = await statsService.getStats()
      res.json(stats)
    }),
  )

  return router
}
