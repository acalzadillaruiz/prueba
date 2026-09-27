# New Place — Un nuevo lugar. / Real estate. Redefined.

**ES** · PWA de New Place v1: marketplace inmobiliario, sistema operativo de agencias y consola SaaS. Next.js 15 + PostgreSQL/Prisma + Auth.js, datos seed de Venezuela, marca «Caracas Night». Las apps iOS/Android (Capacitor) quedan para la fase 2.

**EN** · New Place v1 PWA: real-estate marketplace, agency OS and SaaS console. Next.js 15 + PostgreSQL/Prisma + Auth.js, Venezuela seed data, “Caracas Night” brand. Native apps (Capacitor) are phase 2.

## 10 minutos a localhost:3000 / 10 minutes to localhost:3000
```bash
cp .env.example apps/web/.env.local   # rellena AUTH_SECRET (openssl rand -base64 32)
npm install
npm run db:up        # Postgres 16 local (o: docker compose up -d)
npm run db:reset     # prisma db push + seed
npm run dev          # http://localhost:3000/es
```
Contraseña de todos los usuarios seed / password for every seed user: **`NewPlace!2026`**. Con `DEMO_AUTH=true`, `/es/login` muestra «Entrar como…» para cada rol.

| Rol | Email |
|---|---|
| Superadmin | `superadmin@newplace.app` |
| Dueño de agencia | `owner@andesprime.ve` |
| Agente | `agent@andesprime.ve` |
| Backoffice · Captador · Fotógrafo | `sofia@` · `rosa@` · `miguel@andesprime.ve` |
| Propietario particular | `owner.priv@gmail.com` |
| Buscador | `seeker@gmail.com` |

(La lista completa está en `packages/db/prisma/seed-data/people.ts`.)

Sin claves de Google ni de IA la app funciona igual: mapa ilustrado, geocodificador local y `HeuristicProvider`. Con `NEXT_PUBLIC_GOOGLE_MAPS_KEY` usa Google Maps + Places; con `AI_BASE_URL`/`AI_API_KEY` usa cualquier API compatible con OpenAI (Grok, OpenAI, etc.).

## Scripts
| | |
|---|---|
| `npm run dev` / `npm run build && npm start` | Desarrollo / producción |
| `npm run db:reset` | Recrea el esquema y vuelve a sembrar |
| `npm run db:setup` | Crea las tablas y siembra solo si la base está vacía (lo usa el despliegue) |
| `npm test` | Vitest: IA, RBAC, schemas Zod, geo, filtros de búsqueda |
| `npm run e2e` | Playwright (18): los 10 criterios de aceptación §15 + smoke + RBAC + seguridad + reservas simultáneas + invitaciones |
| `npm run lint` · `npm run typecheck -w apps/web` | ESLint · TypeScript |
| `npm run photos -w apps/web` | Genera fotos IA de los listings (requiere `GEMINI_API_KEY` o acceso a Pollinations) |
| `npm run shots` · `node scripts/video.mjs cliente\|admin\|propietario` | Capturas y vídeos (ver RUNBOOK) |

## Estructura
```
apps/web          Next.js 15 App Router: páginas, API REST /api/v1, Auth.js, Serwist, next-intl
packages/db       Prisma schema (§8), cliente y seed Venezuela
packages/ai       AIProvider: HeuristicProvider + OpenAICompatibleProvider
packages/config   Tokens Caracas Night, matriz RBAC, schemas Zod compartidos, catálogos es/en
docs/             DEPLOY (publicar en Vercel) · REVIEW (revisión experta) · ARCHITECTURE · RUNBOOK · DECISIONS · DEVIATIONS · V1_PROGRESS
captures/ videos/ Capturas y recorridos en vídeo
```
