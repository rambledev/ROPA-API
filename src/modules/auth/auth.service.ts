import { db } from "@/db"
import { users, refreshTokens, auditLogs } from "@/db/schema"
import { eq, and, gt } from "drizzle-orm"
import { verifyPassword, hashApiKey } from "@/utils/hash"
import { signAccessToken } from "@/middleware/auth"
import type { Role } from "@/types/roles"
import * as crypto from "crypto"

export const loginService = async (email: string, password: string, ipAddress: string, userAgent: string) => {
  const user = await db.query.users.findFirst({ where: eq(users.email, email.toLowerCase().trim()) })
  if (!user || !user.isActive) {
    await writeAuditLog(null, "user.login.failed", "auth", null, ipAddress, userAgent, "failed")
    throw new Error("Invalid email or password")
  }
  const valid = await verifyPassword(password, user.passwordHash)
  if (!valid) {
    await writeAuditLog(user.id, "user.login.failed", "auth", null, ipAddress, userAgent, "failed")
    throw new Error("Invalid email or password")
  }
  const accessToken = await signAccessToken({ userId: user.id, role: user.role as Role, departmentId: user.departmentId })
  const refreshToken = crypto.randomBytes(64).toString("hex")
  const refreshTokenHash = await hashApiKey(refreshToken)
  await db.insert(refreshTokens).values({ userId: user.id, tokenHash: refreshTokenHash, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), userAgent, ipAddress })
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id))
  await writeAuditLog(user.id, "user.login", "auth", null, ipAddress, userAgent, "success")
  return { accessToken, refreshToken, user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role, departmentId: user.departmentId } }
}

export const refreshTokenService = async (refreshToken: string, ipAddress: string, userAgent: string) => {
  const tokenHash = await hashApiKey(refreshToken)
  const stored = await db.query.refreshTokens.findFirst({ where: and(eq(refreshTokens.tokenHash, tokenHash), gt(refreshTokens.expiresAt, new Date())), with: { user: true } })
  if (!stored || stored.revokedAt) throw new Error("Invalid or expired refresh token")
  if (!stored.user.isActive) throw new Error("User is inactive")
  await db.update(refreshTokens).set({ revokedAt: new Date() }).where(eq(refreshTokens.id, stored.id))
  const newRefreshToken = crypto.randomBytes(64).toString("hex")
  const newRefreshTokenHash = await hashApiKey(newRefreshToken)
  await db.insert(refreshTokens).values({ userId: stored.userId, tokenHash: newRefreshTokenHash, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), userAgent, ipAddress })
  const accessToken = await signAccessToken({ userId: stored.user.id, role: stored.user.role as Role, departmentId: stored.user.departmentId })
  return { accessToken, refreshToken: newRefreshToken }
}

export const logoutService = async (refreshToken: string, userId: string, ipAddress: string, userAgent: string) => {
  const tokenHash = await hashApiKey(refreshToken)
  await db.update(refreshTokens).set({ revokedAt: new Date() }).where(eq(refreshTokens.tokenHash, tokenHash))
  await writeAuditLog(userId, "user.logout", "auth", null, ipAddress, userAgent, "success")
}

const writeAuditLog = async (userId: string | null, action: string, resource: string, resourceId: string | null, ipAddress: string, userAgent: string, status: "success" | "failed") => {
  await db.insert(auditLogs).values({ userId, action, resource, resourceId, ipAddress, userAgent, status })
}
