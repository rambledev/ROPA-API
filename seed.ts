import { db } from "./src/db"
import { departments, users } from "./src/db/schema"
import { hashPassword } from "./src/utils/hash"
import { eq } from "drizzle-orm"

const seed = async () => {
  console.log("Seeding database...")

  // upsert department
  let dept = await db.query.departments.findFirst({
    where: eq(departments.code, "PRESIDENT")
  })

  if (!dept) {
    const [created] = await db.insert(departments).values({
      name: "สำนักงานอธิการบดี",
      code: "PRESIDENT",
      isActive: true,
    }).returning()
    dept = created
  }
  console.log("Department:", dept.id)

  const password = await hashPassword("Password123!")

  const seedUsers = [
    { email: "cio@rmu.ac.th",   firstName: "CIO",   lastName: "RMU", role: "cio"   },
    { email: "admin@rmu.ac.th", firstName: "Admin", lastName: "RMU", role: "admin" },
    { email: "dpo@rmu.ac.th",   firstName: "DPO",   lastName: "RMU", role: "dpo"   },
    { email: "user@rmu.ac.th",  firstName: "User",  lastName: "RMU", role: "user"  },
  ]

  for (const u of seedUsers) {
    const existing = await db.query.users.findFirst({ where: eq(users.email, u.email) })
    if (existing) {
      await db.update(users)
        .set({ passwordHash: password })
        .where(eq(users.email, u.email))
      console.log(`User updated: ${u.email}`)
    } else {
      await db.insert(users).values({
        ...u,
        passwordHash: password,
        departmentId: dept.id,
        isActive: true,
      })
      console.log(`User created: ${u.email}`)
    }
  }

  console.log("Seed completed!")
  process.exit(0)
}

seed().catch((err) => {
  console.error("Seed failed:", err)
  process.exit(1)
})
