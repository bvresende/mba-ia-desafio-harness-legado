import { z } from 'zod'

const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    DATABASE_URL: z.string().min(1).optional(),
    PORT: z.coerce.number().int().positive().default(4000),
    CORS_ORIGIN: z.string().min(1).default('http://localhost:5173'),
    UPLOAD_DIR: z.string().min(1).default('/tmp/balcao/uploads'),
    TRIAGE_INTERVAL_MS: z.coerce.number().int().positive().default(2000),
    AI_MODE: z.enum(['fake', 'openai']).default('fake'),
    OPENAI_API_KEY: z.string().default(''),
    JWT_SECRET: z.string().min(1).default('dev-secret'),
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV !== 'test' && !data.DATABASE_URL) {
      ctx.addIssue({
        code: 'custom',
        path: ['DATABASE_URL'],
        message: 'DATABASE_URL é obrigatória quando NODE_ENV !== "test"',
      })
    }
  })

const parsed = schema.parse(process.env)

export const env = {
  ...parsed,
  DATABASE_URL: parsed.DATABASE_URL ?? '',
}

export function getCorsOrigins(): string[] {
  return env.CORS_ORIGIN.split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}
