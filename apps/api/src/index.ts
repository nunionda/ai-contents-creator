import { Hono } from "hono"
import { cors } from "hono/cors"
import { logger } from "hono/logger"
import { projectRoutes } from "./routes/projects.ts"
import { pipelineRoutes } from "./routes/pipeline.ts"
import { agentRoutes } from "./routes/agents.ts"
import { assetRoutes } from "./routes/assets.ts"
import { screenplayRoutes } from "./routes/screenplay.ts"
import { brainstormRoutes } from "./routes/brainstorm.ts"
import { loglineRoutes } from "./routes/logline.ts"
import { promptGuideRoutes } from "./routes/prompt-guide.ts"
import { errorHandler } from "./middleware/error-handler.ts"

const app = new Hono()

app.use("*", logger())
app.use("*", cors())
app.onError(errorHandler)

app.get("/api/health", (c) => c.json({ status: "ok", service: "marionette-studio-api", version: "0.1.0" }))

app.route("/api/projects", projectRoutes)
app.route("/api/pipeline", pipelineRoutes)
app.route("/api/agents", agentRoutes)
app.route("/api/assets", assetRoutes)
app.route("/api/screenplay", screenplayRoutes)
app.route("/api/brainstorm", brainstormRoutes)
app.route("/api/logline", loglineRoutes)
app.route("/api/prompt-guide", promptGuideRoutes)

export default { port: 3001, fetch: app.fetch, idleTimeout: 255 }
