import argon2 from "argon2"

// ค่า config ที่แนะนำสำหรับ Argon2id (OWASP 2024)
const ARGON2_OPTIONS = {
  type:        argon2.argon2id,
  memoryCost:  65536,  // 64MB
  timeCost:    3,      // 3 iterations
  parallelism: 4,      // 4 threads
} as const

// hash password ก่อน save ลง database
export const hashPassword = async (password: string): Promise<string> => {
  return argon2.hash(password, ARGON2_OPTIONS)
}

// ตรวจสอบ password ที่ user กรอก vs hash ใน database
export const verifyPassword = async (
  password: string,
  hash: string
): Promise<boolean> => {
  return argon2.verify(hash, password)
}

// hash API Key ก่อน save (ใช้ SHA-256 เพราะ API Key ยาวพอแล้ว)
export const hashApiKey = async (apiKey: string): Promise<string> => {
  const encoder = new TextEncoder()
  const data = encoder.encode(apiKey)
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
}
