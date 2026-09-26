# New Place v1 — plan y progreso

Rama: `claude/new-place-pwa-estimate-knqqgn`. Estado: v1 completa (26-09-2026).
Stack: Next.js 15 · Prisma + PostgreSQL 16 · Auth.js v5 · Zod · TanStack Query · Serwist · next-intl · Vitest · Playwright.

## Fases
- [x] F1 DB: packages/db (Prisma schema §8), Postgres local (scripts/db-local.sh), docker-compose, seed VE desde mock
- [x] F2 Auth: Auth.js v5 (Google + Credentials bcrypt + DEMO_AUTH), middleware /agency /platform, registro, "¿Eres agencia?"
- [x] F3 API /api/v1: listings (filtros, bbox, polígono, cursor), leads, tours/slots, saved, saved-searches, alerts→email_outbox, threads/messages, offers, capture, media, commissions, fx, agencies, users, moderation, ai, uploads (StorageProvider)
- [x] F4 UI conectada a datos reales (server components + TanStack Query), quitar localStorage demo
- [x] F5 IA: OpenAICompatibleProvider + switch persistido + fallback
- [x] F6 Mapas: Google Maps (@vis.gl) con clusters, polígono, Places; fallback ilustrado sin key
- [x] F7 PWA Serwist + offline; next-intl (routing, detección, mensajes de chrome)
- [x] F8 Calidad: RBAC duro, Zod compartido en forms y API (RHF), errores i18n, loading/error/not-found, ESLint 0 warnings + Prettier, dark mode público
- [x] F9 Tests: Playwright 15/15 (criterios §15 + smoke + RBAC) · Vitest 15 (IA, RBAC, schemas, geo, filtros)
- [x] F10 Docs v1 (README, ARCHITECTURE, RUNBOOK, DECISIONS, DEVIATIONS, .env.example), capturas y vídeos regrabados sobre la app real, galería actualizada
