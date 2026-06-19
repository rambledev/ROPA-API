import { Elysia, t } from "elysia"
import { requireCIO } from "@/middleware/rbac"
import {
  getDashboardStats,
  getPendingApprovals,
  getAllRopaForCio,
  getRopaDetailForCio,
  reviewRopa,
} from "./cio.service"

export const cioRoutes = new Elysia({ prefix: "/cio" })
  .use(requireCIO())

  // ── GET /cio/dashboard — สรุปยอดสำหรับ dashboard ──────
  .get("/dashboard", async ({ set }) => {
    try {
      const data = await getDashboardStats()
      return { success: true, data }
    } catch (err) {
      set.status = 400
      return { success: false, message: err instanceof Error ? err.message : "Error" }
    }
  }, { detail: { summary: "สรุปยอด Dashboard สำหรับ CIO", tags: ["CIO"] } })

  // ── GET /cio/ropa/pending — รายการรออนุมัติ ───────────
  .get("/ropa/pending", async ({ set }) => {
    try {
      const data = await getPendingApprovals()
      return { success: true, data }
    } catch (err) {
      set.status = 400
      return { success: false, message: err instanceof Error ? err.message : "Error" }
    }
  }, { detail: { summary: "รายการ ROPA รออนุมัติ", tags: ["CIO"] } })

  // ── GET /cio/ropa — รายการ ROPA ทั้งหมด (filter ได้) ──
  .get("/ropa", async ({ query, set }) => {
    try {
      const data = await getAllRopaForCio(query.status)
      return { success: true, data }
    } catch (err) {
      set.status = 400
      return { success: false, message: err instanceof Error ? err.message : "Error" }
    }
  }, {
    query: t.Object({ status: t.Optional(t.String()) }),
    detail: { summary: "รายการ ROPA ทั้งหมด (ทุกหน่วยงาน)", tags: ["CIO"] }
  })

  // ── GET /cio/ropa/:id — รายละเอียด ROPA ───────────────
  .get("/ropa/:id", async ({ params, set }) => {
    try {
      const data = await getRopaDetailForCio(params.id)
      return { success: true, data }
    } catch (err) {
      set.status = 404
      return { success: false, message: err instanceof Error ? err.message : "Error" }
    }
  }, { detail: { summary: "รายละเอียด ROPA สำหรับ CIO", tags: ["CIO"] } })

  // ── POST /cio/ropa/:id/review — อนุมัติ/ไม่อนุมัติ ────
  .post("/ropa/:id/review", async ({ user, params, body, headers, set }) => {
    try {
      const ipAddress = headers["x-forwarded-for"] ?? "unknown"
      const data = await reviewRopa(params.id, user.id, body.decision, body.comment, ipAddress)
      return { success: true, data }
    } catch (err) {
      set.status = 400
      return { success: false, message: err instanceof Error ? err.message : "Error" }
    }
  }, {
    body: t.Object({
      decision: t.Union([t.Literal("approved"), t.Literal("rejected")]),
      comment: t.Optional(t.String()),
    }),
    detail: { summary: "อนุมัติ/ไม่อนุมัติ ROPA", tags: ["CIO"] }
  })
