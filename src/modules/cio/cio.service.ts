import { db } from "@/db"
import { ropaActivities, ropaSections, approvals, departments, users, auditLogs } from "@/db/schema"
import { eq, and, sql, desc, gte } from "drizzle-orm"

// ── Dashboard Stats ─────────────────────────────────────
export const getDashboardStats = async () => {
  // นับ ROPA ตามสถานะ
  const statusCounts = await db
    .select({
      status: ropaActivities.status,
      count: sql<number>`count(*)::int`,
    })
    .from(ropaActivities)
    .groupBy(ropaActivities.status)

  const statusMap: Record<string, number> = { draft: 0, submitted: 0, approved: 0, rejected: 0, revision: 0 }
  statusCounts.forEach(s => { statusMap[s.status] = s.count })

  const total = Object.values(statusMap).reduce((a, b) => a + b, 0)

  // นับตามหน่วยงาน (top 10)
  const byDepartment = await db
    .select({
      departmentId: ropaActivities.departmentId,
      departmentName: departments.name,
      count: sql<number>`count(*)::int`,
    })
    .from(ropaActivities)
    .leftJoin(departments, eq(ropaActivities.departmentId, departments.id))
    .groupBy(ropaActivities.departmentId, departments.name)
    .orderBy(desc(sql`count(*)`))
    .limit(10)

  // นับตามระดับความเสี่ยง (จาก section 12)
  const riskSections = await db
    .select({ data: ropaSections.data })
    .from(ropaSections)
    .where(eq(ropaSections.sectionNumber, 12))

  const riskCounts: Record<string, number> = { low: 0, medium: 0, high: 0, very_high: 0, unassessed: 0 }
  riskSections.forEach(s => {
    const d = s.data as Record<string, unknown>
    const level = d.riskLevel as string | undefined
    if (level && riskCounts[level] !== undefined) {
      riskCounts[level]++
    }
  })
  riskCounts.unassessed = total - riskSections.length

  // นับ DPIA ที่ต้องทำ
  const dpiaRequired = riskSections.filter(s => {
    const d = s.data as Record<string, unknown>
    return d.requiresDpia === true
  }).length

  // แนวโน้มรายเดือน (6 เดือนล่าสุด)
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

  const monthlyTrend = await db
    .select({
      month: sql<string>`to_char(${ropaActivities.createdAt}, 'YYYY-MM')`,
      count: sql<number>`count(*)::int`,
    })
    .from(ropaActivities)
    .where(gte(ropaActivities.createdAt, sixMonthsAgo))
    .groupBy(sql`to_char(${ropaActivities.createdAt}, 'YYYY-MM')`)
    .orderBy(sql`to_char(${ropaActivities.createdAt}, 'YYYY-MM')`)

  return {
    total,
    statusCounts: statusMap,
    byDepartment,
    riskCounts,
    dpiaRequired,
    monthlyTrend,
  }
}

// ── รายการ ROPA ที่รออนุมัติ (submitted) — สำหรับตาราง ──
export const getPendingApprovals = async () => {
  const items = await db.query.ropaActivities.findMany({
    where: eq(ropaActivities.status, "submitted"),
    with: {
      department: true,
      owner: { columns: { id: true, firstName: true, lastName: true, email: true } },
    },
    orderBy: [desc(ropaActivities.submittedAt)],
  })
  return items
}

// ── รายการ ROPA ทั้งหมด (สำหรับ CIO ดูทุกสถานะ) ─────────
export const getAllRopaForCio = async (statusFilter?: string) => {
  const items = await db.query.ropaActivities.findMany({
    where: statusFilter ? eq(ropaActivities.status, statusFilter) : undefined,
    with: {
      department: true,
      owner: { columns: { id: true, firstName: true, lastName: true, email: true } },
    },
    orderBy: [desc(ropaActivities.createdAt)],
  })
  return items
}

// ── รายละเอียด ROPA สำหรับ CIO (ดูได้ทุกหน่วยงาน) ───────
export const getRopaDetailForCio = async (id: string) => {
  const activity = await db.query.ropaActivities.findFirst({
    where: eq(ropaActivities.id, id),
    with: {
      department: true,
      owner: { columns: { id: true, firstName: true, lastName: true, email: true } },
      sections: true,
      approvals: { with: { approver: { columns: { firstName: true, lastName: true, email: true } } } },
    },
  })
  if (!activity) throw new Error("ROPA not found")
  return activity
}

// ── อนุมัติ / ไม่อนุมัติ ─────────────────────────────────
export const reviewRopa = async (
  activityId: string,
  cioUserId: string,
  decision: "approved" | "rejected",
  comment: string | undefined,
  ipAddress: string
) => {
  const activity = await db.query.ropaActivities.findFirst({
    where: eq(ropaActivities.id, activityId),
  })
  if (!activity) throw new Error("ROPA not found")
  if (activity.status !== "submitted") {
    throw new Error("เฉพาะ ROPA ที่สถานะ 'รออนุมัติ' เท่านั้นที่สามารถพิจารณาได้")
  }

  const newStatus = decision === "approved" ? "approved" : "revision"

  await db.update(ropaActivities)
    .set({ status: newStatus, updatedAt: new Date() })
    .where(eq(ropaActivities.id, activityId))

  await db.insert(approvals).values({
    activityId,
    approverId: cioUserId,
    approverRole: "cio",
    status: decision,
    comment: comment ?? null,
    signedAt: new Date(),
  })

  await db.insert(auditLogs).values({
    userId: cioUserId,
    action: decision === "approved" ? "cio_approve_ropa" : "cio_reject_ropa",
    resource: "ropa_activity",
    resourceId: activityId,
    ipAddress,
    metadata: { ropaId: activity.ropaId, comment },
  })

  return { success: true, status: newStatus }
}
