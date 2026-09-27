# Publicar New Place en internet (Vercel + Neon + Vercel Blob)

Todo es gratis en los planes básicos. Tiempo: unos 10 minutos. No hace falta instalar nada.

## 1. Crear el proyecto en Vercel
1. Entra en https://vercel.com con tu cuenta de GitHub.
2. **Add New… → Project** → importa el repositorio `acalzadillaruiz/prueba`.
3. En **Root Directory** elige `apps/web`. Framework: Next.js (se detecta solo).
4. En **Environment Variables** añade:

| Variable | Valor |
|---|---|
| `AUTH_SECRET` | una cadena aleatoria larga (puedes generarla en https://generate-secret.vercel.app/32) |
| `AUTH_TRUST_HOST` | `true` |
| `DEMO_AUTH` | `true` (muestra «Entrar como…»; quítalo cuando vaya a clientes reales) |
| `NEXT_PUBLIC_DEMO_AUTH` | `true` |

5. Pulsa **Deploy**. El primer intento fallará porque aún no hay base de datos: es normal.

## 2. Base de datos (Neon) y fotos (Blob)
1. En el proyecto de Vercel → pestaña **Storage** → **Create Database** → **Neon (Postgres)** → conéctala al proyecto. Esto crea `DATABASE_URL` automáticamente.
2. En la misma pestaña **Storage** → **Create** → **Blob** → conéctalo al proyecto. Esto crea `BLOB_READ_WRITE_TOKEN` (las fotos subidas se guardarán ahí).

## 3. Rama de producción
**Settings → Git → Production Branch** → escribe `claude/new-place-pwa-estimate-knqqgn` y guarda.

## 4. Desplegar
**Deployments → … → Redeploy**. En el build se crean las tablas y, si la base está vacía, se cargan los datos de ejemplo de Venezuela (48 inmuebles, 3 agencias, 16 usuarios). Los despliegues siguientes **no** borran nada.

## Enlaces (sustituye `TU-APP` por el dominio que te da Vercel)
Contraseña de todos los usuarios de ejemplo: `NewPlace!2026`.

**Cliente**
- Inicio: `https://TU-APP.vercel.app/es`
- Entrar: `https://TU-APP.vercel.app/es/login` → «Entrar como… Buscador» (o regístrate con tu email)
- Buscar: `/es/search?type=SALE` · Lujo: `/es/luxury` · Guardados: `/es/saved` · Mi Hub: `/es/app`
- Publicar como propietario: `/es/owner/new` (entra como «Propietario particular»)

**Admin**
- Login: `/es/login` → «Entrar como… Dueño de agencia» (`owner@andesprime.ve`)
- Cargar un inmueble: `/es/agency/listings/new`
- Inmuebles, aprobar y editar fotos: `/es/agency/listings`
- Leads: `/es/agency/leads` · Calendario: `/es/agency/calendar` · Panel: `/es/agency`
- Superadmin (`superadmin@newplace.app`): `/es/platform`

## Opcional
- Google Maps: `NEXT_PUBLIC_GOOGLE_MAPS_KEY` (+ `NEXT_PUBLIC_GOOGLE_MAP_ID`).
- Login con Google: `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `NEXT_PUBLIC_GOOGLE_AUTH=true`.
- IA externa: `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL`.
- Tras cambiar variables `NEXT_PUBLIC_*`, haz **Redeploy**.
- Volver a los datos de ejemplo: en tu ordenador, `DATABASE_URL=<la de Neon> npm run db:seed` (borra todo y recarga).
