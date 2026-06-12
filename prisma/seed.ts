import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database with Tamil Nadu (India) sample data (safe mode)...");

  // Create roles
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

  const monitorRole = await prisma.role.upsert({
    where: { name: "MONITOR" },
    update: {},
    create: { name: "MONITOR" },
  });

  // Create users
  const hashedPassword = await bcrypt.hash("Admin@123", 10);

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@electrofix.com" },
    update: {},
    create: {
      fullName: "Rajesh Kumar",
      email: "admin@electrofix.com",
      phoneNumber: "9840012345",
      password: hashedPassword,
      isActive: true,
      operationalStatus: "Active",
      perDaySalary: 0,
      roleId: adminRole.id,
    },
  });

  const techUser1 = await prisma.user.upsert({
    where: { email: "tech1@electrofix.com" },
    update: {},
    create: {
      fullName: "Vijay Raghavan",
      email: "tech1@electrofix.com",
      phoneNumber: "9840054321",
      password: hashedPassword,
      isActive: true,
      operationalStatus: "Active",
      perDaySalary: 750.00,
      roleId: technicianRole.id,
    },
  });

  const monitorUser = await prisma.user.upsert({
    where: { email: "monitor@electrofix.com" },
    update: {},
    create: {
      fullName: "System Monitor",
      email: "monitor@electrofix.com",
      phoneNumber: "9840099999",
      password: hashedPassword,
      isActive: true,
      operationalStatus: "Active",
      perDaySalary: 0,
      roleId: monitorRole.id,
    },
  });

  const technicians = [techUser1];

  // Create Tamil Nadu settings
  const defaultSettings = [
    { settingKey: "shop_name", settingValue: "ElectroFix Tamil Nadu" },
    { settingKey: "shop_address", settingValue: "No. 42, Anna Salai, Chennai, Tamil Nadu - 600002" },
    { settingKey: "shop_phone", settingValue: "+91 86672 64983" },
    { settingKey: "shop_email", settingValue: "rameshvijay871@gmail.com" },
    { settingKey: "currency", settingValue: "INR" },
    { settingKey: "tax_percentage", settingValue: "18" }, // GST 18%
  ];

  for (const setting of defaultSettings) {
    await prisma.setting.upsert({
      where: { settingKey: setting.settingKey },
      update: { settingValue: setting.settingValue },
      create: setting,
    });
  }

  // Create Indian Customers (Tamil Nadu)
  const tamilCustomers = [
    { name: "Suresh Perumal", phone: "9123456780", address: "12, T. Nagar, Chennai" },
    { name: "Meena Krishnamurthy", phone: "9123456781", address: "45, Gandhipuram, Coimbatore" },
    { name: "Ramesh Babu", phone: "9123456782", address: "7, Anna Nagar, Madurai" },
    { name: "Priya Dharshini", phone: "9123456783", address: "23, Thillai Nagar, Trichy" },
    { name: "Karthik Raja", phone: "9123456784", address: "88, Periyar Nagar, Erode" },
    { name: "Deepa Lakshmi", phone: "9123456785", address: "15, Salem Main Road, Salem" },
    { name: "Senthil Kumar", phone: "9123456786", address: "5, Vellore Fort, Vellore" },
    { name: "Indira Gandhi", phone: "9123456787", address: "10, Courtallam Road, Tirunelveli" },
    { name: "Arun Vijay", phone: "9123456788", address: "32, Besant Nagar, Chennai" },
    { name: "Kavitha Selvam", phone: "9123456789", address: "54, RS Puram, Coimbatore" },
    { name: "Muthu Swamy", phone: "9884411223", address: "21, South Masi Street, Madurai" },
    { name: "Shanthi Devi", phone: "9884455667", address: "9, West Blvd Road, Trichy" },
    { name: "Baskar Mani", phone: "9884499001", address: "14, Saradha College Road, Salem" },
    { name: "Divya Bharathi", phone: "9884433445", address: "6, Katpadi Road, Vellore" },
    { name: "Siva Kartikeyan", phone: "9884477889", address: "11, High Ground, Tirunelveli" },
  ];

  const createdCustomers = [];
  for (let i = 0; i < tamilCustomers.length; i++) {
    const c = tamilCustomers[i];
    const customerCode = `CUST-TN-${2024001 + i}`;
    let existing = await prisma.customer.findFirst({
      where: {
        OR: [
          { phoneNumber: c.phone },
          { customerCode: customerCode }
        ]
      }
    });

    if (!existing) {
      existing = await prisma.customer.create({
        data: {
          customerCode: customerCode,
          fullName: c.name,
          phoneNumber: c.phone,
          address: c.address,
          notes: i % 5 === 0 ? "Frequent Visitor" : null,
        },
      });
    }
    createdCustomers.push(existing);
  }

  // Categories helper
  const getOrCreateCategory = async (name: string, description: string) => {
    const existing = await prisma.category.findFirst({ where: { name } });
    if (existing) return existing;
    return prisma.category.create({ data: { name, description } });
  };

  const catFan = await getOrCreateCategory("Fan", "Ceiling, table, and pedestal fans");
  const catMixie = await getOrCreateCategory("Mixie", "Mixer grinders and blenders");
  const catGrinder = await getOrCreateCategory("Grinder", "Wet grinders and heavy duty grinders");
  const catGasStove = await getOrCreateCategory("Gas Stove", "Gas stoves and hobs");
  const catMotor = await getOrCreateCategory("Motor", "Water motors and pumps");
  const catIronBox = await getOrCreateCategory("Iron Box", "Dry and steam irons");
  const catCooker = await getOrCreateCategory("Cooker", "Induction cookers and pressure cookers");

  // Products helper
  const getOrCreateProduct = async (data: any) => {
    const existing = await prisma.product.findUnique({ where: { productCode: data.productCode } });
    if (existing) return existing;
    return prisma.product.create({ data });
  };

  const products = [];
  products.push(await getOrCreateProduct({
    categoryId: catFan.id,
    productCode: "PRD-FAN-CAP",
    name: "Fan Capacitor 2.5mfd",
    brand: "Generic",
    purchasePrice: 30.0,
    sellingPrice: 60.0,
    stockQuantity: 50,
    minimumStock: 10,
  }));

  products.push(await getOrCreateProduct({
    categoryId: catMixie.id,
    productCode: "PRD-MIX-JAR",
    name: "Mixie Steel Jar",
    brand: "Preethi",
    purchasePrice: 250.0,
    sellingPrice: 400.0,
    stockQuantity: 20,
    minimumStock: 5,
  }));

  // Repair Jobs
  const statuses = ["PENDING", "IN_PROGRESS", "COMPLETED", "DELIVERED"];
  for (let i = 0; i < 20; i++) {
    const customer = createdCustomers[i % createdCustomers.length];
    const tech = technicians[i % technicians.length];
    const status = statuses[i % statuses.length];
    const jobNumber = `REP-TN-${2024001 + i}`;

    const existingJob = await prisma.repairJob.findUnique({ where: { jobNumber } });
    if (!existingJob) {
      await prisma.repairJob.create({
        data: {
          customerId: customer.id,
          technicianId: tech.id,
          jobNumber: jobNumber,
          deviceType: i % 2 === 0 ? "Fan" : "Mixie",
          brand: i % 2 === 0 ? "Crompton" : "Preethi",
          model: i % 2 === 0 ? "High Speed 400mm" : "Zodiac 750W",
          problemDescription: i % 3 === 0 ? "Not turning on" : "Making noise",
          status: status,
          receivedDate: new Date(),
          estimatedCost: 2000 + (i * 500),
          advanceAmount: status !== "PENDING" ? 500 : 0,
        }
      });
    }
  }

  console.log("🎉 Seeding completed in safe mode!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
