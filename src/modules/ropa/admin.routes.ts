import { Elysia } from "elysia"
import { requireAdmin, requireCIO } from "@/middleware/rbac"
import { getAllRopa, getRopaDetail, getDashboardStats } from "./admin.service"

export const adminRopaRoutes = new Elysia({ prefix: "/admin" })

  .use(requireAdmin())

  // ── GET /admin/dashboard ──────────────────────────────
  .get("/dashboard", async ({ set }) => {
    try {
      const data = await getDashboardStats()
      return { success: true, data }
    } catch (err) {
      set.status = 500
      return { success: false, message: err instanceof Error ? err.message : "Error" }
    }
  }, { detail: { summary: "Dashboard สถิติภาพรวม", tags: ["Admin"] } })

  // ── GET /admin/ropa ───────────────────────────────────
  .get("/ropa", async ({ set }) => {
    try {
      const data = await getAllRopa()
      return { success: true, data }
    } catch (err) {
      set.status = 500
      return { success: false, message: err instanceof Error ? err.message : "Error" }
    }
  }, { detail: { summary: "ดู ROPA ทั้งหมด", tags: ["Admin"] } })

  // ── GET /admin/ropa/:id ───────────────────────────────
  .get("/ropa/:id", async ({ params, set }) => {
    try {
      const data = await getRopaDetail(params.id)
      return { success: true, data }
    } catch (err) {
      set.status = 404
      return { success: false, message: err instanceof Error ? err.message : "Error" }
    }
  }, { detail: { summary: "ดู ROPA รายละเอียด", tags: ["Admin"] } })
