import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Bootstrapping ElectroFix — creating system roles and admin account...");

  // Roles (required for any user creation to work)
  const adminRole = await prisma.role.upsert({
    where: { name: "ADMIN" },
    update: {},
    create: { name: "ADMIN" },
  });

  const technicianRole = await prisma.role.upsert({
    where: { name: "TECHNICIAN" },
    update: {},
    create: { name: "TECHNICIAN" },
  });

  // Default admin account
  const hashedPassword = await bcrypt.hash("Admin@123", 10);

  await prisma.user.upsert({
    where: { email: "admin@electrofix.com" },
    update: {},
    create: {
      fullName: "Admin",
      email: "admin@electrofix.com",
      phoneNumber: "9840012345",
      password: hashedPassword,
      isActive: true,
      operationalStatus: "Active",
      perDaySalary: 0,
      roleId: adminRole.id,
    },
  });

  // Core shop settings (GST, currency)
  const settings = [
    { settingKey: "shop_name", settingValue: "ElectroFix" },
    { settingKey: "shop_address", settingValue: "" },
    { settingKey: "shop_phone", settingValue: "" },
    { settingKey: "shop_email", settingValue: "" },
    { settingKey: "currency", settingValue: "INR" },
    { settingKey: "tax_percentage", settingValue: "18" },
  ];

  for (const s of settings) {
    await prisma.setting.upsert({
      where: { settingKey: s.settingKey },
      update: {},
      create: s,
    });
  }

  // Sample categories
  const categories = [
    { name: "Fan", description: "Ceiling, table, and pedestal fans" },
    { name: "Mixie", description: "Mixer grinders and blenders" },
    { name: "Grinder", description: "Wet grinders and heavy duty grinders" },
    { name: "Gas Stove", description: "Gas stoves and hobs" },
    { name: "Motor", description: "Water motors and pumps" },
    { name: "Iron Box", description: "Dry and steam irons" },
    { name: "Smart Home", description: "Smart home appliances and automation" },
    { name: "Cooker", description: "Induction cookers and pressure cookers" },
  ];

  for (const c of categories) {
    const existing = await prisma.category.findFirst({
      where: { name: c.name }
    });
    if (!existing) {
      await prisma.category.create({
        data: c
      });
    }
  }

  console.log("✅ Bootstrap complete!");
  console.log("   Roles created : ADMIN, TECHNICIAN");
  console.log("   Categories    : Fan, Mixie, Grinder, Gas Stove, Motor, Iron Box, Smart Home, Cooker");
  console.log("   Admin login   : admin@electrofix.com / Admin@123");
  console.log("   No sample data added — app is ready for real data.");
}

main()
  .catch((e) => {
    console.error("❌ Bootstrap failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
