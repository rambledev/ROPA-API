import { Elysia } from "elysia"
import * as jose from "jose"
import { db } from "@/db"
import { users } from "@/db/schema"
import { eq } from "drizzle-orm"
import type { Role } from "@/types/roles"

// jose v6 ใช้ CryptoKey แทน KeyLike
const getPublicKey = async (): Promise<CryptoKey> => {
  const publicKeyPem = process.env.JWT_PUBLIC_KEY
  if (!publicKeyPem) throw new Error("JWT_PUBLIC_KEY is not set")
  const pem = publicKeyPem.replace(/\\\\n/g, "\n").replace(/\\n/g, "\n")
  return jose.importSPKI(pem, "RS256") as Promise<CryptoKey>
}

export const getPrivateKey = async (): Promise<CryptoKey> => {
  const privateKeyPem = process.env.JWT_PRIVATE_KEY
  if (!privateKeyPem) throw new Error("JWT_PRIVATE_KEY is not set")
  const pem = privateKeyPem.replace(/\\\\n/g, "\n").replace(/\\n/g, "\n")
  return jose.importPKCS8(pem, "RS256") as Promise<CryptoKey>
}

// สร้าง access token — อายุ 15 นาที
export const signAccessToken = async (payload: {
  userId: string
  role: Role
  departmentId: string | null
}): Promise<string> => {
  const privateKey = await getPrivateKey()
  return new jose.SignJWT({ ...payload })
    .setProtectedHeader({ alg: "RS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .setIssuer("ropa-api.rmu.ac.th")
    .setAudience("ropa.rmu.ac.th")
    .sign(privateKey)
}

// สร้าง refresh token — อายุ 7 วัน
export const signRefreshToken = async (payload: {
  userId: string
}): Promise<string> => {
  const privateKey = await getPrivateKey()
  return new jose.SignJWT({ ...payload })
    .setProtectedHeader({ alg: "RS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .setIssuer("ropa-api.rmu.ac.th")
    .sign(privateKey)
}

export type JWTPayload = {
  userId: string
  role: Role
  departmentId: string | null
}

// Auth middleware
export const authMiddleware = new Elysia({ name: "auth-middleware" })
  .derive({ as: "global" }, async (ctx) => {
    const authorization = ctx.headers["authorization"]
    if (!authorization?.startsWith("Bearer ")) {
      ctx.set.status = 401
      throw new Error("Authorization header required")
    }

    const token = authorization.slice(7)

    try {
      const publicKey = await getPublicKey()
      const { payload } = await jose.jwtVerify(token, publicKey, {
        issuer:   "ropa-api.rmu.ac.th",
        audience: "ropa.rmu.ac.th",
      })

      const jwtPayload = payload as unknown as JWTPayload

      const user = await db.query.users.findFirst({
        where: eq(users.id, jwtPayload.userId),
        columns: { id: true, role: true, isActive: true, departmentId: true },
      })

      if (!user || !user.isActive) {
        ctx.set.status = 401
        throw new Error("User not found or inactive")
      }

      if (user.role !== jwtPayload.role) {
        ctx.set.status = 401
        throw new Error("Session expired, please login again")
      }

      return {
        user: {
          id:           user.id,
          role:         user.role as Role,
          departmentId: user.departmentId,
        },
      }
    } catch (err) {
      ctx.set.status = 401
      if (err instanceof Error) throw err
      throw new Error("Invalid token")
    }
  })
