import { db } from "@/db"
import { ropaActivities, ropaSections, users, departments } from "@/db/schema"
import { eq, desc, count, sql } from "drizzle-orm"

// ── ดู ROPA ทั้งหมด (Admin/CIO) ──────────────────────────
export const getAllRopa = async () => {
  return db.query.ropaActivities.findMany({
    orderBy: desc(ropaActivities.createdAt),
    with: {
      owner:      { columns: { id:true, firstName:true, lastName:true, email:true } },
      department: { columns: { id:true, name:true, code:true } },
      sections:   { columns: { sectionNumber:true, updatedAt:true } },
    },
  })
}

// ── ดู ROPA รายละเอียด (Admin/CIO) ───────────────────────
export const getRopaDetail = async (id: string) => {
  const activity = await db.query.ropaActivities.findFirst({
    where: eq(ropaActivities.id, id),
    with: {
      owner:      { columns: { id:true, firstName:true, lastName:true, email:true } },
      department: { columns: { id:true, name:true, code:true } },
      sections:   true,
      approvals:  { with: { approver: { columns: { id:true, firstName:true, lastName:true } } } },
      dpia:       true,
    },
  })
  if (!activity) throw new Error("ROPA not found")
  return activity
}

// ── สถิติ Dashboard ───────────────────────────────────────
export const getDashboardStats = async () => {
  const total     = await db.$count(ropaActivities)
  const draft     = await db.$count(ropaActivities, eq(ropaActivities.status, "draft"))
  const submitted = await db.$count(ropaActivities, eq(ropaActivities.status, "submitted"))
  const approved  = await db.$count(ropaActivities, eq(ropaActivities.status, "approved"))
  const rejected  = await db.$count(ropaActivities, eq(ropaActivities.status, "rejected"))
  const totalUsers = await db.$count(users)
  const totalDepts = await db.$count(departments)

  // ROPA แยกตามหน่วยงาน
  const byDept = await db
    .select({
      deptName: departments.name,
      deptCode: departments.code,
      total:    count(ropaActivities.id),
    })
    .from(ropaActivities)
    .leftJoin(departments, eq(ropaActivities.departmentId, departments.id))
    .groupBy(departments.name, departments.code)
    .orderBy(desc(count(ropaActivities.id)))

  return { total, draft, submitted, approved, rejected, totalUsers, totalDepts, byDept }
}
