# Nota imparcial (rúbrica fija: docs/SCORE_RUBRIC.md)

## Nota inicial — 27 sept. 2026 (build previa a la ronda de optimización)

| # | Área | Máx | Nota |
|---|---|---|---|
| 1 | Funcionalidad vs brief | 25 | 14,25 |
| 2 | Seguridad | 15 | 8,10 |
| 3 | PWA | 10 | 9,40 |
| 4 | Rendimiento (Lighthouse móvil 87 / 83 / 87 / 81) | 10 | 8,45 |
| 5 | Accesibilidad (Lighthouse 90 / 100 / 96 / 100) | 10 | 9,45 |
| 6 | SEO (Lighthouse 92 / 100 / 92 / 92) | 5 | 4,45 |
| 7 | UX/UI e i18n | 10 | 8,80 |
| 8 | Calidad de código y pruebas | 10 | 9,20 |
| 9 | Preparación para producción | 5 | 3,65 |
| | **Total** | **100** | **75,75** |

Defectos que la bajaron: 2 altos (publicar a nombre de una agencia sin aprobación; dependencias vulnerables), ~20 medios y ~40 bajos. Detalle y estado de cada uno en las secciones siguientes y en el historial de commits.

## Nota tras la ronda de correcciones — 27 sept. 2026 (mismo juez, misma rúbrica)

| # | Área | Máx | Inicial | Final |
|---|---|---|---|---|
| 1 | Funcionalidad vs brief | 25 | 14,25 | 15,75 |
| 2 | Seguridad | 15 | 8,10 | 12,90 |
| 3 | PWA | 10 | 9,40 | 10,00 |
| 4 | Rendimiento (Lighthouse móvil 91 / 80 / 91 / 93) | 10 | 8,45 | 8,88 |
| 5 | Accesibilidad (Lighthouse 100 ×4) | 10 | 9,45 | 9,90 |
| 6 | SEO (Lighthouse 100 / 100 / 100 / 92) | 5 | 4,45 | 4,65 |
| 7 | UX/UI e i18n | 10 | 8,80 | 9,40 |
| 8 | Calidad de código y pruebas | 10 | 9,20 | 9,60 |
| 9 | Preparación para producción | 5 | 3,65 | 4,75 |
| | **Total** | **100** | **75,75** | **85,83** |

Defectos que quedaban en esta evaluación: 1 alto (media de la ficha simulada: vídeo, tour 360°, Street View), 6 medios y ~35 bajos. Todos se enviaron a corrección directa (ver commits posteriores y la sección siguiente).

## Nota definitiva — 27 sept. 2026 (mismo juez, misma rúbrica, tras corregir sus hallazgos)

| # | Área | Máx | Inicial | Ronda 1 | **Definitiva** |
|---|---|---|---|---|---|
| 1 | Funcionalidad vs brief | 25 | 14,25 | 15,75 | **18,25** |
| 2 | Seguridad | 15 | 8,10 | 12,90 | **13,35** |
| 3 | PWA | 10 | 9,40 | 10,00 | **9,80** |
| 4 | Rendimiento (Lighthouse móvil 94 / 75 / 92 / 95) | 10 | 8,45 | 8,88 | **8,90** |
| 5 | Accesibilidad (Lighthouse 100 ×4) | 10 | 9,45 | 9,90 | **9,90** |
| 6 | SEO (Lighthouse 100 ×4) | 5 | 4,45 | 4,65 | **4,90** |
| 7 | UX/UI e i18n | 10 | 8,80 | 9,40 | **9,40** |
| 8 | Calidad de código y pruebas | 10 | 9,20 | 9,60 | **9,80** |
| 9 | Preparación para producción | 5 | 3,65 | 4,75 | **4,85** |
| | **Total** | **100** | **75,75** | **85,83** | **89,15** |

Hallazgos de esta evaluación (1 alto, 6 medios, 17 bajos) corregidos después en el commit «Fix the definitive judge's findings», salvo:
- Límites por IP fuera de Vercel sin `TRUSTED_IP_HEADER`/`TRUSTED_PROXY_HOPS`: se usa un cubo compartido a propósito (confiar en `X-Forwarded-For` permitiría esquivarlos). En Vercel no aplica; en otro hosting hay que definir una de esas variables (DEPLOY.md).
- Chips de tipo en /search a 390 px: medidos en 44 px (falso positivo).
- 4 vulnerabilidades altas solo en devDependencies (lighthouse → puppeteer); producción 0.
- Calendario de disponibilidad de alquiler vacacional: requiere modelo de datos nuevo (siguiente fase).
