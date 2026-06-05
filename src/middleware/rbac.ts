import { Elysia } from "elysia"
import { ROLE_HIERARCHY, type Role } from "@/types/roles"
import { authMiddleware } from "./auth"

export const requireRole = (minRole: Role) =>
  new Elysia({ name: `rbac-${minRole}` })
    .use(authMiddleware)
    .derive({ as: "global" }, (ctx) => {
      const user = (ctx as typeof ctx & { user?: { id: string; role: Role; departmentId: string | null } }).user

      if (!user) {
        ctx.set.status = 401
        throw new Error("Unauthorized")
      }

      const userLevel = ROLE_HIERARCHY[user.role as Role]
      const minLevel  = ROLE_HIERARCHY[minRole]

      if (userLevel < minLevel) {
        ctx.set.status = 403
        throw new Error(`Access denied. Required: ${minRole}, yours: ${user.role}`)
      }

      return {}
    })

export const requireUser  = () => requireRole("user")
export const requireDPO   = () => requireRole("dpo")
export const requireAdmin = () => requireRole("admin")
export const requireCIO   = () => requireRole("cio")
