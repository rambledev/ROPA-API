import { Elysia, t } from "elysia"
import { requireUser, requireAdmin } from "@/middleware/rbac"
import { createRopa, getMyRopa, getRopaById, saveSection, submitRopa, deleteRopa, updateRopaInfo } from "./ropa.service"
import { generateRopaPDF, buildRopaHTML } from "./pdf.service"
import type { SectionNumber } from "./ropa.types"

export const ropaRoutes = new Elysia({ prefix: "/ropa" })

  // ── GET /ropa — ดู ROPA ทั้งหมดของตัวเอง ──────────────
  .use(requireUser())
  .get("/", async ({ user, set }) => {
    try {
      const data = await getMyRopa(user.id, user.departmentId ?? "")
      return { success: true, data }
    } catch (err) {
      set.status = 400
      return { success: false, message: err instanceof Error ? err.message : "Error" }
    }
  }, {
    detail: { summary: "ดู ROPA ทั้งหมดของตัวเอง", tags: ["ROPA"] }
  })

  // ── POST /ropa — สร้าง ROPA ใหม่ ──────────────────────
  .post("/", async ({ user, body, headers, set }) => {
    try {
      const ipAddress = headers["x-forwarded-for"] ?? "unknown"
      const data = await createRopa(
        user.id,
        user.departmentId ?? "",
        body,
        ipAddress
      )
      set.status = 201
      return { success: true, data }
    } catch (err) {
      set.status = 400
      return { success: false, message: err instanceof Error ? err.message : "Error" }
    }
  }, {
    body: t.Object({
      title:         t.String({ minLength: 10 }),
      ownerPosition: t.Optional(t.String()),
      ownerPhone:    t.Optional(t.String()),
      ownerEmail:    t.Optional(t.String({ format: "email" })),
    }),
    detail: { summary: "สร้าง ROPA ใหม่", tags: ["ROPA"] }
  })

  // ── GET /ropa/:id — ดู ROPA รายละเอียด ────────────────
  .get("/:id", async ({ user, params, set }) => {
    try {
      const data = await getRopaById(params.id, user.id)
      return { success: true, data }
    } catch (err) {
      set.status = 404
      return { success: false, message: err instanceof Error ? err.message : "Error" }
    }
  }, {
    detail: { summary: "ดู ROPA รายละเอียด", tags: ["ROPA"] }
  })

  // ── PUT /ropa/:id/sections/:sectionNumber — บันทึก section ──
  .put("/:id/sections/:sectionNumber", async ({ user, params, body, headers, set }) => {
    try {
      const ipAddress = headers["x-forwarded-for"] ?? "unknown"
      const sectionNumber = parseInt(params.sectionNumber) as SectionNumber

      if (sectionNumber < 1 || sectionNumber > 13) {
        set.status = 400
        return { success: false, message: "Section number must be 2-12" }
      }

      const data = await saveSection(
        params.id,
        sectionNumber,
        body,
        user.id,
        ipAddress
      )
      return { success: true, data }
    } catch (err) {
      set.status = 400
      return { success: false, message: err instanceof Error ? err.message : "Error" }
    }
  }, {
    body: t.Record(t.String(), t.Unknown()),
    detail: { summary: "บันทึกข้อมูลแต่ละส่วน (2-12)", tags: ["ROPA"] }
  })

  // ── PATCH /ropa/:id — แก้ไขข้อมูลทั่วไป ────────────────
  .patch("/:id", async ({ user, params, body, headers, set }) => {
    try {
      const ipAddress = headers["x-forwarded-for"] ?? "unknown"
      const data = await updateRopaInfo(params.id, user.id, body, ipAddress)
      return { success: true, data }
    } catch (err) {
      set.status = 400
      return { success: false, message: err instanceof Error ? err.message : "Error" }
    }
  }, {
    body: t.Object({
      title:         t.Optional(t.String({ minLength: 10 })),
      ownerPosition: t.Optional(t.String()),
      ownerPhone:    t.Optional(t.String()),
      ownerEmail:    t.Optional(t.String({ format: "email" })),
    }),
    detail: { summary: "แก้ไขข้อมูลทั่วไป ROPA", tags: ["ROPA"] }
  })

  // ── DELETE /ropa/:id — ลบ ROPA ─────────────────────────
  .delete("/:id", async ({ user, params, headers, set }) => {
    try {
      const ipAddress = headers["x-forwarded-for"] ?? "unknown"
      const data = await deleteRopa(params.id, user.id, ipAddress)
      return { success: true, data }
    } catch (err) {
      set.status = 400
      return { success: false, message: err instanceof Error ? err.message : "Error" }
    }
  }, { detail: { summary: "ลบ ROPA", tags: ["ROPA"] } })

  // ── GET /ropa/:id/pdf — Export PDF ────────────────────
  .get("/:id/pdf", async ({ user, params, set }) => {
    try {
      const data = await getRopaById(params.id, user.id)
      const html = buildRopaHTML({
        ropaId:    data.ropaId,
        title:     data.title,
        status:    data.status,
        createdAt: data.createdAt.toISOString(),
        sections:  data.sections.map(s => ({
          sectionNumber: s.sectionNumber,
          data:          s.data as Record<string, unknown>,
          updatedAt:     s.updatedAt.toISOString(),
        })),
      })
      const pdf = await generateRopaPDF(html)
      set.headers["Content-Type"] = "application/pdf"
      set.headers["Content-Disposition"] = `attachment; filename="${data.ropaId}.pdf"`
      return pdf
    } catch (err) {
      set.status = 500
      return { success: false, message: err instanceof Error ? err.message : "Error" }
    }
  }, { detail: { summary: "Export PDF", tags: ["ROPA"] } })

  // ── POST /ropa/:id/submit — ส่งขออนุมัติ ──────────────
  .post("/:id/submit", async ({ user, params, headers, set }) => {
    try {
      const ipAddress = headers["x-forwarded-for"] ?? "unknown"
      const data = await submitRopa(params.id, user.id, ipAddress)
      return { success: true, data }
    } catch (err) {
      set.status = 400
      return { success: false, message: err instanceof Error ? err.message : "Error" }
    }
  }, {
    detail: { summary: "ส่ง ROPA เพื่อขออนุมัติ", tags: ["ROPA"] }
  })
