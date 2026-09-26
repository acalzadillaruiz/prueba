import type { Locale } from "@/types/domain";
import { prisma } from "@newplace/db";
import { PublicPage } from "@/components/layout/PublicPage";
import { AccountView } from "@/components/seeker/AccountView";
import { getAppUser } from "@/server/session";

export const dynamic = "force-dynamic";

export default async function Account({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const me = (await getAppUser())!;
  const u = await prisma.user.findUniqueOrThrow({ where: { id: me.id }, include: { accounts: { select: { provider: true } } } });
  return (
    <PublicPage locale={locale}>
      <AccountView
        locale={locale}
        data={{ name: u.name ?? "", email: u.email, phone: u.phone ?? "", budget: u.budget, interests: u.interests ?? "", verified: !!u.emailVerified, initials: me.initials, hue: u.hue, providers: u.accounts.map((a) => a.provider), hasPassword: !!u.passwordHash, locale: (u.locale as "es" | "en") ?? "es" }}
      />
    </PublicPage>
  );
}
