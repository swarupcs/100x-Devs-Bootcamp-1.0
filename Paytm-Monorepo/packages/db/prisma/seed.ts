import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const hashed = await bcrypt.hash("alice", 10);
  const user = await prisma.user.upsert({
    where: { number: "1111111111" },
    update: {},
    create: { number: "1111111111", password: hashed, name: "Alice" },
  });

  await prisma.balance.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id, amount: 20000, locked: 0 },
  });

  const hashed2 = await bcrypt.hash("bob", 10);
  const user2 = await prisma.user.upsert({
    where: { number: "2222222222" },
    update: {},
    create: { number: "2222222222", password: hashed2, name: "Bob" },
  });

  await prisma.balance.upsert({
    where: { userId: user2.id },
    update: {},
    create: { userId: user2.id, amount: 0, locked: 0 },
  });
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
