# Arquitectura (v1)

Monorepo con npm workspaces.

## apps/web — Next.js 15 (App Router, React 19, TypeScript strict, Tailwind 3.4)
- **Rutas** `/[locale]/…` (`es` por defecto, `en`). next-intl resuelve el idioma (middleware) y provee los catálogos `packages/config/messages/*.json`.
- **Páginas** = server components que leen de Prisma a través de `src/server/*` (`listings.ts`, `data.ts`, `agency-stats.ts`, `platform.ts`). Las partes interactivas son client components que llaman a la API con TanStack Query (bandeja de leads, hilos y agenda con polling de 15 s).
- **API REST `/api/v1`** — `src/server/api.ts` (`handler`, `body` con Zod, `requireUser`, `requireCan`). Errores `{ error: { code, message } }` con mensaje ES/EN. Recursos: listings (+ fotos, slots, ofertas), leads (+ mensajes, visita), me (guardados, búsquedas, slots), threads, tours, mandates, offers, capture, media, agency (miembros, invitaciones, comisiones, reporte CSV), platform (agencias, usuarios, moderación, FX, settings, impersonación, estimaciones), ai (estimate, search-parse, write-listing, lead-score), fx, alerts/run.
- **Autorización** — middleware (Auth.js edge config) protege `/agency`, `/platform`, `/owner`, `/app`, `/account`, `/saved`, `/alerts`; cada endpoint vuelve a comprobar con `can(role, action)` y la propiedad del recurso (`src/server/access.ts`). Aislamiento multi-tenant por `agencyId`.
- **Auth.js v5** — sesiones JWT + PrismaAdapter. Proveedores: Credentials (bcrypt), Google (si hay `AUTH_GOOGLE_ID`), `demo` (si `DEMO_AUTH=true`). El superadmin puede «entrar como» una agencia (`unstable_update`).
- **Mapas** — `MapView` elige `GoogleMapView` (@vis.gl/react-google-maps, clusters, polígono, radio, estilo night) si hay key; si no, `NightMap` (SVG ilustrado con la misma interfaz). `PlacesSearch`: Google Places o geocodificador local sobre el catálogo `Zone`.
- **Fotos** — `StorageProvider` (`local` en `UPLOAD_DIR`, servido por `/uploads/*`; `s3` stub). Fotos IA opcionales en `public/photos` (script `gen-photos.ts`).
- **PWA** — Serwist (`src/app/sw.ts` → `public/sw.js`): precache del shell, API network-first, página `/[locale]/offline`; manifest + iconos maskable.
- **Formularios** — React Hook Form + los mismos schemas Zod que valida la API (`packages/config/src/schemas.ts`).

## packages/db
Prisma 6 + PostgreSQL 16. Modelos §8: usuarios/cuentas, agencias, miembros, invitaciones, zonas, listings (fotos, historial de precio, snapshots de PlaceEstimate, huella anti-duplicados), leads (+eventos), slots y visitas, guardados, búsquedas guardadas, hilos/mensajes, ofertas, mandatos, captación, trabajos de fotografía, comisiones, FX, outbox de email, auditoría, settings y reportes de moderación. `prisma/seed.ts` siembra Venezuela con fechas relativas a «ahora».

## packages/ai
`AIProvider` con 4 módulos: PlaceEstimate (m² por zona + ajustes + comparables), parser de búsqueda en lenguaje natural, redacción ES/EN y lead score + siguiente acción. `HeuristicProvider` local (siempre disponible) y `OpenAICompatibleProvider` (JSON mode) que cae al heurístico ante cualquier fallo. El superadmin elige proveedor en `/platform/ai`.

## Flujos clave
- Publicación: wizard → `POST /listings` → huella anti-duplicados, calidad, escenas, snapshot de estimación → si lo crea un agente queda en revisión → al activarse notifica búsquedas guardadas que coinciden.
- Lead: ficha → `POST /leads` (con reserva de slot transaccional, 409 si se ocupó) → score IA → bandeja de la agencia con SLA 15 min → email en outbox.
