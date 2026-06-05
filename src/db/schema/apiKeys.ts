import { 
  pgTable, uuid, varchar, boolean, 
  timestamp, text, integer 
} from "drizzle-orm/pg-core"
import { users } from "./users"

export const apiKeyRequests = pgTable("api_key_requests", {
  id:             uuid("id").defaultRandom().primaryKey(),
  requesterName:  varchar("requester_name",  { length: 200 }).notNull(),
  requesterEmail: varchar("requester_email", { length: 200 }).notNull(),
  organization:   varchar("organization",    { length: 200 }).notNull(),
  phone:          varchar("phone",           { length: 20  }),
  purpose:        text("purpose").notNull(),
  requestedScopes: text("requested_scopes").array().notNull(),
  status:         varchar("status", { length: 20 }).notNull().default("pending"),
  // pending | approved | rejected | cancelled
  reviewedBy:  uuid("reviewed_by").references(() => users.id),
  reviewedAt:  timestamp("reviewed_at"),
  reviewNote:  text("review_note"),
  apiKeyId:    uuid("api_key_id"),
  createdAt:   timestamp("created_at").defaultNow().notNull(),
  updatedAt:   timestamp("updated_at").defaultNow().notNull(),
})

export const apiKeys = pgTable("api_keys", {
  id:         uuid("id").defaultRandom().primaryKey(),
  requestId:  uuid("request_id").references(() => apiKeyRequests.id).notNull(),
  ownerName:  varchar("owner_name",  { length: 200 }).notNull(),
  ownerEmail: varchar("owner_email", { length: 200 }).notNull(),
  keyHash:    varchar("key_hash",    { length: 64  }).notNull().unique(),
  keyPrefix:  varchar("key_prefix",  { length: 20  }).notNull(),
  scopes:     text("scopes").array().notNull(),
  tier:       varchar("tier", { length: 20 }).notNull().default("basic"),
  isActive:   boolean("is_active").notNull().default(true),
  expiresAt:  timestamp("expires_at"),
  lastUsedAt: timestamp("last_used_at"),
  usageCount: integer("usage_count").notNull().default(0),
  revokedBy:    uuid("revoked_by").references(() => users.id),
  revokedAt:    timestamp("revoked_at"),
  revokeReason: text("revoke_reason"),
  createdBy:  uuid("created_by").references(() => users.id).notNull(),
  createdAt:  timestamp("created_at").defaultNow().notNull(),
})

export const apiKeyUsageLogs = pgTable("api_key_usage_logs", {
  id:         uuid("id").defaultRandom().primaryKey(),
  apiKeyId:   uuid("api_key_id").references(() => apiKeys.id).notNull(),
  endpoint:   varchar("endpoint",   { length: 200 }).notNull(),
  method:     varchar("method",     { length: 10  }).notNull(),
  ipAddress:  varchar("ip_address", { length: 45  }).notNull(),
  statusCode: integer("status_code").notNull(),
  createdAt:  timestamp("created_at").defaultNow().notNull(),
})
