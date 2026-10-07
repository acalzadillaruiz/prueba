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
  // Preview-only escape hatch: RESEED_DEMO=1 reloads the demo data on an existing database (it WIPES it), so new
  // demo zones/listings reach a deployed preview. Refused unless the site is in demo mode, so real data is never lost.
  const reseed = process.env.RESEED_DEMO === "1" && process.env.DEMO_AUTH === "true";
  if (process.env.RESEED_DEMO === "1" && !reseed) console.log("RESEED_DEMO ignored: only allowed while DEMO_AUTH=true");
  if (users === 0 || reseed) {
    console.log(users === 0 ? "Empty database → seeding Venezuela demo data" : "RESEED_DEMO=1 → reloading Venezuela demo data");
    execSync("npm run db:seed", { cwd: root, stdio: "inherit" });
  } else {
    console.log(`Database already has ${users} users → seed skipped`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
