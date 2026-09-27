import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@newplace/db";
import type { Role } from "@newplace/config";
import { authConfig } from "./auth.config";
import { hit, reset } from "./server/rate-limit";

const DEMO = process.env.DEMO_AUTH === "true";

async function profile(userId: string) {
  const u = await prisma.user.findUnique({ where: { id: userId }, include: { memberships: { orderBy: { createdAt: "asc" }, take: 1 } } });
  if (!u || u.suspended) return null;
  await prisma.user.update({ where: { id: u.id }, data: { lastSeenAt: new Date() } });
  const m = u.memberships[0];
  return { id: u.id, name: u.name, email: u.email, image: u.image, role: (m?.role ?? u.role) as Role, agencyId: m?.agencyId ?? null, hue: u.hue };
}

const creds = z.object({ email: z.string().email(), password: z.string().min(8) });

export const { handlers, auth, signIn, signOut, unstable_update } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    ...(process.env.AUTH_GOOGLE_ID ? [Google({ allowDangerousEmailAccountLinking: true })] : []),
    Credentials({
      id: "credentials",
      name: "Email",
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const p = creds.safeParse(raw);
        if (!p.success) return null;
        const email = p.data.email.toLowerCase();
        // Brute-force protection: max 10 failed attempts per account every 15 minutes.
        const key = `login-fail:${email}`;
        const blocked = await prisma.rateLimit.findUnique({ where: { key } });
        if (blocked && blocked.resetAt > new Date() && blocked.count >= 10) return null;
        const u = await prisma.user.findUnique({ where: { email } });
        if (!u?.passwordHash || !(await bcrypt.compare(p.data.password, u.passwordHash))) {
          await hit(key, 10, 15 * 60);
          return null;
        }
        await reset(key);
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
              const email = String((raw as { email?: string })?.email ?? "").toLowerCase();
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
      return authConfig.callbacks.jwt(params);
    },
  },
});
