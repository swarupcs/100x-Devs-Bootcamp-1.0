/**
 * packages/db/prisma/seed.ts  (Database Seed Script)
 *
 * Populates the database with initial test data for local development.
 * Run with: `pnpm prisma db seed`   (configured in package.json prisma.seed)
 *
 * What it creates:
 *  - Alice (phone: 1111111111, password: "alice", balance: ₹200 = 20000 paise)
 *  - Bob   (phone: 2222222222, password: "bob",   balance: ₹0 = 0 paise)
 *
 * Both users are created with `upsert` (create OR update):
 *  - If the user already exists (by phone number) → keep their existing data (update: {})
 *  - If they don't exist → create them fresh
 * This makes the seed script idempotent — safe to run multiple times without
 * creating duplicate records.
 *
 * Passwords are hashed with bcrypt (cost factor 10) before storage, matching
 * the same hashing used in the production auth flow (lib/auth.ts).
 *
 * Balance amounts:
 *  - Stored in paise (integer). 20000 paise = ₹200.
 *  - locked: 0 means no pending transactions for these seed users.
 *
 * These accounts are useful for manual testing of:
 *  - Sign-in with phone + password
 *  - P2P transfers (Alice → Bob or Bob → Alice)
 *  - OnRamp balance display
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

// Create a local Prisma client just for the seed script.
// (Not using the shared singleton from index.ts to keep the seed script standalone.)
const prisma = new PrismaClient();

/**
 * main — the seed function that creates test users and their balances.
 */
async function main() {
  // ── Alice ────────────────────────────────────────────────────────────────

  // Hash Alice's password ("alice") with bcrypt before storing
  const hashed = await bcrypt.hash("alice", 10);

  // Upsert Alice: create her if not found, skip update if she already exists
  const user = await prisma.user.upsert({
    where: { number: "1111111111" },  // look up by phone number
    update: {},                        // do nothing if she already exists
    create: { number: "1111111111", password: hashed, name: "Alice" },
  });

  // Upsert Alice's Balance: ₹200 (20000 paise) available, 0 locked
  await prisma.balance.upsert({
    where: { userId: user.id },
    update: {},                                                 // don't reset balance on re-seed
    create: { userId: user.id, amount: 20000, locked: 0 },   // 20000 paise = ₹200
  });

  // ── Bob ──────────────────────────────────────────────────────────────────

  // Hash Bob's password ("bob") with bcrypt before storing
  const hashed2 = await bcrypt.hash("bob", 10);

  // Upsert Bob: create him if not found, skip update if he already exists
  const user2 = await prisma.user.upsert({
    where: { number: "2222222222" },
    update: {},
    create: { number: "2222222222", password: hashed2, name: "Bob" },
  });

  // Upsert Bob's Balance: ₹0 (empty wallet) so we can observe transfers coming in
  await prisma.balance.upsert({
    where: { userId: user2.id },
    update: {},
    create: { userId: user2.id, amount: 0, locked: 0 },
  });
}

// Run the seed function, then disconnect the Prisma client regardless of outcome
main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
