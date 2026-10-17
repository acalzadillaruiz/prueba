# New Place — guía para agentes

- **DESIGN.md es la fuente de verdad visual; léelo antes de tocar UI.** La paleta Brisa (048, aprobada por Adolfo el 17/10) y la pareja Jost + Inter son las vigentes: no se cambian sin su OK.
- Skills del repo (en `.agents/skills`, enlazadas desde `.claude/skills`): `design-taste-frontend` (lint + inspect), `web-design-guidelines` (revisión Vercel), `playwright-cli` (capturas y comprobaciones en navegador real).
- Antes de entregar UI: `npm run audit:taste -w apps/web` (0 FAIL) y `npm run audit:ui -w apps/web` con el servidor arrancado (390 y 1440 px).
