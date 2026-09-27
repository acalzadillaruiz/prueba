import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: [
      { find: "@", replacement: fileURLToPath(new URL("./src", import.meta.url)) },
      { find: "server-only", replacement: fileURLToPath(new URL("./test/empty.ts", import.meta.url)) },
      // next has no "exports" map: ESM imports of next/server need the explicit file (used by next-auth)
      { find: /^next\/server$/, replacement: "next/server.js" },
    ],
  },
  test: {
    include: ["test/**/*.test.ts"],
    environment: "node",
    // Domain/authorization tests run against the seeded database (CI: `npm run db:setup` before tests).
    env: { DATABASE_URL: process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/newplace" },
    fileParallelism: false,
    server: { deps: { inline: ["next-auth", "@auth/core"] } },
  },
});
