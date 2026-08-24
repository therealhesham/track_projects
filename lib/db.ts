import { PrismaClient } from "@prisma/client";

// Next's dev server re-evaluates modules on every hot reload. Without this
// cache each reload would open a fresh pool and the connection count would
// climb until MySQL refuses new ones.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
