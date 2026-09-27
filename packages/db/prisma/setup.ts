/**
 * Deploy-time setup: sync the schema and seed only when the database is empty.
 * Safe to run on every build (never wipes existing data). Run from the repo root: npm run db:setup
 */
import { execSync } from "node:child_process";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";

async function main() {
  const root = process.cwd();
  execSync("npx prisma db push --skip-generate", { cwd: join(root, "packages/db"), stdio: "inherit" });
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
