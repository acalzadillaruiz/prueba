import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@newplace/db";
import type { Role } from "@newplace/config";
import { authConfig } from "./auth.config";
import { isDemoEmail } from "./lib/demo";
import { allowed, loginAttempt, reset } from "./server/rate-limit";

const DEMO = process.env.DEMO_AUTH === "true";

async function profile(userId: string) {
  const u = await prisma.user.findUnique({ where: { id: userId }, include: { memberships: { orderBy: { createdAt: "asc" }, take: 1 } } });
  if (!u || u.suspended) return null;
  await prisma.user.update({ where: { id: u.id }, data: { lastSeenAt: new Date() } });
  const m = u.memberships[0];
  return { id: u.id, name: u.name, email: u.email, image: u.image, role: (m?.role ?? u.role) as Role, agencyId: m?.agencyId ?? null, hue: u.hue };
}

const creds = z.object({ email: z.string().email().max(254), password: z.string().min(8).max(200) });

/** An unknown email still pays one bcrypt comparison, so response time does not reveal which accounts exist. */
let dummyHash: Promise<string> | null = null;
const dummy = () => (dummyHash ??= bcrypt.hash(`no-account-${Math.random()}`, 10));

export const { handlers, auth, signIn, signOut, unstable_update } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    // No automatic linking by email: sign-up never verifies the address, so linking would let whoever registered
    // victim@gmail.com with a password first take over the victim's later Google sign-in (account pre-hijacking).
    ...(process.env.AUTH_GOOGLE_ID ? [Google] : []),
    Credentials({
      id: "credentials",
      name: "Email",
      credentials: { email: {}, password: {} },
      async authorize(raw, request) {
        const p = creds.safeParse(raw);
        if (!p.success) return null;
        const email = p.data.email.toLowerCase();
        // Password spraying (one password against many accounts): max 50 attempts per IP every 15 minutes.
        if (!(await allowed(request, "login-ip", 50, 15 * 60))) return null;
        // Brute-force protection per account+IP (10) with a global per-account ceiling (50), see loginAttempt().
        const attempt = await loginAttempt(request, email);
        if (!attempt.ok) return null;
        const u = await prisma.user.findUnique({ where: { email } });
        const valid = await bcrypt.compare(p.data.password, u?.passwordHash ?? (await dummy()));
        if (!u?.passwordHash || !valid) return null;
        await Promise.all(attempt.keys.map(reset));
        return profile(u.id);
      },
    }),
    ...(DEMO
      ? [
          Credentials({
            id: "demo",
            name: "Demo",
            credentials: { email: {} },
            async authorize(raw) {
              const email = String((raw as { email?: string })?.email ?? "").trim().toLowerCase();
              // Password-less login only for the fixed seeded demo accounts, never for arbitrary/registered users.
              if (!isDemoEmail(email)) return null;
              const u = await prisma.user.findUnique({ where: { email } });
              return u ? profile(u.id) : null;
            },
          }),
        ]
      : []),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt(params) {
      // Google sign-in: enrich with role/agency from DB (new users default to SEEKER via schema).
      if (params.user && params.account?.provider === "google") {
        const p = await profile(params.user.id as string);
        if (p) params.user = p;
      }
      // A server-side session refresh (e.g. after joining an agency) re-reads role/agency from the DB.
      // Superadmins keep the edge path: their update() switches the impersonated tenant.
      if (params.trigger === "update" && params.token.uid && params.token.role !== "SUPERADMIN") {
        const p = await profile(params.token.uid as string);
        if (p) {
          params.token.role = p.role;
          params.token.agencyId = p.agencyId;
        }
        return params.token;
      }
      return authConfig.callbacks.jwt(params);
    },
  },
});
