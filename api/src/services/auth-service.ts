import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { PublicUser, User } from '../domain/auth'
import { AppError } from '../domain/errors'
import { UserRepository } from '../repositories/user-repository'

export class EmailTakenError extends AppError {
  constructor(message = 'E-mail já cadastrado') {
    super(409, 'email_taken', message)
  }
}

export class InvalidCredentialsError extends AppError {
  constructor(message = 'E-mail ou senha inválidos') {
    super(401, 'invalid_credentials', message)
  }
}

const registerSchema = z.object({
  name: z.string().trim().min(1, 'Nome é obrigatório'),
  email: z.string().trim().toLowerCase().email('E-mail inválido'),
  password: z.string().min(8, 'A senha precisa ter pelo menos 8 caracteres'),
})

const loginSchema = z.object({
  email: z.string().trim().toLowerCase(),
  password: z.string(),
})

function serializeUser(user: User): PublicUser {
  return { id: user.id, name: user.name, email: user.email, role: user.role }
}

export class AuthService {
  constructor(private users: UserRepository) {}

  async register(input: unknown): Promise<PublicUser> {
    const parsed = registerSchema.safeParse(input)
    if (!parsed.success) {
      throw new AppError(422, 'validation_error', parsed.error.issues[0].message)
    }
    const existing = await this.users.findByEmail(parsed.data.email)
    if (existing) throw new EmailTakenError('E-mail já cadastrado')
    const passwordHash = await bcrypt.hash(parsed.data.password, 10)
    const user = await this.users.create({
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
      role: 'customer',
    })
    return serializeUser(user)
  }

  async login(input: unknown): Promise<PublicUser> {
    const parsed = loginSchema.safeParse(input)
    if (!parsed.success) {
      throw new AppError(422, 'validation_error', parsed.error.issues[0].message)
    }
    const user = await this.users.findByEmail(parsed.data.email)
    if (!user) throw new InvalidCredentialsError('E-mail ou senha inválidos')
    const ok = await bcrypt.compare(parsed.data.password, user.passwordHash)
    if (!ok) throw new InvalidCredentialsError('E-mail ou senha inválidos')
    return serializeUser(user)
  }

  async getMe(userId: string): Promise<PublicUser> {
    const user = await this.users.findById(userId)
    if (!user) {
      throw new AppError(401, 'unauthorized', 'Usuário não encontrado')
    }
    return serializeUser(user)
  }
}
