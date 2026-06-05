import { 
  pgTable, uuid, varchar, boolean, 
  timestamp, text 
} from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"

export const departments = pgTable("departments", {
  id:        uuid("id").defaultRandom().primaryKey(),
  name:      varchar("name", { length: 200 }).notNull(),
  code:      varchar("code", { length: 20 }).notNull().unique(),
  parentId:  uuid("parent_id"),
  isActive:  boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const users = pgTable("users", {
  id:           uuid("id").defaultRandom().primaryKey(),
  email:        varchar("email", { length: 200 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  firstName:    varchar("first_name", { length: 100 }).notNull(),
  lastName:     varchar("last_name",  { length: 100 }).notNull(),
  role:         varchar("role", { length: 20 }).notNull().default("user"),
  departmentId: uuid("department_id").references(() => departments.id),
  mfaSecret:    varchar("mfa_secret",  { length: 100 }),
  mfaEnabled:   boolean("mfa_enabled").notNull().default(false),
  isActive:     boolean("is_active").notNull().default(true),
  lastLoginAt:  timestamp("last_login_at"),
  createdAt:    timestamp("created_at").defaultNow().notNull(),
  updatedAt:    timestamp("updated_at").defaultNow().notNull(),
})

export const refreshTokens = pgTable("refresh_tokens", {
  id:        uuid("id").defaultRandom().primaryKey(),
  userId:    uuid("user_id").references(() => users.id).notNull(),
  tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  revokedAt: timestamp("revoked_at"),
  userAgent: text("user_agent"),
  ipAddress: varchar("ip_address", { length: 45 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const departmentsRelations = relations(departments, ({ one, many }) => ({
  parent:   one(departments, { fields: [departments.parentId], references: [departments.id] }),
  children: many(departments),
  users:    many(users),
}))

export const usersRelations = relations(users, ({ one, many }) => ({
  department:    one(departments, { fields: [users.departmentId], references: [departments.id] }),
  refreshTokens: many(refreshTokens),
}))

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, { fields: [refreshTokens.userId], references: [users.id] }),
}))
