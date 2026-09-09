import bcrypt from 'bcrypt';
import prisma from '../src/config/prisma.config';

async function createMonitorAccount() {
  try {
    const email = 'monitor@electrofix.com';
    const password = 'Monitor@123';
    const fullName = 'Monitor';
    const phoneNumber = '9999999999';

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      console.log(`✅ User ${email} already exists!`);
      console.log(`ID: ${existingUser.id}`);
      return;
    }

    // Find or create MONITOR role
    let monitorRole = await prisma.role.findUnique({
      where: { name: 'MONITOR' }
    });

    if (!monitorRole) {
      monitorRole = await prisma.role.create({
        data: { name: 'MONITOR' }
      });
      console.log('✅ Created MONITOR role');
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the user
    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        fullName,
        phoneNumber,
        roleId: monitorRole.id,
        isActive: true,
        operationalStatus: 'Active'
      },
      include: { role: true }
    });

    console.log('\n✅ Monitor account created successfully!\n');
    console.log('Account Details:');
    console.log(`Email: ${newUser.email}`);
    console.log(`Name: ${newUser.fullName}`);
    console.log(`Password: ${password}`);
    console.log(`Role: ${newUser.role.name}`);
    console.log(`User ID: ${newUser.id}`);

  } catch (error) {
    console.error('Error creating monitor account:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createMonitorAccount();
