# New Place v1 — plan y progreso

Rama: `claude/new-place-pwa-estimate-knqqgn`. Reactivador horario: trigger `trig_0123f1FTV1KK75c3pstxqyQA` (borrar al terminar).
Stack: Next.js 15 · Prisma + PostgreSQL 16 · Auth.js v5 · Zod · TanStack Query · Serwist · next-intl · Vitest · Playwright.

## Fases
- [x] F1 DB: packages/db (Prisma schema §8), Postgres local (scripts/db-local.sh), docker-compose, seed VE desde mock
- [~] F2 Auth (backend listo; falta UI login/registro): Auth.js v5 (Google + Credentials bcrypt + DEMO_AUTH), middleware /agency /platform, registro, "¿Eres agencia?"
- [x] F3 API /api/v1: listings (filtros, bbox, polígono, cursor), leads, tours/slots, saved, saved-searches, alerts→email_outbox, threads/messages, offers, capture, media, commissions, fx, agencies, users, moderation, ai, uploads (StorageProvider)
- [ ] F4 UI conectada a datos reales (server components + TanStack Query), quitar localStorage demo
- [x] F5 IA: OpenAICompatibleProvider + switch persistido + fallback
- [ ] F6 Mapas: Google Maps (@vis.gl) con clusters, polígono, Places; fallback ilustrado sin key
- [ ] F7 PWA Serwist + offline home/saved; i18n next-intl (routing/mensajes)
- [ ] F8 Calidad: RBAC duro, Zod en forms, errores i18n, ESLint/Prettier, dark mode público
- [ ] F9 Tests: Vitest (estimate, filtros, RBAC) + Playwright (criterios §15)
- [ ] F10 Docs, capturas y vídeos actualizados, galería
