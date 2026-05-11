const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const customers = await prisma.customer.findMany({
    take: 5
  });
  console.log(JSON.stringify(customers, null, 2));
  process.exit(0);
}
main();
