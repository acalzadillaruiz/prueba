import type { Locale } from "@/types/domain";
import { prisma } from "@newplace/db";
import { PlatformUsers } from "@/components/agency/Platform";
import { userToDomain } from "@/server/data";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const rows = await prisma.user.findMany({ include: { memberships: { include: { agency: { select: { name: true } } } }, accounts: { select: { provider: true } } }, orderBy: { createdAt: "asc" } });
  return (
    <PlatformUsers
      locale={locale}
      users={rows.map((u) => ({ ...userToDomain(u), suspended: u.suspended, agencyName: u.memberships[0]?.agency.name }))}
      providers={Object.fromEntries(rows.map((u) => [u.id, [...u.accounts.map((a) => (a.provider === "google" ? "Google" : a.provider)), ...(u.passwordHash ? ["Email"] : [])]]))}
    />
  );
}
