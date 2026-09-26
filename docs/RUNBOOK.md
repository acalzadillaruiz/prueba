# Runbook

```bash
node -v   # 20+ (probado con 22)
npm install
npm run dev                    # http://localhost:3000/es
```
- Cambiar de rol: botón **Demo** abajo a la izquierda, o `/es/login` → «Entrar como…».
- Reiniciar estado demo: borrar `localStorage["np-demo-v1"]`.
- Build de producción: `npm run build && npm start`.
- Tests del dominio IA: `npm test`.
- Regenerar capturas/vídeos: arrancar producción en 3001 (`NEXT_DIST=.next-prod npx next build && NEXT_DIST=.next-prod npx next start -p 3001` dentro de `apps/web`) y ejecutar `node scripts/capture.mjs` / `node scripts/video.mjs cliente`.
