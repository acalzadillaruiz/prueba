# Plan: nota imparcial → corregir todo → optimizar → nota final

- [x] 1. Nota inicial (75,75/100) del juez imparcial (rúbrica fija en docs/SCORE_RUBRIC.md), sobre la build de producción actual.
- [x] 2. Implementar pendientes de docs/REVIEW.md (captación→inmueble, sesiones de fotos, reasignar lead, proponer visita siempre, buscador en bandeja, rol de usuarios, página de auditoría, filtros baños/m²/precio mínimo, orden y zona en URL, Hub: responder mensajes, ofertas, precalificación guardada).
- [x] 3. Optimizaciones: DTO ligero en home/búsqueda, páginas públicas estáticas/ISR (sesión en cliente), next/image, Prisma migrate, dependencias actualizadas, observabilidad (Sentry opcional), emails reales (Resend opcional), rate limit/caché con Redis opcional (Upstash), Lighthouse CI.
- [x] 4. Ronda de revisores que corrigen lo que encuentran (PWA/rendimiento, cliente, admin, seguridad).
- [x] 5. Nota final del mismo juez con la misma rúbrica; publicar comparación.
