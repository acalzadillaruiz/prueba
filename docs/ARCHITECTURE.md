# Arquitectura

## Prototipo (esta rama)
- **apps/web** — Next.js 15 App Router, TypeScript strict, Tailwind 3.4 con los tokens CSS de §1 (`--np-*`).
  - Rutas `/[locale]/…` (`es` por defecto, `en`), 28 pantallas × 2 idiomas, prerenderizadas (SSG).
  - Server components para páginas; "client islands" para mapa, galería, formularios, bandeja.
  - `src/mock/` — seed VE: 48 listings, 3 agencias, 16 usuarios, 12 leads, 8 visitas, captación, fotografía, ofertas, FX, outbox.
  - `src/lib/store.tsx` — estado demo en `localStorage` (sesión «Entrar como…», guardados, comparador, leads creados, takedowns, proveedor IA). Sustituye a la API en el prototipo.
  - `src/components/map/NightMap.tsx` — mapa SVG ilustrado de Caracas / Venezuela (clusters, pines con precio, polígono, radio, estilo night/claro). En v1 lo reemplaza Google Maps con la misma interfaz de props.
  - `src/components/art/PropertyArt.tsx` — ilustraciones deterministas usadas como fotos.
- **packages/ai** — `AIProvider` y `HeuristicProvider` reales (los usa la UI): PlaceEstimate (m² × zona + ajustes + comparables), parser NL, redacción ES/EN, lead score + nextAction.
- **packages/config** — tokens y matriz RBAC (`can(role, action)`).
- **PWA** — `public/manifest.webmanifest`, iconos 192/512/maskable, `public/sw.js` (app-shell cache-first, API network-first, offline home + guardados).

## v1 (tras aprobación)
Se mantiene la UI y se sustituye la capa de datos: Prisma + PostgreSQL (`packages/db`), Auth.js v5 (Google + Credentials + DEMO_AUTH), API REST `/api/v1`, Google Maps JS + Places + Drawing, `OpenAICompatibleProvider`, Serwist, next-intl, Playwright smoke.
