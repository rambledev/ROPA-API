// Role definitions — single source of truth
export const ROLES = {
  USER:  "user",
  DPO:   "dpo",
  ADMIN: "admin",
  CIO:   "cio",
} as const

export type Role = typeof ROLES[keyof typeof ROLES]

// สิทธิ์ของแต่ละ role — ใช้ใน RBAC middleware
export const ROLE_HIERARCHY: Record<Role, number> = {
  user:  1,
  dpo:   2,
  admin: 3,
  cio:   4,
}

// helper — ตรวจว่า role มีสิทธิ์เพียงพอไหม
export const hasMinRole = (userRole: Role, minRole: Role): boolean => {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minRole]
}
