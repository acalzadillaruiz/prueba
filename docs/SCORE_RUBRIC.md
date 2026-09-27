# Rúbrica de evaluación imparcial (fija: se usa igual en la nota inicial y en la final)

Total 100 puntos. El juez NO corrige nada: solo mide, con evidencia (URL, comando, valor medido, archivo:línea).
Cada área parte de su máximo y resta por defecto encontrado según su gravedad:
crítico −40 % del área · alto −15 % · medio −5 % · bajo −1 % (mínimo 0 por área).

| # | Área | Puntos | Qué se mide |
|---|------|--------|-------------|
| 1 | Funcionalidad vs brief | 25 | Todos los flujos del brief (`NEW_PLACE_GROK_BOT_PROMPT.md` si existe, o README/docs) funcionan de verdad en el navegador: buscador/mapa/filtros/IA, ficha y PlaceEstimate, pedir visita, cuenta/guardados/comparador/alertas/Hub, propietario FSBO y encargo, agencia (panel, leads, inmuebles, calendario, equipo, informes, captación, fotografía, ajustes), superadmin (métricas, agencias, usuarios, moderación, IA/FX). Función ausente o rota = defecto. |
| 2 | Seguridad | 15 | Autenticación, autorización por rol y por tenant en cada endpoint, IDOR, asignación masiva, subida de archivos, XSS/CSRF/open redirect, rate limiting, cabeceras, fuga de datos. |
| 3 | PWA | 10 | Instalabilidad (Chrome `Page.getInstallabilityErrors`), manifest, service worker, offline real (servidor inaccesible), caché sin datos privados, flujo de actualización. |
| 4 | Rendimiento | 10 | Lighthouse móvil (Performance) en /es, /es/search?type=SALE, una ficha y /es/luxury: nota = media/10. Descontar además TBT > 600 ms o JS inicial > 250 KB gzip en alguna ruta pública (medio). |
| 5 | Accesibilidad | 10 | Lighthouse Accessibility (media de las 4 rutas)/10, menos defectos manuales (teclado, foco, contraste, nombres accesibles, áreas táctiles). |
| 6 | SEO | 5 | Lighthouse SEO (media)/20, más: títulos/descripciones por página, canonical/hreflang, robots, sitemap, 404 reales, OG. |
| 7 | UX/UI e i18n | 10 | Coherencia visual, móvil 390 px sin desbordes, estados vacíos/carga/error, mensajes de error útiles, ES/EN completo, formatos de números/fechas. |
| 8 | Calidad de código y pruebas | 10 | tsc sin errores, ESLint limpio, Vitest y Playwright en verde, cobertura de flujos críticos, código sin duplicación grave. |
| 9 | Preparación para producción | 5 | Guía de despliegue funcional, migraciones de BD, dependencias sin vulnerabilidades altas, observabilidad (errores), emails, variables de entorno documentadas. |

Salida obligatoria del juez: tabla con nota por área (con decimales), total /100, y lista de defectos con gravedad, evidencia y archivo:línea.
