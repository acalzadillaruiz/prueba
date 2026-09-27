# Diferencias de la v1 respecto al brief

| Brief | v1 | Motivo / cómo completarlo |
|---|---|---|
| Fotos reales / generadas | Ilustraciones SVG deterministas en la paleta de marca; las fotos subidas por usuarios sí se guardan y muestran | La red del entorno de desarrollo bloquea los CDNs de imágenes y generadores. El script `npm run photos -w apps/web` genera fotos IA (Gemini o Pollinations) y el seed las asocia automáticamente. |
| Google Maps JS + Places + Drawing | Implementado (`GoogleMapView`, `PlacesSearch`); sin key se usa el mapa ilustrado y un geocodificador local | Sin `NEXT_PUBLIC_GOOGLE_MAPS_KEY` en este entorno. El brief exige no romper sin key: es exactamente ese modo. |
| next-intl para todos los textos | next-intl gestiona locale, middleware y catálogos (cabecera, pie, menús de admin); el contenido de páginas usa el helper `tx(locale, es, en)` | Migración parcial; los textos siguen siendo bilingües en todas las rutas. Pendiente mover los strings restantes a `messages/*.json`. |
| Sesiones de Auth.js en BD | Sesiones JWT (cuentas y usuarios sí en Postgres vía PrismaAdapter) | Necesario para comprobar roles en el middleware edge. |
| Emails transaccionales | Envío real con Resend (`RESEND_API_KEY`, `EMAIL_FROM`); sin proveedor quedan en `EmailOutbox` como «Simulado» | Configurar Resend con un dominio verificado. |
| Push notifications | `PushProvider` no-op | Web Push / FCM en fase 2 con las apps nativas. |
| Almacenamiento S3 | `local` y Vercel Blob funcionales (Blob se activa solo con `BLOB_READ_WRITE_TOKEN`); `s3` es stub | Implementar con credenciales del cliente. |
| Digest de alertas | Endpoint `POST /api/v1/alerts/run` (Bearer `CRON_SECRET`) | Programar en el hosting (Vercel Cron, etc.). Las alertas instantáneas ya se generan al publicar. |
| `next/font/google` | `@fontsource/outfit` + `@fontsource/source-sans-3` (mismas fuentes, autoalojadas) | Build sin depender de Google Fonts. |
| shadcn/ui | Componentes propios con el mismo estilo (radius 14, tokens) | El CLI de shadcn requiere red externa. |
| Capacitor iOS / Android | Fuera de alcance | Fase 2 acordada. |
| `start_url` del manifest | `/?source=pwa` en lugar de `/es` | La raíz redirige al idioma del dispositivo (cookie / Accept-Language), así la app instalada abre en ES o EN; `source=pwa` permite medir aperturas desde la app instalada. |
