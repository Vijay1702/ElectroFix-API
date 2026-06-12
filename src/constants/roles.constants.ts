export const ROLES = {
  ADMIN: "ADMIN",
  STAFF: "STAFF",
  TECHNICIAN: "TECHNICIAN",
  MONITOR: "MONITOR",
} as const;

export type RoleType = (typeof ROLES)[keyof typeof ROLES];
