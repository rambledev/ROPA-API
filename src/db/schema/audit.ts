import { 
  pgTable, uuid, varchar, 
  timestamp, text, jsonb 
} from "drizzle-orm/pg-core"
import { users } from "./users"

export const auditLogs = pgTable("audit_logs", {
  id:         uuid("id").defaultRandom().primaryKey(),
  userId:     uuid("user_id").references(() => users.id),
  action:     varchar("action",      { length: 100 }).notNull(),
  resource:   varchar("resource",    { length: 100 }).notNull(),
  resourceId: varchar("resource_id", { length: 100 }),
  metadata:   jsonb("metadata"),
  ipAddress:  varchar("ip_address",  { length: 45  }).notNull(),
  userAgent:  text("user_agent"),
  status:     varchar("status", { length: 20 }).notNull().default("success"),
  createdAt:  timestamp("created_at").defaultNow().notNull(),
})
