const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: 'admin@electrofix.com' }
  });
  console.log(user.id);
  await prisma.$disconnect();
}

main();
