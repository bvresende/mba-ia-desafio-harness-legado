import { env } from './config/env'
import { app } from './http/app'

const server = app.listen(env.PORT, () => {
  console.log(`API rodando em http://localhost:${env.PORT}`)
})

function shutdown() {
  server.close(() => process.exit(0))
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
