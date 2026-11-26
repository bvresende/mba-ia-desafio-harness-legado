import type { AuthUser } from '../domain/auth'

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthUser
  }
}
