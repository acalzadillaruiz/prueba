import { defineRouting } from "next-intl/routing";

// alternateLinks: false: next-intl's automatic `Link: …; hreflang` header is built from the request host (the bind
// address / temporary domain behind the proxy) and points x-default at the unprefixed path, which only redirects.
// Every page already declares es/en/x-default hreflang in its metadata from APP_URL (lib/seo.ts alternates()), so the
// header was redundant and contradictory.
export const routing = defineRouting({ locales: ["es", "en"], defaultLocale: "es", localePrefix: "always", alternateLinks: false });
