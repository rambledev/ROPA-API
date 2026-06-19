import { db } from "@/db"
import { ropaActivities, ropaSections, auditLogs } from "@/db/schema"
import { eq, and, desc } from "drizzle-orm"
import { sectionSchemas, SENSITIVE_SECTION, SENSITIVE_FIELDS, type SectionNumber } from "./ropa.types"

// ── AES-256 encrypt/decrypt (inline เพื่อหลีกเลี่ยง import issue) ──
const ALGORITHM = "AES-GCM"
const IV_LENGTH = 12

const getEncryptionKey = async (): Promise<CryptoKey> => {
  const keyHex = process.env.ENCRYPTION_KEY
  if (!keyHex) throw new Error("ENCRYPTION_KEY is not set")
  const keyBytes = Uint8Array.from(keyHex.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)))
  return crypto.subtle.importKey("raw", keyBytes, { name: ALGORITHM }, false, ["encrypt", "decrypt"])
}

const encrypt = async (plaintext: string): Promise<string> => {
  const key = await getEncryptionKey()
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
  const encoded = new TextEncoder().encode(plaintext)
  const ciphertext = await crypto.subtle.encrypt({ name: ALGORITHM, iv, tagLength: 128 }, key, encoded)
  const ivB64 = btoa(String.fromCharCode(...iv))
  const ctB64 = btoa(String.fromCharCode(...new Uint8Array(ciphertext)))
  return `${ivB64}:${ctB64}`
}

const decrypt = async (encrypted: string): Promise<string> => {
  const key = await getEncryptionKey()
  const [ivB64, ctB64] = encrypted.split(":")
  if (!ivB64 || !ctB64) throw new Error("Invalid encrypted format")
  const iv = Uint8Array.from(atob(ivB64), (c) => c.charCodeAt(0))
  const ciphertext = Uint8Array.from(atob(ctB64), (c) => c.charCodeAt(0))
  const decrypted = await crypto.subtle.decrypt({ name: ALGORITHM, iv, tagLength: 128 }, key, ciphertext)
  return new TextDecoder().decode(decrypted)
}

// ── สร้าง ROPA ID อัตโนมัติ ───────────────────────────────
const generateRopaId = async (): Promise<string> => {
  const year = new Date().getFullYear() + 543
  const count = await db.$count(ropaActivities)
  const seq = String(count + 1).padStart(4, "0")
  return `ROPA-${year}-${seq}`
}

// ── สร้าง ROPA ใหม่ ───────────────────────────────────────
export const createRopa = async (
  userId: string,
  departmentId: string,
  data: { title: string; ownerPosition?: string; ownerPhone?: string; ownerEmail?: string },
  ipAddress: string
) => {
  const ropaId = await generateRopaId()

  const result = await db.insert(ropaActivities).values({
    ropaId,
    departmentId,
    ownerId:       userId,
    title:         data.title,
    ownerPosition: data.ownerPosition,
    ownerPhone:    data.ownerPhone,
    ownerEmail:    data.ownerEmail,
    status:        "draft",
    version:       1,
  }).returning()

  const activity = result[0]
  if (!activity) throw new Error("Failed to create ROPA")

  await db.insert(auditLogs).values({
    userId,
    action:     "ropa.create",
    resource:   "ropa_activities",
    resourceId: activity.id,
    ipAddress,
    status:     "success",
  })

  return activity
}

// ── ดู ROPA ทั้งหมดของ user ───────────────────────────────
export const getMyRopa = async (userId: string, departmentId: string) => {
  return db.query.ropaActivities.findMany({
    where: and(
      eq(ropaActivities.departmentId, departmentId),
      eq(ropaActivities.ownerId, userId)
    ),
    orderBy: desc(ropaActivities.createdAt),
    columns: {
      id: true, ropaId: true, title: true,
      status: true, version: true,
      createdAt: true, updatedAt: true,
    },
  })
}

// ── ดู ROPA รายละเอียด ────────────────────────────────────
export const getRopaById = async (id: string, userId: string) => {
  const activity = await db.query.ropaActivities.findFirst({
    where: eq(ropaActivities.id, id),
    with:  { sections: true },
  })

  if (!activity) throw new Error("ROPA not found")

  const decryptedSections = await Promise.all(
    activity.sections.map(async (section) => {
      if (section.sectionNumber === SENSITIVE_SECTION && section.encryptedFields.length > 0) {
        const data = section.data as Record<string, unknown>
        const decrypted = { ...data }
        for (const field of section.encryptedFields) {
          if (typeof data[field] === "string") {
            try { decrypted[field] = await decrypt(data[field] as string) }
            catch { decrypted[field] = "[decrypt error]" }
          }
        }
        return { ...section, data: decrypted }
      }
      return section
    })
  )

  return { ...activity, sections: decryptedSections }
}

