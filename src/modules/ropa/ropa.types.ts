import { z } from "zod"

// ── Zod schemas สำหรับ validate input ────────────────────

// ส่วนที่ 1 — ข้อมูลทั่วไป (validate ตอนสร้าง ROPA)
export const createRopaSchema = z.object({
  title:         z.string().min(5).max(300),
  ownerPosition: z.string().max(200).optional(),
  ownerPhone:    z.string().max(20).optional(),
  ownerEmail:    z.string().email().optional(),
})

// ส่วนที่ 2 — วัตถุประสงค์
export const section2Schema = z.object({
  activityDetail: z.string().min(1),
  purposes: z.array(z.enum([
    "education", "hr", "research",
    "academic_service", "internal_management", "other"
  ])).min(1),
  purposeOther:  z.string().optional(),
  purposeDetail: z.string().min(1),
})

// ส่วนที่ 3 — Data Subject
export const section3Schema = z.object({
  dataSubjects: z.array(z.enum([
    "student", "applicant", "alumni", "staff",
    "employee", "contractor", "researcher",
    "research_volunteer", "trainee", "visitor",
    "it_user", "other"
  ])).min(1),
  dataSubjectOther: z.string().optional(),
})

// ส่วนที่ 4 — ประเภทข้อมูล
export const section4Schema = z.object({
  generalData: z.array(z.enum([
    "name", "id_card", "birthdate", "gender", "address",
    "phone", "email", "photo", "education", "work", "financial", "other"
  ])),
  generalDataOther:   z.string().optional(),
  sensitiveData: z.array(z.enum([
    "race", "religion", "health", "biometric",
    "criminal", "disability", "none", "other"
  ])),
  sensitiveDataOther: z.string().optional(),
})

// ส่วนที่ 5 — ฐานกฎหมาย
export const section5Schema = z.object({
  legalBases: z.array(z.enum([
    "legal_obligation", "public_task", "contract",
    "consent", "legitimate_interest",
    "vital_interest", "historical_research"
  ])).min(1),
  legalBasisDetail: z.string().optional(),
})

// ส่วนที่ 6 — แหล่งที่มา
export const section6Schema = z.object({
  sources: z.array(z.enum([
    "data_subject", "internal", "external",
    "information_system", "website", "application", "other"
  ])).min(1),
  sourceOther: z.string().optional(),
})

// ส่วนที่ 7 — ผู้รับข้อมูล
export const section7Schema = z.object({
  internalRecipients: z.string().optional(),
  externalRecipients: z.string().optional(),
  disclosureReason:   z.string().optional(),
})

// ส่วนที่ 8 — โอนข้อมูลต่างประเทศ
export const section8Schema = z.object({
  hasTransfer:        z.boolean(),
  destinationCountry: z.string().optional(),
  safeguardMeasures:  z.string().optional(),
})

// ส่วนที่ 9 — ระบบสารสนเทศ
export const section9Schema = z.object({
  systems: z.array(z.enum([
    "student_registry", "hr_system", "e_document",
    "lms", "erp", "website", "cloud", "ai", "other"
  ])),
  systemOther: z.string().optional(),
})

// ส่วนที่ 10 — ระยะเวลาเก็บรักษา
export const section10Schema = z.object({
  retentionPeriod:    z.string().min(1),
  legalReference:     z.string().optional(),
  destructionMethods: z.array(z.enum([
    "delete_system", "destroy_document", "destroy_media", "other"
  ])).min(1),
  destructionOther: z.string().optional(),
})

// ส่วนที่ 11 — มาตรการความปลอดภัย
export const section11Schema = z.object({
  technicalMeasures: z.array(z.enum([
    "access_control", "mfa", "encryption",
    "firewall", "antivirus", "backup", "log_monitoring"
  ])),
  adminMeasures: z.array(z.enum([
    "pdpa_policy", "staff_training", "nda", "risk_management"
  ])),
})

// ส่วนที่ 12 — ประเมินความเสี่ยง
export const section12Schema = z.object({
  riskLevel:    z.enum(["low", "medium", "high", "very_high"]),
  requiresDpia: z.boolean(),
  dpiaDetail:   z.string().optional(),
})

// Map section number → schema
export const sectionSchemas = {
  2:  section2Schema,
  3:  section3Schema,
  4:  section4Schema,
  5:  section5Schema,
  6:  section6Schema,
  7:  section7Schema,
  8:  section8Schema,
  9:  section9Schema,
  10: section10Schema,
  11: section11Schema,
  12: section12Schema,
} as const

export type SectionNumber = keyof typeof sectionSchemas

// Sensitive fields ที่ต้อง encrypt (ส่วนที่ 4)
export const SENSITIVE_SECTION = 4
export const SENSITIVE_FIELDS = ["id_card", "health", "biometric", "criminal"]
