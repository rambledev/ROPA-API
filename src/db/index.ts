import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "./schema"

// ตรวจสอบ env ก่อนเชื่อมต่อ — fail fast ถ้าไม่มี
const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is not set")
}

// postgres client
const client = postgres(DATABASE_URL, {
  // จำนวน connection สูงสุดใน pool
  max: 10,

  // timeout (ms)
  idle_timeout: 20,
  connect_timeout: 10,

  // SSL สำหรับ production
  ssl: process.env.NODE_ENV === "production" ? "require" : false,
})

// drizzle instance พร้อม schema (ใช้ query API ได้)
export const db = drizzle(client, { schema })

export type Database = typeof db
