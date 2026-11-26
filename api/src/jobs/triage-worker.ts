import { createServices } from '../composition/container'
import { env } from '../config/env'

const { triageService } = createServices()
const interval = env.TRIAGE_INTERVAL_MS

let stopped = false
let timer: ReturnType<typeof setTimeout> | undefined

async function loop() {
  if (stopped) {
    return
  }
  try {
    await triageService.runOnce()
  } catch (err) {
    console.log('erro no worker', err)
  }
  if (!stopped) {
    timer = setTimeout(loop, interval)
  }
}

async function shutdown() {
  if (stopped) {
    return
  }
  stopped = true
  if (timer !== undefined) {
    clearTimeout(timer)
    timer = undefined
  }
  await triageService.disconnect()
  process.exit(0)
}

process.on('SIGINT', () => {
  void shutdown()
})
process.on('SIGTERM', () => {
  void shutdown()
})

console.log(`worker de triagem rodando a cada ${interval}ms`)
void loop()
