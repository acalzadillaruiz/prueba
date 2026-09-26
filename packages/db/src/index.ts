import { PrismaClient } from "@prisma/client";

const g = globalThis as unknown as { __np_prisma?: PrismaClient };

export const prisma = g.__np_prisma ?? new PrismaClient({ log: process.env.PRISMA_LOG ? ["query", "error"] : ["error"] });
if (process.env.NODE_ENV !== "production") g.__np_prisma = prisma;

export * from "@prisma/client";
