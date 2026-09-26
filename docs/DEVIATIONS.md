# Diferencias del prototipo respecto al brief v1

Este entregable es el **prototipo visual navegable** que se pidió antes de aprobar el desarrollo. Brechas conocidas, todas previstas para v1:

| Brief | Prototipo | Motivo |
|---|---|---|
| Fotos (Unsplash u otras) | Ilustraciones SVG propias en la paleta de marca | La red del entorno bloquea CDNs de imágenes (images.unsplash.com, etc.). |
| Google Maps JS + Places + Drawing | Mapa SVG ilustrado con clusters, polígono y radio; autocompletado simulado | Sin `NEXT_PUBLIC_GOOGLE_MAPS_KEY` y teselas bloqueadas. El brief exige no romper sin key: es exactamente ese modo. |
| Prisma + PostgreSQL + API `/api/v1` | Datos mock en memoria + `localStorage` | Solo vistas en esta fase. |
| Auth.js (Google + Credentials) | Solo `DEMO_AUTH` («Entrar como…») y formularios visuales | Ídem. |
| `OpenAICompatibleProvider` | Solo selector visual; se usa `HeuristicProvider` real | Sin key. |
| next-intl | Helper `tx(locale, es, en)` con rutas `/[locale]` | Más rápido para el prototipo; v1 migra a catálogos next-intl. |
| `next/font/google` | `@fontsource/outfit` + `@fontsource/source-sans-3` (mismas fuentes, autoalojadas) | Build sin depender de Google Fonts. |
| Serwist | Service worker manual equivalente (`public/sw.js`) | Menos dependencias en el prototipo. |
| shadcn/ui | Componentes propios con el mismo estilo (radius 14, tokens) | CLI de shadcn requiere red externa. |
| Capacitor | Fuera de alcance (fase 2 acordada) | — |
| Modo oscuro público | No implementado (admin siempre dark) | Pendiente para v1. |
| Playwright smoke | Scripts de captura y vídeo recorren los flujos; sin aserciones formales | v1 añade specs. |
