/**
 * packages/db/index.ts  (Shared Prisma Client — Singleton)
 *
 * This file exports a single shared instance of the Prisma Client that is
 * used by ALL apps in the monorepo (user-app, merchant-app, bank-webhook).
 * It is the entry point for the "@repo/db/client" import alias.
 *
 * ─── The Singleton Pattern ────────────────────────────────────────────────────
 *
 * Problem: In development, Next.js uses Hot Module Replacement (HMR), which
 * re-evaluates module files on every code change. Without the singleton pattern,
 * each re-evaluation would create a NEW PrismaClient instance, eventually
 * exhausting the PostgreSQL connection pool limit.
 *
 * Solution:
 *  1. `prismaClientSingleton` is a factory function that creates a PrismaClient.
 *  2. In development, the instance is stored on `globalThis.prismaGlobal`.
 *     `globalThis` is not reset by HMR, so the same client is reused across
 *     hot reloads.
 *  3. In production, `globalThis.prismaGlobal` is never set, so a fresh client
 *     is created once per process. There is no HMR in production, so no
 *     connection pool leak risk.
 *  4. The client is exported as the default export and also re-exported as
 *     `prisma` for named import support.
 *
 * ─── Re-exports ───────────────────────────────────────────────────────────────
 * `export * from '@prisma/client'` re-exports all generated Prisma types
 * (e.g. User, Balance, OnRampTransaction, P2pTransfer, OnRampStatus, AuthType)
 * so that apps can import types from "@repo/db/client" rather than from
 * "@prisma/client" directly. This keeps imports clean and centralised.
 */
import { PrismaClient } from '@prisma/client'

/**
 * Factory function that creates a new PrismaClient instance.
 * Defined as a function so TypeScript can infer its return type for globalThis.
 */
const prismaClientSingleton = () => {
  return new PrismaClient()
}

/**
 * Augment the global NodeJS namespace so TypeScript knows that
 * `globalThis.prismaGlobal` can hold a PrismaClient instance.
 * `undefined` is included because it is not set in production.
 */
declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>
}

/**
 * The shared PrismaClient instance.
 *
 * Logic:
 *  - In development: reuse the existing client stored on globalThis (if any),
 *    otherwise create a new one. This prevents connection pool exhaustion during HMR.
 *  - In production: always create a fresh client (globalThis.prismaGlobal is undefined).
 */
const prisma: ReturnType<typeof prismaClientSingleton> = globalThis.prismaGlobal ?? prismaClientSingleton()

// Default export — used as `import prisma from "@repo/db/client"`
export default prisma

// In development only: store the client on globalThis so HMR doesn't create duplicates.
// This line is intentionally excluded in production builds.
if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma

// Re-export all generated Prisma types so consumers can import them from "@repo/db/client"
// e.g. import type { User, Balance, OnRampStatus } from "@repo/db/client"
export * from '@prisma/client'
