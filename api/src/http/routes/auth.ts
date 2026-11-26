import { Router } from 'express'
import { AuthService } from '../../services/auth-service'
import { asyncHandler } from '../errors'
import { requireAuth, requireUser, signToken } from '../middlewares/auth'

export function createAuthRoutes(authService: AuthService) {
  const router = Router()

  router.post(
    '/register',
    asyncHandler(async (req, res) => {
      const user = await authService.register(req.body)
      res.status(201).json(user)
    }),
  )

  router.post(
    '/login',
    asyncHandler(async (req, res) => {
      const user = await authService.login(req.body)
      res.json({ token: signToken(user), user })
    }),
  )

  router.get(
    '/me',
    requireAuth,
    asyncHandler(async (req, res) => {
      const user = await authService.getMe(requireUser(req).id)
      res.json(user)
    }),
  )

  return router
}
