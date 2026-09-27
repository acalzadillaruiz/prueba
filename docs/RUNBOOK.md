# Runbook

## Arranque
```bash
node -v                 # 20+ (probado con 22)
cp .env.example apps/web/.env.local && $EDITOR apps/web/.env.local   # AUTH_SECRET; para la demo: DEMO_AUTH=true y NEXT_PUBLIC_DEMO_AUTH=true
npm install
npm run db:up           # Postgres local (scripts/db-local.sh) · alternativa: docker compose up -d
npm run db:reset        # prisma migrate deploy + seed (borra y recrea todos los datos)
npm run dev             # http://localhost:3000/es
```
Producción: `npm run build && npm start` (Serwist genera `public/sw.js` en el build).

## Usuarios
Todos con contraseña `NewPlace!2026`. Con `DEMO_AUTH=true` y `NEXT_PUBLIC_DEMO_AUTH=true` (en `.env.example` vienen en `false`) el login muestra «Entrar como…»; `npm run e2e`, `scripts/capture.mjs` y `scripts/video.mjs` lo necesitan. **Desactivar `DEMO_AUTH` en producción.**

## Tareas habituales
- Volver al estado inicial: `npm run db:seed` (los tests E2E crean datos).
- Tests: `npm test` (Vitest) · `npm run e2e` (Playwright; arranca `next dev` si no hay servidor en 3000).
- Lint/tipos: `npm run lint` · `npm run typecheck -w apps/web`.
- Digest de alertas: `curl -X POST -H "Authorization: Bearer $CRON_SECRET" $APP_URL/api/v1/alerts/run`.
- Cambiar proveedor de IA: `/es/platform/ai` (superadmin) o variables `AI_*`.
- Fotos IA: `GEMINI_API_KEY=… npm run photos -w apps/web` y luego `npm run db:seed`.

## Capturas y vídeos
```bash
cd apps/web && NEXT_DIST=.next-prod npx next build && NEXT_DIST=.next-prod npx next start -p 3001 &
cd ../.. && npm run db:seed
BASE=http://localhost:3001 node scripts/capture.mjs
BASE=http://localhost:3001 node scripts/video.mjs cliente   # admin | propietario
```