// ── บันทึก/อัปเดต section ────────────────────────────────
export const saveSection = async (
  activityId: string,
  sectionNumber: SectionNumber,
  data: unknown,
  userId: string,
  ipAddress: string,
  isCio: boolean = false
) => {
  // ตรวจสอบสิทธิ์: เจ้าของ หรือ CIO เท่านั้น
  const ownerCheck = await db.query.ropaActivities.findFirst({
    where: isCio
      ? eq(ropaActivities.id, activityId)
      : and(eq(ropaActivities.id, activityId), eq(ropaActivities.ownerId, userId)),
  })
  if (!ownerCheck) throw new Error("ROPA not found or not owned by you")

  const schema = sectionSchemas[sectionNumber]
  const validated = schema.parse(data)

  let processedData: Record<string, unknown> = validated as Record<string, unknown>
  let encryptedFields: string[] = []

  if (sectionNumber === SENSITIVE_SECTION) {
    const sensitiveData = validated as Record<string, unknown>
    const generalData = sensitiveData["generalData"] as string[] ?? []
    const hasSensitive = SENSITIVE_FIELDS.some(f => generalData.includes(f))
    if (hasSensitive) {
      processedData = { ...sensitiveData }
      for (const field of SENSITIVE_FIELDS) {
        if (generalData.includes(field) && typeof sensitiveData[field] === "string") {
          processedData[field] = await encrypt(sensitiveData[field] as string)
          encryptedFields.push(field)
        }
      }
    }
  }

  const existing = await db.query.ropaSections.findFirst({
    where: and(
      eq(ropaSections.activityId, activityId),
      eq(ropaSections.sectionNumber, sectionNumber)
    ),
  })

  if (existing) {
    await db.update(ropaSections)
      .set({ data: processedData, encryptedFields, updatedAt: new Date() })
      .where(eq(ropaSections.id, existing.id))
  } else {
    await db.insert(ropaSections).values({ activityId, sectionNumber, data: processedData, encryptedFields })
  }

  await db.update(ropaActivities)
    .set({ updatedAt: new Date() })
    .where(eq(ropaActivities.id, activityId))

  await db.insert(auditLogs).values({
    userId,
    action:     "ropa.section.save",
    resource:   "ropa_sections",
    resourceId: activityId,
    metadata:   { sectionNumber },
    ipAddress,
    status:     "success",
  })

  return { success: true, sectionNumber }
}

// ── Submit ROPA ───────────────────────────────────────────
export const deleteRopa = async (activityId: string, userId: string, ipAddress: string, isCio: boolean = false) => {
  const activity = await db.query.ropaActivities.findFirst({
    where: isCio
      ? eq(ropaActivities.id, activityId)
      : and(eq(ropaActivities.id, activityId), eq(ropaActivities.ownerId, userId)),
  })

  if (!activity) throw new Error("ROPA not found or not owned by you")
  if (activity.status !== "draft" && activity.status !== "revision") {
    throw new Error("Only draft or revision ROPA can be deleted")
  }

  await db.delete(ropaSections).where(eq(ropaSections.activityId, activityId))
  await db.delete(ropaActivities).where(eq(ropaActivities.id, activityId))

  await db.insert(auditLogs).values({
    userId,
    action: "delete_ropa",
    resource: "ropa_activity",
    resourceId: activityId,
    ipAddress,
    metadata: { ropaId: activity.ropaId },
  })

  return { success: true }
}

export const updateRopaInfo = async (
  activityId: string,
  userId: string,
  data: { title?: string; ownerPosition?: string; ownerPhone?: string; ownerEmail?: string },
  ipAddress: string,
  isCio: boolean = false
) => {
  const activity = await db.query.ropaActivities.findFirst({
    where: isCio
      ? eq(ropaActivities.id, activityId)
      : and(eq(ropaActivities.id, activityId), eq(ropaActivities.ownerId, userId)),
  })

  if (!activity) throw new Error("ROPA not found or not owned by you")
  if (activity.status !== "draft" && activity.status !== "revision") {
    throw new Error("Only draft or revision ROPA can be edited")
  }

  const updateData: Record<string, unknown> = { updatedAt: new Date() }
  if (data.title !== undefined) updateData.title = data.title
  if (data.ownerPosition !== undefined) updateData.ownerPosition = data.ownerPosition
  if (data.ownerPhone !== undefined) updateData.ownerPhone = data.ownerPhone
  if (data.ownerEmail !== undefined) updateData.ownerEmail = data.ownerEmail

  const [updated] = await db.update(ropaActivities)
    .set(updateData)
    .where(eq(ropaActivities.id, activityId))
    .returning()

  await db.insert(auditLogs).values({
    userId,
    action: "update_ropa_info",
    resource: "ropa_activity",
    resourceId: activityId,
    ipAddress,
    metadata: data,
  })

  return updated
}

export const submitRopa = async (activityId: string, userId: string, ipAddress: string) => {
  const activity = await db.query.ropaActivities.findFirst({
    where: and(eq(ropaActivities.id, activityId), eq(ropaActivities.ownerId, userId)),
    with:  { sections: true },
  })

  if (!activity) throw new Error("ROPA not found or not owned by you")
  if (activity.status !== "draft" && activity.status !== "revision") {
    throw new Error("Only draft or revision ROPA can be submitted")
  }

  const requiredSections = [2, 3, 4, 5, 6, 7, 10, 11]
  const savedSections = activity.sections.map(s => s.sectionNumber)
  const missingSections = requiredSections.filter(s => !savedSections.includes(s))
  if (missingSections.length > 0) {
    throw new Error(`Missing required sections: ${missingSections.join(", ")}`)
  }

  await db.update(ropaActivities)
    .set({ status: "submitted", submittedAt: new Date(), updatedAt: new Date() })
    .where(eq(ropaActivities.id, activityId))

  await db.insert(auditLogs).values({
    userId,
    action:     "ropa.submit",
    resource:   "ropa_activities",
    resourceId: activityId,
    ipAddress,
    status:     "success",
  })

  return { success: true, message: "ROPA submitted for approval" }
}
