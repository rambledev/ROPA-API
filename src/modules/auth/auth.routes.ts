import { Elysia, t } from "elysia"
import { authMiddleware } from "@/middleware/auth"
import { loginService, refreshTokenService, logoutService } from "./auth.service"
import { googleAuthService } from "./google.service"

export const authRoutes = new Elysia({ prefix: "/auth" })
  .post("/login",
    async ({ body, headers, set }) => {
      try {
        const ipAddress = headers["x-forwarded-for"] ?? "unknown"
        const userAgent = headers["user-agent"] ?? "unknown"
        const result = await loginService(body.email, body.password, ipAddress, userAgent)
        set.status = 200
        return { success: true, data: result }
      } catch (err) {
        set.status = 401
        return { success: false, message: err instanceof Error ? err.message : "Login failed" }
      }
    },
    { body: t.Object({ email: t.String({ format: "email" }), password: t.String({ minLength: 8 }) }) }
  )
  .post("/refresh",
    async ({ body, headers, set }) => {
      try {
        const ipAddress = headers["x-forwarded-for"] ?? "unknown"
        const userAgent = headers["user-agent"] ?? "unknown"
        const result = await refreshTokenService(body.refreshToken, ipAddress, userAgent)
        return { success: true, data: result }
      } catch (err) {
        set.status = 401
        return { success: false, message: err instanceof Error ? err.message : "Refresh failed" }
      }
    },
    { body: t.Object({ refreshToken: t.String() }) }
  )
  .post("/google",
    async ({ body, set }) => {
      try {
        const { email, name, image, googleId, isAdmin } = body as {
          email: string; name: string; image?: string; googleId: string; isAdmin: boolean
        }
        const data = await googleAuthService({ email, name, image, googleId, isAdmin })
        return { success: true, data }
      } catch (err) {
        set.status = 500
        return { success: false, message: err instanceof Error ? err.message : "Error" }
      }
    }
  )
  .use(authMiddleware)
  .post("/logout",
    async ({ body, user, headers, set }) => {
      try {
        const ipAddress = headers["x-forwarded-for"] ?? "unknown"
        const userAgent = headers["user-agent"] ?? "unknown"
        await logoutService(body.refreshToken, user.id, ipAddress, userAgent)
        return { success: true, message: "Logged out successfully" }
      } catch (err) {
        set.status = 400
        return { success: false, message: err instanceof Error ? err.message : "Logout failed" }
      }
    },
    { body: t.Object({ refreshToken: t.String() }) }
  )
