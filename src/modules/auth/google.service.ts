import { db } from "@/db"
import { users, departments } from "@/db/schema"
import { eq } from "drizzle-orm"
import { signAccessToken, signRefreshToken } from "@/middleware/auth"
import { hashPassword } from "@/utils/hash"
import * as crypto from "crypto"

const CIO_EMAILS = ["weerapon.pa@rmu.ac.th", "cc.claude3@rmu.ac.th"]

export const googleAuthService = async (data: {
  email: string
  name: string
  image?: string
  googleId: string
  isAdmin: boolean
}) => {
  const { email, name, isAdmin } = data
  const normalizedEmail = email.toLowerCase()
  const isCio = CIO_EMAILS.includes(normalizedEmail)

  let user = await db.query.users.findFirst({
    where: eq(users.email, normalizedEmail),
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
      email:        normalizedEmail,
      firstName:    nameParts[0] ?? name,
      lastName:     nameParts.slice(1).join(" ") || "-",
      passwordHash: await hashPassword(crypto.randomBytes(32).toString("hex")),
      role:         isCio ? "cio" : (isAdmin ? "admin" : "user"),
      departmentId: dept.id,
      isActive:     true,
    }).returning()
    user = inserted!
  }

  // บังคับ role cio สำหรับอีเมลที่กำหนด (override เสมอ)
  if (isCio && user.role !== "cio") {
    await db.update(users).set({ role: "cio" }).where(eq(users.id, user.id))
    user = { ...user, role: "cio" as typeof user.role }
  } else if (!isCio && isAdmin && user.role !== "admin" && user.role !== "cio") {
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
