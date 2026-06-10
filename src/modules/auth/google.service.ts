import { db } from "@/db"
import { users, departments } from "@/db/schema"
import { eq } from "drizzle-orm"
import { signAccessToken, signRefreshToken } from "@/middleware/auth"
import { hashPassword } from "@/utils/hash"
import * as crypto from "crypto"

export const googleAuthService = async (data: {
  email: string
  name: string
  image?: string
  googleId: string
  isAdmin: boolean
}) => {
  const { email, name, isAdmin } = data

  let user = await db.query.users.findFirst({
    where: eq(users.email, email.toLowerCase()),
  })

  if (!user) {
    let dept = await db.query.departments.findFirst({
      where: eq(departments.code, "PRESIDENT"),
    })
    if (!dept) {
      const [created] = await db.insert(departments).values({
        name: "สำนักงานอธิการบดี", code: "PRESIDENT", isActive: true,
      }).returning()
      dept = created!
    }

    const nameParts = name.split(" ")
    const [inserted] = await db.insert(users).values({
      email:        email.toLowerCase(),
      firstName:    nameParts[0] ?? name,
      lastName:     nameParts.slice(1).join(" ") || "-",
      passwordHash: await hashPassword(crypto.randomBytes(32).toString("hex")),
      role:         isAdmin ? "admin" : "user",
      departmentId: dept.id,
      isActive:     true,
    }).returning()
    user = inserted!
  }

  if (isAdmin && user.role !== "admin") {
    await db.update(users).set({ role: "admin" }).where(eq(users.id, user.id))
    user = { ...user, role: "admin" as typeof user.role }
  }

  const accessToken  = await signAccessToken({ userId: user.id, role: user.role as never, departmentId: user.departmentId })
  const refreshToken = await signRefreshToken({ userId: user.id })

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, email: user.email, role: user.role },
  }
}
