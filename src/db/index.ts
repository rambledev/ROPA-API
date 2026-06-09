import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "./schema"

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is not set")
}

console.log("[DB] Connecting to database...")
console.log("[DB] NODE_ENV:", process.env.NODE_ENV)
console.log("[DB] Host:", DATABASE_URL.split("@")[1]?.split("/")[0])

const client = postgres(DATABASE_URL, {
  max:             10,
  idle_timeout:    20,
  connect_timeout: 10,
  ssl:             false,
  onnotice:        (notice) => console.log("[DB Notice]", notice.message),
  debug:           process.env.NODE_ENV !== "production",
})

// ทดสอบ connection ตอนเริ่ม
client`SELECT 1 as connected`
  .then(() => console.log("[DB] Connection successful!"))
  .catch((err) => console.error("[DB] Connection failed:", err.message))

export const db = drizzle(client, { schema })
export type Database = typeof db
