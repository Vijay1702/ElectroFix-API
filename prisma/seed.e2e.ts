import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { E2E_CATEGORY_NAME, E2E_PASSWORD, E2E_USERS } from "./e2e-fixtures";

const prisma = new PrismaClient();

// Seeds the minimum fixed fixtures every e2e test relies on: one user per role
// (STAFF/MONITOR can't be created through POST /users, which only allows
// ADMIN/TECHNICIAN — seeding them directly is the only way to test those roles)
// and one category to hang product tests off. Idempotent via upsert, safe to rerun.
async function main() {
  console.log("Seeding e2e fixtures...");

  const roles = await Promise.all(
    ["ADMIN", "TECHNICIAN", "MONITOR", "STAFF"].map((name) =>
      prisma.role.upsert({ where: { name }, update: {}, create: { name } })
    )
  );
  const roleIdByName = Object.fromEntries(roles.map((r) => [r.name, r.id]));

  const hashedPassword = await bcrypt.hash(E2E_PASSWORD, 10);

  for (const user of Object.values(E2E_USERS)) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: { isActive: true, operationalStatus: "Active", password: hashedPassword },
      create: {
        fullName: user.fullName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        password: hashedPassword,
        isActive: true,
        operationalStatus: "Active",
        perDaySalary: user.role === "TECHNICIAN" ? 750 : 0,
        roleId: roleIdByName[user.role],
      },
    });
  }

  const existingCategory = await prisma.category.findFirst({ where: { name: E2E_CATEGORY_NAME } });
  if (!existingCategory) {
    await prisma.category.create({
      data: { name: E2E_CATEGORY_NAME, description: "Category used by Playwright e2e tests" },
    });
  }

  console.log("e2e fixtures ready.");
}

// Guarded so importing this module elsewhere (it isn't, anymore, but this is
// the standard safeguard for any script with a top-level main()) never
// re-triggers seeding as a side effect of the import.
if (require.main === module) {
  main()
    .catch((e) => {
      console.error("e2e seed failed:", e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
