import { 
  pgTable, uuid, varchar, text, 
  timestamp, integer, jsonb, boolean 
} from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { users, departments } from "./users"

export const ropaActivities = pgTable("ropa_activities", {
  id:     uuid("id").defaultRandom().primaryKey(),
  ropaId: varchar("ropa_id", { length: 50 }).notNull().unique(),

  departmentId: uuid("department_id")
    .references(() => departments.id).notNull(),
  ownerId: uuid("owner_id")
    .references(() => users.id).notNull(),

  title: varchar("title", { length: 300 }).notNull(),

  // ข้อมูล Process Owner จากแบบฟอร์มส่วนที่ 1
  ownerPosition: varchar("owner_position", { length: 200 }),
  ownerPhone:    varchar("owner_phone",    { length: 20  }),
  ownerEmail:    varchar("owner_email",    { length: 200 }),

  status: varchar("status", { length: 20 }).notNull().default("draft"),
  // draft | submitted | approved | rejected | revision

  version:     integer("version").notNull().default(1),
  submittedAt: timestamp("submitted_at"),
  createdAt:   timestamp("created_at").defaultNow().notNull(),
  updatedAt:   timestamp("updated_at").defaultNow().notNull(),
})

export const ropaSections = pgTable("ropa_sections", {
  id:         uuid("id").defaultRandom().primaryKey(),
  activityId: uuid("activity_id")
    .references(() => ropaActivities.id).notNull(),

  sectionNumber:   integer("section_number").notNull(),
  data:            jsonb("data").notNull().default({}),
  encryptedFields: text("encrypted_fields").array().notNull().default([]),
  updatedAt:       timestamp("updated_at").defaultNow().notNull(),
})

export const approvals = pgTable("approvals", {
  id:         uuid("id").defaultRandom().primaryKey(),
  activityId: uuid("activity_id")
    .references(() => ropaActivities.id).notNull(),
  approverId: uuid("approver_id")
    .references(() => users.id).notNull(),

  approverRole: varchar("approver_role", { length: 20 }).notNull(),
  // supervisor | dpo

  status:   varchar("status", { length: 20 }).notNull().default("pending"),
  // pending | approved | rejected

  comment:  text("comment"),
  signedAt: timestamp("signed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const dpiaAssessments = pgTable("dpia_assessments", {
  id:         uuid("id").defaultRandom().primaryKey(),
  activityId: uuid("activity_id")
    .references(() => ropaActivities.id).notNull(),

  riskLevel: varchar("risk_level", { length: 20 }).notNull(),
  // low | medium | high | very_high

  requiresDpia: boolean("requires_dpia").notNull().default(false),
  dpiaDetail:   text("dpia_detail"),
  assessorId:   uuid("assessor_id").references(() => users.id).notNull(),
  createdAt:    timestamp("created_at").defaultNow().notNull(),
})

export const ropaActivitiesRelations = relations(ropaActivities, ({ one, many }) => ({
  department: one(departments, { fields: [ropaActivities.departmentId], references: [departments.id] }),
  owner:      one(users,       { fields: [ropaActivities.ownerId],      references: [users.id] }),
  sections:   many(ropaSections),
  approvals:  many(approvals),
  dpia:       many(dpiaAssessments),
}))

export const ropaSectionsRelations = relations(ropaSections, ({ one }) => ({
  activity: one(ropaActivities, { fields: [ropaSections.activityId], references: [ropaActivities.id] }),
}))

export const approvalsRelations = relations(approvals, ({ one }) => ({
  activity: one(ropaActivities, { fields: [approvals.activityId], references: [ropaActivities.id] }),
  approver: one(users,          { fields: [approvals.approverId],  references: [users.id] }),
}))

export const dpiaAssessmentsRelations = relations(dpiaAssessments, ({ one }) => ({
  activity: one(ropaActivities, { fields: [dpiaAssessments.activityId], references: [ropaActivities.id] }),
  assessor: one(users, { fields: [dpiaAssessments.assessorId], references: [users.id] }),
}))
