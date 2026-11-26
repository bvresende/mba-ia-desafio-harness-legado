import { createServices } from './composition/container'
import { env } from './config/env'
import { createApp } from './http/app'

const services = createServices()
const app = createApp(services)

const server = app.listen(env.PORT, () => {
  console.log(`API rodando em http://localhost:${env.PORT}`)
})

function shutdown() {
  server.close(() => process.exit(0))
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
