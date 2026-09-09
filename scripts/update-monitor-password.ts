import bcrypt from 'bcrypt';
import prisma from '../src/config/prisma.config';

async function updateMonitorPassword() {
  try {
    const email = 'monitor@electrofix.com';
    const newPassword = 'Monitor@123';

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: true }
    });

    if (!user) {
      console.error(`User with email ${email} not found!`);
      process.exit(1);
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the user
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
      include: { role: true }
    });

    console.log('✅ Password updated successfully!');
    console.log(`Email: ${updated.email}`);
    console.log(`Name: ${updated.fullName}`);
    console.log(`Role: ${updated.role.name}`);
    console.log(`\nNew Password: ${newPassword}`);

  } catch (error) {
    console.error('Error updating password:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

updateMonitorPassword();
