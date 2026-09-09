import prisma from '../src/config/prisma.config';

async function listUsers() {
  try {
    const users = await prisma.user.findMany({
      include: { role: true }
    });

    console.log('\n📋 Users in Database:\n');
    console.table(users);

    // Look for monitor-related users
    const monitorUsers = users.filter(u => u.email?.toLowerCase().includes('monitor') || u.role.name === 'MONITOR');
    console.log('\n🔍 Monitor-related Users:');
    console.table(monitorUsers);

  } catch (error) {
    console.error('Error fetching users:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

listUsers();
