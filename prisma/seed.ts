import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create roles
  const adminRole = await prisma.role.upsert({
    where: { name: "ADMIN" },
    update: {},
    create: { name: "ADMIN" },
  });

  const staffRole = await prisma.role.upsert({
    where: { name: "STAFF" },
    update: {},
    create: { name: "STAFF" },
  });

  const technicianRole = await prisma.role.upsert({
    where: { name: "TECHNICIAN" },
    update: {},
    create: { name: "TECHNICIAN" },
  });

  console.log("✅ Roles created:", { adminRole, staffRole, technicianRole });

  // Create default admin user
  const hashedPassword = await bcrypt.hash("Admin@123", 10);

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@electrofix.com" },
    update: {},
    create: {
      fullName: "System Admin",
      email: "admin@electrofix.com",
      phoneNumber: "9999999999",
      password: hashedPassword,
      isActive: true,
      roleId: adminRole.id,
    },
  });

  console.log("✅ Admin user created:", { id: adminUser.id, email: adminUser.email });

  // Create default settings
  const defaultSettings = [
    { settingKey: "shop_name", settingValue: "ElectroFix Repair Shop" },
    { settingKey: "shop_address", settingValue: "123 Main Street" },
    { settingKey: "shop_phone", settingValue: "9999999999" },
    { settingKey: "shop_email", settingValue: "info@electrofix.com" },
    { settingKey: "currency", settingValue: "INR" },
    { settingKey: "tax_percentage", settingValue: "18" },
  ];

  for (const setting of defaultSettings) {
    await prisma.setting.upsert({
      where: { settingKey: setting.settingKey },
      update: {},
      create: setting,
    });
  }

  console.log("✅ Default settings created");
  console.log("🎉 Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
