import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database with Tamil Nadu (India) sample data...");

  // Clean existing data
  await prisma.payment.deleteMany({});
  await prisma.invoiceItem.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.stockMovement.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.repairStatusHistory.deleteMany({});
  await prisma.repairJob.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.setting.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.role.deleteMany({});

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

  // Create users
  const hashedPassword = await bcrypt.hash("Admin@123", 10);

  const adminUser = await prisma.user.create({
    data: {
      fullName: "Rajesh Kumar",
      email: "admin@electrofix.com",
      phoneNumber: "9840012345",
      password: hashedPassword,
      isActive: true,
      roleId: adminRole.id,
    },
  });

  const techUser1 = await prisma.user.create({
    data: {
      fullName: "Vijay Raghavan",
      email: "tech1@electrofix.com",
      phoneNumber: "9840054321",
      password: hashedPassword,
      isActive: true,
      roleId: technicianRole.id,
    },
  });

  const techUser2 = await prisma.user.create({
    data: {
      fullName: "Anitha Subramanian",
      email: "tech2@electrofix.com",
      phoneNumber: "9840098765",
      password: hashedPassword,
      isActive: true,
      roleId: technicianRole.id,
    },
  });

  const techUser3 = await prisma.user.create({
    data: {
      fullName: "Karthik Raja",
      email: "tech3@electrofix.com",
      phoneNumber: "9840011111",
      password: hashedPassword,
      isActive: true,
      roleId: technicianRole.id,
    },
  });

  const techUser4 = await prisma.user.create({
    data: {
      fullName: "Vigneshwaran S.",
      email: "tech4@electrofix.com",
      phoneNumber: "9840022222",
      password: hashedPassword,
      isActive: true,
      roleId: technicianRole.id,
    },
  });

  const techUser5 = await prisma.user.create({
    data: {
      fullName: "Selva Kumar",
      email: "tech5@electrofix.com",
      phoneNumber: "9840033333",
      password: hashedPassword,
      isActive: true,
      roleId: technicianRole.id,
    },
  });

  const technicians = [techUser1, techUser2, techUser3, techUser4, techUser5];

  // Create Tamil Nadu settings
  const defaultSettings = [
    { settingKey: "shop_name", settingValue: "ElectroFix Tamil Nadu" },
    { settingKey: "shop_address", settingValue: "No. 42, Anna Salai, Chennai, Tamil Nadu - 600002" },
    { settingKey: "shop_phone", settingValue: "044-24556677" },
    { settingKey: "shop_email", settingValue: "contact@electrofix.in" },
    { settingKey: "currency", settingValue: "INR" },
    { settingKey: "tax_percentage", settingValue: "18" }, // GST 18%
  ];

  for (const setting of defaultSettings) {
    await prisma.setting.create({ data: setting });
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
    createdCustomers.push(
      await prisma.customer.create({
        data: {
          customerCode: `CUST-TN-${2024001 + i}`,
          fullName: c.name,
          phoneNumber: c.phone,
          address: c.address,
          notes: i % 5 === 0 ? "Frequent Visitor" : null,
        },
      })
    );
  }

  // Categories
  const catPhones = await prisma.category.create({ data: { name: "Smartphones", description: "Mobile repairs and parts" } });
  const catLaptops = await prisma.category.create({ data: { name: "Laptops", description: "Computing services" } });
  
  // Products
  const products = [];
  products.push(await prisma.product.create({
    data: {
      categoryId: catPhones.id,
      productCode: "PRD-SAM-DIS",
      name: "Samsung Display Unit",
      brand: "Samsung",
      purchasePrice: 4500.0,
      sellingPrice: 7500.0,
      stockQuantity: 15,
      minimumStock: 3,
    }
  }));

  products.push(await prisma.product.create({
    data: {
      categoryId: catLaptops.id,
      productCode: "PRD-DEL-BAT",
      name: "Dell Original Battery",
      brand: "Dell",
      purchasePrice: 2200.0,
      sellingPrice: 3800.0,
      stockQuantity: 10,
      minimumStock: 2,
    }
  }));

  // Repair Jobs
  const statuses = ["PENDING", "IN_PROGRESS", "COMPLETED", "DELIVERED"];
  for (let i = 0; i < 20; i++) {
    const customer = createdCustomers[i % createdCustomers.length];
    const tech = technicians[i % technicians.length];
    const status = statuses[i % statuses.length];

    await prisma.repairJob.create({
      data: {
        customerId: customer.id,
        technicianId: tech.id,
        jobNumber: `REP-TN-${2024001 + i}`,
        deviceType: i % 2 === 0 ? "Smartphone" : "Laptop",
        brand: i % 2 === 0 ? "Samsung" : "Dell",
        model: i % 2 === 0 ? "Galaxy M34" : "Vostro 3510",
        problemDescription: i % 3 === 0 ? "Display flickering" : "Water damage",
        status: status,
        receivedDate: new Date(),
        estimatedCost: 2000 + (i * 500),
        advanceAmount: status !== "PENDING" ? 500 : 0,
      }
    });
  }

  console.log("🎉 Seeding completed with Tamil Nadu specific data!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
