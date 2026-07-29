const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Check if an Admin User already exists
  const existingUser = await prisma.user.findFirst();
  
  if (!existingUser) {
    const adminUser = await prisma.user.create({
      data: {
        name: 'Amarildi Riska',
        email: 'admin@riskaflow.com',
        password: 'securepassword123', // We will secure this when we build the Login screen
      }
    });
    console.log(`✅ Admin User successfully created: ${adminUser.email}`);
  } else {
    console.log(`✅ Admin User already exists: ${existingUser.email}`);
  }

  console.log('🌱 Seeding finished.');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });