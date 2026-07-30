// Plain data only — no PrismaClient, no side effects. Safe to import from
// anywhere (test specs, the seed script) without triggering a DB connection.
export const E2E_PASSWORD = "Test@1234";

export const E2E_USERS = {
  ADMIN: { email: "admin@e2e.test", fullName: "E2E Admin", phoneNumber: "9000000001", role: "ADMIN" },
  TECHNICIAN: { email: "tech@e2e.test", fullName: "E2E Technician", phoneNumber: "9000000002", role: "TECHNICIAN" },
  MONITOR: { email: "monitor@e2e.test", fullName: "E2E Monitor", phoneNumber: "9000000003", role: "MONITOR" },
  STAFF: { email: "staff@e2e.test", fullName: "E2E Staff", phoneNumber: "9000000004", role: "STAFF" },
};

export const E2E_CATEGORY_NAME = "E2E Test Category";
