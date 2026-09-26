# New Place — Un nuevo lugar. / Real estate. Redefined.

**ES** · Prototipo navegable de la PWA de New Place: marketplace inmobiliario, sistema operativo de agencias y consola SaaS. Datos 100 % ficticios (Venezuela), marca «Caracas Night».

**EN** · Clickable prototype of the New Place PWA: real-estate marketplace, agency OS and SaaS console. 100 % fictional data (Venezuela), “Caracas Night” brand.

## Ver sin instalar / See without installing
- `captures/` — 52 capturas (45 escritorio + 7 móvil) · `captures/index.json` las describe.
- `videos/new-place-cliente.mp4`, `videos/new-place-admin.mp4`, `videos/new-place-propietario.mp4` — recorridos narrados.

## 10 minutos a localhost:3000 / 10 minutes to localhost:3000
```bash
npm install
npm run dev            # http://localhost:3000/es
```
Producción / Production:
```bash
npm run build && npm start
```
No necesita base de datos, claves de Google ni de IA: el prototipo usa datos mock, mapa ilustrado y el proveedor de IA local (`HeuristicProvider`). Usa el botón **Demo** (abajo a la izquierda) para «Entrar como…» cualquier rol.

No database, Google or AI keys needed: mock data, illustrated map and the local AI provider. Use the **Demo** pill (bottom-left) to “Sign in as…” any role.

## Scripts
| | |
|---|---|
| `npm run dev` | Next.js dev server (port 3000) |
| `npm test` | Vitest — dominio IA (estimate, NL parser, lead score) |
| `BASE=http://localhost:3001 node scripts/capture.mjs` | Regenera las capturas |
| `BASE=http://localhost:3001 node scripts/video.mjs cliente\|admin\|propietario` | Regenera los vídeos |

## Estructura
```
apps/web          Next.js 15 App Router + TS + Tailwind (todas las vistas)
packages/ai       AIProvider + HeuristicProvider (estimate, searchParse, writeListing, leadScore)
packages/config   Tokens Caracas Night + matriz RBAC
docs/             ARCHITECTURE, RUNBOOK, DECISIONS, DEVIATIONS
```
Ver `docs/` para arquitectura, decisiones y diferencias entre este prototipo y la v1 completa.
