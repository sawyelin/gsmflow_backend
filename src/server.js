import { createApp } from './app.js'
import { config } from './config/env.js'

const app = createApp()

app.listen(config.port, () => {
  console.log(`🚀 API running on http://localhost:${config.port}`)
})
