import { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../../config/env'
import { AuthUser, Role } from '../../domain/auth'
import { AppError } from '../../domain/errors'

const ROLES: Role[] = ['customer', 'agent', 'admin']

function isRole(value: unknown): value is Role {
  return typeof value === 'string' && ROLES.includes(value as Role)
}

export function signToken(user: { id: string; role: string }) {
  return jwt.sign({ sub: user.id, role: user.role }, env.JWT_SECRET, { expiresIn: '8h' })
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'unauthorized', message: 'Token ausente' })
  }
  try {
    const payload = jwt.verify(header.slice(7), env.JWT_SECRET)
    if (
      typeof payload !== 'object' ||
      payload === null ||
      typeof payload.sub !== 'string' ||
      !('role' in payload) ||
      !isRole(payload.role)
    ) {
      return res.status(401).json({ error: 'unauthorized', message: 'Token inválido' })
    }
    req.user = { id: payload.sub, role: payload.role }
    next()
  } catch {
    return res.status(401).json({ error: 'unauthorized', message: 'Token inválido' })
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user
    if (!user || !roles.includes(user.role)) {
      return res.status(403).json({ error: 'forbidden', message: 'Sem permissão' })
    }
    next()
  }
}

export function requireUser(req: Request): AuthUser {
  if (!req.user) {
    throw new AppError(401, 'unauthorized', 'Token ausente')
  }
  return req.user
}
