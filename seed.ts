import { db } from "./src/db"
import { departments, users } from "./src/db/schema"
import { hashPassword } from "./src/utils/hash"

// สร้าง seed data สำหรับทดสอบ
const seed = async () => {
  console.log("Seeding database...")

  // สร้าง department
  const [dept] = await db.insert(departments).values({
    name:     "สำนักงานอธิการบดี",
    code:     "PRESIDENT",
    isActive: true,
  }).returning()

  console.log("Department created:", dept.id)

  // สร้าง users ทั้ง 4 roles
  const password = await hashPassword("Password123!")

  const seedUsers = [
    { email: "cio@rmu.ac.th",   firstName: "CIO",   lastName: "RMU",   role: "cio"   },
    { email: "admin@rmu.ac.th", firstName: "Admin", lastName: "RMU",   role: "admin" },
    { email: "dpo@rmu.ac.th",   firstName: "DPO",   lastName: "RMU",   role: "dpo"   },
    { email: "user@rmu.ac.th",  firstName: "User",  lastName: "RMU",   role: "user"  },
  ]

  for (const u of seedUsers) {
    const [created] = await db.insert(users).values({
      ...u,
      passwordHash: password,
      departmentId: dept.id,
      isActive:     true,
    }).returning()
    console.log(`User created: ${created.email} (${created.role})`)
  }

  console.log("Seed completed!")
  process.exit(0)
}

seed().catch((err) => {
  console.error("Seed failed:", err)
  process.exit(1)
})
