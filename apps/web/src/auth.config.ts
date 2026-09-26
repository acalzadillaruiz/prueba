import type { NextAuthConfig } from "next-auth";
import type { Role } from "@newplace/config";

/** Edge-safe part of the Auth.js config (used by middleware). Providers live in auth.ts. */
export const authConfig = {
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/es/login" },
  providers: [],
  callbacks: {
    jwt({ token, user, trigger, session }) {
      if (user) {
        const u = user as { id: string; role?: Role; agencyId?: string | null; hue?: number };
        token.uid = u.id;
        token.role = u.role ?? "SEEKER";
        token.agencyId = u.agencyId ?? null;
        token.hue = u.hue ?? 200;
      }
      if (trigger === "update" && session?.agencyId !== undefined) {
        token.agencyId = session.agencyId;
        if (session.role) token.role = session.role;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.uid as string;
      session.user.role = (token.role as Role) ?? "SEEKER";
      session.user.agencyId = (token.agencyId as string | null) ?? null;
      session.user.hue = (token.hue as number) ?? 200;
      return session;
    },
  },
} satisfies NextAuthConfig;
