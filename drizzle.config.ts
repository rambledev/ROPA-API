import { defineConfig } from "drizzle-kit"

export default defineConfig({
  // ตำแหน่ง schema files
  schema: "./src/db/schema/index.ts",
  
  // ตำแหน่ง migration files (auto-generated)
  out: "./src/db/migrations",
  
  // ใช้ PostgreSQL
  dialect: "postgresql",
  
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  
  // แสดง SQL ที่จะรันก่อน migrate (ช่วย debug)
  verbose: true,
  
  // ยืนยันก่อน migrate จริง
  strict: true,
})
