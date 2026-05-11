import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database with comprehensive sample data...");

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

  console.log("✅ Roles created");

  // Create users
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

  const techUser1 = await prisma.user.upsert({
    where: { email: "tech1@electrofix.com" },
    update: {},
    create: {
      fullName: "John Technician",
      email: "tech1@electrofix.com",
      phoneNumber: "8888888881",
      password: hashedPassword,
      isActive: true,
      roleId: technicianRole.id,
    },
  });

  const techUser2 = await prisma.user.upsert({
    where: { email: "tech2@electrofix.com" },
    update: {},
    create: {
      fullName: "Sarah Hardware",
      email: "tech2@electrofix.com",
      phoneNumber: "8888888882",
      password: hashedPassword,
      isActive: true,
      roleId: technicianRole.id,
    },
  });

  console.log("✅ Users created");

  // Create default settings
  const defaultSettings = [
    { settingKey: "shop_name", settingValue: "ElectroFix Repair Shop" },
    { settingKey: "shop_address", settingValue: "123 Tech Avenue, Silicon Valley" },
    { settingKey: "shop_phone", settingValue: "9999999999" },
    { settingKey: "shop_email", settingValue: "info@electrofix.com" },
    { settingKey: "currency", settingValue: "USD" },
    { settingKey: "tax_percentage", settingValue: "10" },
  ];

  for (const setting of defaultSettings) {
    await prisma.setting.upsert({
      where: { settingKey: setting.settingKey },
      update: {},
      create: setting,
    });
  }

  console.log("✅ Default settings created");

  // Create Customers
  const customers = [];
  for (let i = 1; i <= 15; i++) {
    customers.push(
      await prisma.customer.create({
        data: {
          customerCode: `CUST-${2024000 + i}`,
          fullName: `Customer ${i} Name`,
          phoneNumber: `555-010${i.toString().padStart(2, '0')}`,
          address: `${i * 10} Main St, Cityville`,
          notes: i % 3 === 0 ? "VIP Customer" : null,
        },
      })
    );
  }
  console.log("✅ Customers created");

  // Create Categories
  const catPhones = await prisma.category.create({ data: { name: "Smartphones", description: "Mobile devices and parts" } });
  const catLaptops = await prisma.category.create({ data: { name: "Laptops", description: "Laptops and components" } });
  const catAccessories = await prisma.category.create({ data: { name: "Accessories", description: "Chargers, cables, cases" } });
  
  console.log("✅ Categories created");

  // Create Products
  const products = [];
  products.push(
    await prisma.product.create({
      data: {
        categoryId: catPhones.id,
        productCode: "PRD-iPhone13-Scr",
        name: "iPhone 13 Screen Replacement",
        brand: "Apple",
        purchasePrice: 80.0,
        sellingPrice: 150.0,
        stockQuantity: 20,
        minimumStock: 5,
        description: "OLED Screen replacement for iPhone 13",
      },
    })
  );
  products.push(
    await prisma.product.create({
      data: {
        categoryId: catPhones.id,
        productCode: "PRD-SamS21-Bat",
        name: "Samsung S21 Battery",
        brand: "Samsung",
        purchasePrice: 20.0,
        sellingPrice: 45.0,
        stockQuantity: 50,
        minimumStock: 10,
        description: "Original OEM Battery for S21",
      },
    })
  );
  products.push(
    await prisma.product.create({
      data: {
        categoryId: catLaptops.id,
        productCode: "PRD-MacPro-SSD",
        name: "MacBook Pro 1TB NVMe",
        brand: "Apple",
        purchasePrice: 120.0,
        sellingPrice: 200.0,
        stockQuantity: 10,
        minimumStock: 2,
        description: "1TB SSD upgrade",
      },
    })
  );
  console.log("✅ Products created");

  // Create Repair Jobs
  const statuses = ["PENDING", "IN_PROGRESS", "WAITING_FOR_PARTS", "COMPLETED", "DELIVERED", "CANCELLED"];
  const repairJobs = [];
  
  for (let i = 1; i <= 20; i++) {
    const status = statuses[i % statuses.length];
    const customer = customers[i % customers.length];
    const tech = i % 2 === 0 ? techUser1 : techUser2;
    
    const job = await prisma.repairJob.create({
      data: {
        customerId: customer.id,
        technicianId: tech.id,
        jobNumber: `REP-${2024000 + i}`,
        deviceType: i % 2 === 0 ? "Smartphone" : "Laptop",
        brand: i % 2 === 0 ? "Apple" : "Dell",
        model: i % 2 === 0 ? "iPhone 13" : "XPS 15",
        serialNumber: `SN-${10000 + i}`,
        problemDescription: i % 3 === 0 ? "Broken Screen" : "Battery Draining Fast",
        deviceCondition: "Scratches on back",
        estimatedCost: 150.0 + (i * 10),
        advanceAmount: status !== "PENDING" ? 50.0 : 0,
        status: status,
        receivedDate: new Date(new Date().setDate(new Date().getDate() - (i % 10))), // Past 10 days
        expectedDeliveryDate: new Date(new Date().setDate(new Date().getDate() + 2)),
        deliveredDate: status === "DELIVERED" ? new Date() : null,
      },
    });
    repairJobs.push(job);

    // Create status history
    await prisma.repairStatusHistory.create({
      data: {
        repairJobId: job.id,
        oldStatus: "CREATED",
        newStatus: "PENDING",
        changedBy: adminUser.id,
        notes: "Job registered",
      }
    });

    if (status !== "PENDING") {
      await prisma.repairStatusHistory.create({
        data: {
          repairJobId: job.id,
          oldStatus: "PENDING",
          newStatus: status,
          changedBy: tech.id,
          notes: `Status updated to ${status}`,
        }
      });
    }
  }
  console.log("✅ Repair Jobs created");

  // Create Invoices & Payments for delivered jobs
  const deliveredJobs = repairJobs.filter(job => job.status === "DELIVERED");
  for (const job of deliveredJobs) {
    const subtotal = Number(job.estimatedCost) || 150;
    const tax = subtotal * 0.1; // 10%
    const grandTotal = subtotal + tax;

    const invoice = await prisma.invoice.create({
      data: {
        customerId: job.customerId,
        repairJobId: job.id,
        invoiceNumber: `INV-${job.jobNumber.split('-')[1]}`,
        subtotal: subtotal,
        discount: 0,
        tax: tax,
        grandTotal: grandTotal,
        paidAmount: grandTotal,
        pendingAmount: 0,
        paymentStatus: "PAID",
        invoiceDate: new Date(),
        createdBy: adminUser.id,
        items: {
          create: [
            {
              itemName: "Repair Service Charge",
              itemType: "SERVICE",
              quantity: 1,
              unitPrice: subtotal * 0.5,
              totalPrice: subtotal * 0.5,
            },
            {
              productId: products[0].id,
              itemName: products[0].name,
              itemType: "PRODUCT",
              quantity: 1,
              unitPrice: subtotal * 0.5,
              totalPrice: subtotal * 0.5,
            }
          ]
        }
      }
    });

    await prisma.payment.create({
      data: {
        invoiceId: invoice.id,
        paymentMethod: "CASH",
        paymentAmount: grandTotal,
        paymentDate: new Date(),
        referenceNumber: `REC-${invoice.invoiceNumber}`,
        createdBy: adminUser.id,
      }
    });
  }
  console.log("✅ Invoices and Payments created");

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
