import { 
  pgTable, uuid, varchar, 
  timestamp, text
} from "drizzle-orm/pg-core"
import { users } from "./users"

export const consents = pgTable("consents", {
  id:      uuid("id").defaultRandom().primaryKey(),
  userId:  uuid("user_id").references(() => users.id).notNull(),
  type:    varchar("type",    { length: 50  }).notNull(),
  // privacy_policy | data_processing | ropa_submission
  version:   varchar("version",   { length: 20  }).notNull(),
  ipAddress: varchar("ip_address", { length: 45  }).notNull(),
  userAgent: text("user_agent"),
  consentedAt: timestamp("consented_at").defaultNow().notNull(),
  withdrawnAt: timestamp("withdrawn_at"),
})
