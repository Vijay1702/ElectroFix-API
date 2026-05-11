import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: 'admin@electrofix.com' },
    select: { id: true }
  });
  console.log(user?.id);
  await prisma.$disconnect();
}

main();
