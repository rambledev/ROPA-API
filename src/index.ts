import { Elysia } from "elysia"
import { cors } from "@elysiajs/cors"
import { authRoutes } from "@/modules/auth"

const requiredEnvs = ["DATABASE_URL", "CORS_ORIGIN", "PORT", "JWT_PRIVATE_KEY", "JWT_PUBLIC_KEY", "ENCRYPTION_KEY"] as const
for (const key of requiredEnvs) {
  if (!process.env[key]) throw new Error(`Missing required env: ${key}`)
}

const CORS_ORIGIN = process.env.CORS_ORIGIN as string

const app = new Elysia()
  .use(cors({
    origin:         CORS_ORIGIN,
    methods:        ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials:    true,
  }))
  .get("/health", () => ({
    status:    "ok",
    timestamp: new Date().toISOString(),
    env:       process.env.NODE_ENV,
  }))
  .use(authRoutes)
  .listen(process.env.PORT ?? 3001)

console.log(`ROPA API running at http://localhost:${app.server?.port}`)
console.log(`CORS origin: ${CORS_ORIGIN}`)
