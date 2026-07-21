import { PrismaPg } from '@prisma/adapter-pg';
import argon2 from 'argon2';
import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client.js';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordHash = (await argon2.hash('senha123')) as string;

  const userA = await prisma.user.upsert({
    where: { email: 'alice@example.com' },
    update: {},
    create: { email: 'alice@example.com', passwordHash },
  });

  const userB = await prisma.user.upsert({
    where: { email: 'bob@example.com' },
    update: {},
    create: { email: 'bob@example.com', passwordHash },
  });

  console.log('Usuários criados:', { userA: userA.email, userB: userB.email });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
