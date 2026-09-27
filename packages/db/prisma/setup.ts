/**
 * Deploy-time setup: apply migrations and seed only when the database is empty.
 * Safe to run on every build (never wipes existing data). Run from the repo root: npm run db:setup
 */
import { execSync } from "node:child_process";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";

async function main() {
  const root = process.cwd();
  const db = join(root, "packages/db");
  // Versioned migrations (prisma/migrations). A database created earlier with `db push` has tables but no
  // migration history: mark the baseline as applied once, then deploy the rest.
  try {
    execSync("npx prisma migrate deploy", { cwd: db, stdio: "pipe" });
  } catch (e) {
    const out = String((e as { stdout?: Buffer; stderr?: Buffer }).stderr ?? "") + String((e as { stdout?: Buffer }).stdout ?? "");
    if (!out.includes("P3005")) throw e;
    console.log("Existing schema without migration history → baselining 0001_init");
    execSync("npx prisma migrate resolve --applied 0001_init", { cwd: db, stdio: "inherit" });
    execSync("npx prisma migrate deploy", { cwd: db, stdio: "inherit" });
  }
  const prisma = new PrismaClient();
  const users = await prisma.user.count();
  await prisma.$disconnect();
  if (users === 0) {
    console.log("Empty database → seeding Venezuela demo data");
    execSync("npm run db:seed", { cwd: root, stdio: "inherit" });
  } else {
    console.log(`Database already has ${users} users → seed skipped`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
